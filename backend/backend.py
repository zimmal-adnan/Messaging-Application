from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import uuid
from typing import Dict, List
from datetime import datetime
from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str

class SignupRequest(BaseModel):
    username: str
    password: str

class FriendResponse(BaseModel):
    requester_username: str
    response: str  

class Message(BaseModel):
    recipient: str
    content: str


#---FastAPI setup---
app = FastAPI()
#app holds the entire server (endpoints, websockets, middlewares)
#any request that is made goes through this app


#removes any restrictions so that the front-end can talk to the back-end without the browser blocking it
app.add_middleware(
    CORSMiddleware, #enables CORS policy on the server
    allow_origins=["*"], #allow all websites (frontend) to connect to ours 
    allow_credentials=True, #allow sending cookies or credentials if needed
    allow_methods=["*"], #allow any HTTP method (GET,POST, PUT, DELETE)
    allow_headers=["*"], #allow any headers the client sends
)

#---Database---
#handles database actions for users and friendships
class Database:
    #called when you make a new Database() object
    def __init__(self):
        #"check_same_thread" is needed because FastAPI is async and may run on different threads, it turns sqlite3's security off
        #sqlite3 will raise an error if different threads try to use the same database connection
        self.connection = sqlite3.connect("user.db", check_same_thread=False)
        self.create_tables()
    
    #create the users and friends tables if they don't already exist
    def create_tables(self):
        cursor = self.connection.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                online BOOLEAN DEFAULT FALSE
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS friends (
                relationship_id INTEGER PRIMARY KEY, --unique number created for each friend request/relationship
                user_id INTEGER NOT NULL, --user who initiated the friendship
                friend_id INTEGER NOT NULL, --target friend
                status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'declined')),
                action_user_id INTEGER NOT NULL, --id of the user who took the last action
                FOREIGN KEY(user_id) REFERENCES users(user_id),
                FOREIGN KEY(friend_id) REFERENCES users(user_id),
                UNIQUE(user_id, friend_id) --no duplicate friendships (multiple requests cannot be sent, so it is a must for this combination to be unique.
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                message_id INTEGER PRIMARY KEY,
                sender_id INTEGER NOT NULL,
                recipient_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(sender_id) REFERENCES users(user_id),
                FOREIGN KEY(recipient_id) REFERENCES users(user_id)                  
            )
        """)
        self.connection.commit()

    #stores messages into the database
    def save_message(self, sender: str, recipient: str, content: str):
        cursor = self.connection.cursor()
        
        #get user_id of both the sender and the recipient
        cursor.execute("SELECT user_id FROM users WHERE username=?", (sender,))
        sender_id = cursor.fetchone()[0]
        cursor.execute("SELECT user_id FROM users WHERE username=?", (recipient,))
        recipient_id = cursor.fetchone()[0]
        
        cursor.execute("""
            INSERT INTO messages (sender_id, recipient_id, content)
            VALUES (?, ?, ?)
        """, (sender_id, recipient_id, content))
        self.connection.commit()
    


    #retrieves conversation history between two users
    def get_conversation(self, user1: str, user2: str):
        cursor = self.connection.cursor()
        
        cursor.execute("SELECT user_id FROM users WHERE username=?", (user1,))
        user1_id = cursor.fetchone()[0]
        cursor.execute("SELECT user_id FROM users WHERE username=?", (user2,))
        user2_id = cursor.fetchone()[0]
        
        #looks for all chat messages between two users and returns them
        cursor.execute("""
            SELECT u1.username as sender, u2.username as recipient, m.content, m.timestamp
            FROM messages m
            JOIN users u1 ON m.sender_id = u1.user_id
            JOIN users u2 ON m.recipient_id = u2.user_id
            WHERE (m.sender_id = ? AND m.recipient_id = ?)
            OR (m.sender_id = ? AND m.recipient_id = ?)
            ORDER BY m.timestamp
        """, (user1_id, user2_id, user2_id, user1_id))
        
        return [{
            'sender': row[0],
            'recipient': row[1],
            'content': row[2],
            'timestamp': row[3]
        } for row in cursor.fetchall()]
    
    #add a user if they are new, or update their online status if they already exist
    def add_or_update_user(self, username: str, password: str, online: bool = True):
        cursor = self.connection.cursor()
        cursor.execute("INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)", (username, password))
        cursor.execute("UPDATE users SET online = ?, password = ? WHERE username = ?", (online, password, username))
        self.connection.commit()

    #mark the user offline
    def set_user_offline(self, username: str, password: str):
        self.add_or_update_user(username, password, online=False)

    #remove a friend from the user's friend list
    def remove_friend(self, current_user: str, target_user: str) -> bool:
        cursor = self.connection.cursor()

        #get the user_id of the user removed
        cursor.execute("SELECT user_id FROM users WHERE username=?", (target_user,))
        result = cursor.fetchone()
        if not result:
            return False
        target_id = result[0]

        #get the user_id of the user removing
        cursor.execute("SELECT user_id FROM users WHERE username=?", (current_user,))
        result = cursor.fetchone()
        if not result:
            return False
        current_id = result[0]
        
        #delete the friend relationship
        cursor.execute("DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)", (current_id, target_id, target_id, current_id ))

        self.connection.commit()
        return True

    #sends a friend request from one user to another
    def send_friend_request(self, sender_username: str, recipient_username: str):
        cursor = self.connection.cursor()

        #retrieve sender's user_id
        cursor.execute("SELECT user_id FROM users WHERE username=?", (sender_username,))
        sender = cursor.fetchone()
        if not sender:
            return False
        sender_id = sender[0]

        #retrieve recipient's user_i
        cursor.execute("SELECT user_id FROM users WHERE username=?", (recipient_username,))
        recipient = cursor.fetchone()
        if not recipient:
            return False
        recipient_id = recipient[0]

        #check if a friendship already exists
        cursor.execute("""SELECT 1 FROM friends --check if anything exists 
                          WHERE (user_id=? AND friend_id=?) --check if sender already sent to recipient
                             OR (user_id=? AND friend_id=?) --check if recipient already sent to sender""", 
                       (sender_id, recipient_id, recipient_id, sender_id))
        #if a row exists like that (connection already there), then don't send a new request
        if cursor.fetchone():
            return False  

        #if everything is clear, insert a new row into the friends table
        cursor.execute("""INSERT INTO friends 
                          (user_id, friend_id, status, action_user_id) 
                          VALUES (?,?,?,?)""",
                       (sender_id, recipient_id, 'pending', sender_id))
        self.connection.commit()
        return True 
    
    #returns all friend requests sent to a specific user
    def get_pending_requests(self, username: str):
        cursor = self.connection.cursor()
        cursor.execute("SELECT user_id FROM users WHERE username=?", (username,))
        user_id = cursor.fetchone()[0]
        
        #find all usernames who sent a request
        cursor.execute("""
            SELECT users.username 
            FROM friends
            JOIN users ON friends.user_id = users.user_id --find sender's username
            WHERE friends.friend_id = ? AND friends.status = 'pending' --where I am the target
        """, (user_id,))

        #return a list of all usernames from the database result
        return [row[0] for row in cursor.fetchall()]


    #returns all users who are friends
    def get_friends_list(self, username: str):
        cursor = self.connection.cursor()
        cursor.execute("SELECT user_id FROM users WHERE username=?", (username,))
        user_id = cursor.fetchone()[0]
        
        #find all usernames where friendship is accepted
        cursor.execute("""
            SELECT users.username 
            FROM friends
            JOIN users ON friends.friend_id = users.user_id 
            WHERE friends.user_id = ? AND friends.status = 'accepted'
        """, (user_id,))

        #return as a list of usernames
        return [row[0] for row in cursor.fetchall()]


    #accept or decline a friend request
    def respond_to_friend_request(self, responder_username, requester_username, response):
        cursor = self.connection.cursor()
        
        try:
            #get user_id's of both the responder and the requester
            cursor.execute("SELECT user_id FROM users WHERE username=?", (responder_username,))
            responder_id = cursor.fetchone()[0]
            cursor.execute("SELECT user_id FROM users WHERE username=?", (requester_username,))
            requester_id = cursor.fetchone()[0]

            #check if there is already a pending friend request
            cursor.execute("""
                SELECT relationship_id FROM friends 
                WHERE user_id=? AND friend_id=? AND status='pending'
            """, (requester_id, responder_id))
            
            if not cursor.fetchone():
                return False  
            
            #if accepted
            if response.lower() == 'accept':
                cursor.execute("""
                    UPDATE friends 
                    SET status='accepted', action_user_id=?
                    WHERE user_id=? AND friend_id=? AND status='pending'
                """, (responder_id, requester_id, responder_id))

                cursor.execute("""
                    INSERT OR IGNORE INTO friends
                    (user_id, friend_id, status, action_user_id)
                    VALUES (?, ?, 'accepted', ?)
                """, (responder_id, requester_id, responder_id))

            #if declined
            else:  
                cursor.execute("""
                    UPDATE friends 
                    SET status='declined', action_user_id=?
                    WHERE user_id=? AND friend_id=? AND status='pending'
                """, (responder_id, requester_id, responder_id))

                cursor.execute("""
                    INSERT OR IGNORE INTO friends
                    (user_id, friend_id, status, action_user_id)
                    VALUES (?, ?, 'declined', ?)
                """, (responder_id, requester_id, responder_id))

            self.connection.commit()
            return True

        except sqlite3.Error as e:
            print(f"Database error: {e}")
            #rollback() undoes all changes made in the database if something went wrong in the middle
            self.connection.rollback()
            return False
    
    #closes the database connection when the server is closed
    def close(self):
        self.connection.close()

db = Database()

#---WebSocket Manager---

#keeps track of online users and their WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {} #connection_id: WebSocket after two users connect
        self.user_connections: Dict[str, str] = {}  #username: connection_id

    #runs when a user connects
    async def connect(self, websocket: WebSocket, username: str):
        #accepts WebSocket handshake - the chat-pipe is open so real-time messages can be sent freely
        await websocket.accept()
        print(f"WebSocket connected for {username}")
        #create a random unique ID for this connection
        connection_id = str(uuid.uuid4())
        #link connection_id to WebSocket
        self.active_connections[connection_id] = websocket
        #link username to connection_id
        self.user_connections[username] = connection_id
        return connection_id


    #when a user disconnects (closes browser/tab)
    def disconnect(self, connection_id: str, username: str):
        #remove the WebSocket object 
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
        #remove their connection_id mapping
        #server now knows they are offline
        if username in self.user_connections:
            del self.user_connections[username]

    #show online user list
    async def broadcast_user_list(self):
        online_users = list(self.user_connections.keys())
        #for every online user, send them this json message
        for connection in self.active_connections.values():
            print(f"Broadcasting user list: {online_users}")
            await connection.send_json({
                "type": "user_list",
                "users": online_users
            })

manager = ConnectionManager()

#---API Endpoints---

#to process login
@app.post("/login")
async def login(data: LoginRequest):
    username = data.username
    password = data.password

    #if no username or password entered in the fields
    if not username.strip() or not password.strip():
        raise HTTPException(400, "Username and password required")
    
    cursor = db.connection.cursor()
    cursor.execute("SELECT password FROM users WHERE username=?", (username,))
    result = cursor.fetchone()
    if not result:
        raise HTTPException(400, "User does not exist")
    
    stored_password = result[0]
    if password != stored_password:
        raise HTTPException(400, "Incorrect password")
    
    #update the user's status to online
    db.add_or_update_user(username, password, online=True)

    #return a success response to the client - client can now open a WebSocket connection
    return {"status": "success", "username": username}

#loading messages
@app.get("/get_messages")
async def get_messages(user1: str, user2: str):
    messages = db.get_conversation(user1, user2)
    return messages

#to process signup of a new user
@app.post("/signup")
async def signup(data: SignupRequest):
    username = data.username
    password = data.password

    #if username or password field are left blank
    if not username.strip() or not password.strip():
        raise HTTPException(400, "Username and password required")
    
    #if username already exists
    cursor = db.connection.cursor()
    cursor.execute("SELECT 1 FROM users WHERE username=?", (username,))
    if cursor.fetchone():
        raise HTTPException(400, "Username already exists")
    
    if len(password) < 4: 
        raise HTTPException(400, "Password must be at least 4 characters")
    
    #add the new user in the database
    db.add_or_update_user(username, password, online=True)
    return {"status": "success", "username": username}

#create a WebSocket where clients can connect and talk in real-time
@app.websocket("/ws/{username}")
async def websocket_chat(websocket: WebSocket, username: str):
    #accepts connection and saves the user into the list of online users
    connection_id = await manager.connect(websocket, username)
    try:
        #sends a WebSocket message to every connected user, telling them about the updated list
        await manager.broadcast_user_list()
        
        while True:
            #listen for any incoming JSON messages from the client
            #the JSON string is automatically turned into a Python dictionary
            data = await websocket.receive_json()

            #reads the "type" field from the "data" dictionary 
            if data["type"] == "friend_request":
                #the recipient of the request
                recipient = data["recipient"]
                #create a pending friend request
                if db.send_friend_request(username, recipient):
                    #if the recipient is online
                    if recipient in manager.user_connections:
                        recipient_ws = manager.active_connections[manager.user_connections[recipient]]
                        #send the notification to the recipient
                        await recipient_ws.send_json({
                            "type": "friend_request_received",
                            "from": username
                        })

            #if the user wants to remove a friend
            elif data["type"] == "remove_friend":
                #retrieve the username of the user the client wants to remove
                target_user = data["target"]

    
                if db.remove_friend(username, target_user):
                    #tell the client the removal was successful
                    await websocket.send_json({
                        "type": "friend_removed",
                        "target": target_user
                    })

                    #if the unfriended user is online
                    if target_user in manager.user_connections:
                        #get WebSocket connection of that user
                        target_ws = manager.active_connections[manager.user_connections[target_user]]
                        #notify that friend that they have been removed
                        await target_ws.send_json({
                            "type": "friend_removed",
                            "removed_user": username
                        })

            #to display friend list
            elif data["type"] == "get_friends":
                friends = db.get_friends_list(username)
                #send the friend list
                await websocket.send_json({
                    "type": "friends_list",
                    "friends": friends
                })

            #display pending friend requests
            elif data["type"] == "get_pending_requests":
                pending = db.get_pending_requests(username)
                await websocket.send_json({
                    "type": "pending_requests",
                    "requests": pending
                }) 

            #responding to a friend request
            elif data["type"] == "friend_response":
                #who sent the original request
                requester = data["requester"]
                #the response (accept/declined)
                response = data["response"]  
                #update the database
                db.respond_to_friend_request(username, requester, response)
                #if the requester is online
                if requester in manager.user_connections:
                    requester_ws = manager.active_connections[manager.user_connections[requester]]
                    #send the notification to the requester
                    await requester_ws.send_json({
                        "type": "friend_response",
                        "from": username,
                        "response": response
                    })
            
            #handling normal messages
            elif data["type"] == "message":
                recipient = data["recipient"]
                message = data["message"]

                db.save_message(username, recipient, message)
                
                #if the recipient is online
                if recipient in manager.user_connections:
                    #find connection_id of the user, use that connection_id to find the WebSocket connection to get a live connection
                    recipient_ws = manager.active_connections[manager.user_connections[recipient]]
                    #send a message in real-time
                    await recipient_ws.send_json({
                        "type": "message",
                        "sender": username,
                        "message": message,
                        "timestamp": datetime.now().isoformat()
                    })
    
    #if the user closes the tab or loses internet
    except WebSocketDisconnect:
        #remove them from connection
        manager.disconnect(connection_id, username)
        
        cursor = db.connection.cursor()
        cursor.execute("SELECT password FROM users WHERE username=?", (username,))
        result = cursor.fetchone()
        password = result[0] if result else ""
        
        #set their online status to false
        db.set_user_offline(username, password)
        #update everyone's user list
        await manager.broadcast_user_list()

#---Run server---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)