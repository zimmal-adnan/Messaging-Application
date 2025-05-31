import React, { useState, useEffect, useRef } from 'react';
import FriendRequest from './FriendRequest';

function MainApp({username}){
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [targetUser, setTargetUser] = useState("");
    const [showFriendsPanel, setShowFriendsPanel] = useState(false);

    //keeps the WebSocket alive without re-creating it on every render
    const socketRef = useRef(null); 

    //runs when the user wants to send a message
    function sendMessage(){

        //.current is where the actual value is stored
        if(socketRef.current && targetUser && newMessage.trim()){
            socketRef.current.send(JSON.stringify({
                type: "message",
                recipient: targetUser,
                message: newMessage
            }));

            //updates the UI immediately with the new message
            setMessages(m => [...m, { 
                sender: username,
                content: newMessage,
                timestamp: new Date().toLocaleString(),
                recipient: targetUser
            }])

            //clears the input
            setNewMessage("");
        }
    }

    //opens a WebSocket connection when the component is first loaded or when the username changes
    useEffect(() => {
        const ws = new WebSocket(`wss://messaging-application-c9s5.onrender.com/ws/${username}`);
    
        ws.onopen = () => {
          console.log("WebSocket connected"); 
        };
        
        //this sets up what to do when the WebSocket receives a message from the server
        //runs every time the server sends data to this client
        ws.onmessage = (event) => {
          try {
            //the event object contains data sent by the server
            const data = JSON.parse(event.data);
            console.log("Parsed data:", data);
            
            //show the list of online users
            if (data.type === "user_list") {
              setOnlineUsers(data.users);
            }

            else if(data.type === "message"){
                setMessages(m => [...m, {
                    sender: data.sender,
                    content: data.message,
                    timestamp: new Date().toISOString(),
                    recipient: username
                }]);
            }
          } catch (e) {
            console.error("Error parsing WebSocket message:", e);
          }
        };
      
        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
        };

        ws.onclose = () => {
            console.log("WebSocket disconnected");
        };
        
        //saves the socket in 'socketRef'
        socketRef.current = ws;
        
        //clean up when the component unmounts
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
      }, [username]);

        //keeps only messages that match a certain condition
        const conversationMessages = messages.filter(msg => //msg is each message object
        //message sent by friend to the user
        (msg.sender === targetUser && msg.recipient === username) ||
        //message sent by user to friend
        (msg.sender === username && msg.recipient === targetUser)
        );

      //load chat history
      useEffect(() => {
        const loadConversation = async () => {
            if (!targetUser) return;
            
            try {
                //asks the backend to get all messages between two users
                const response = await fetch(`https://messaging-application-c9s5.onrender.com/get_messages?user1=${username}&user2=${targetUser}`);
                
                if (response.ok) {
                    const data = await response.json();
                    setMessages(data);
                }
            } catch (error) {
                console.error("Error loading messages:", error);
            }
        };
        
        loadConversation();
    }, [targetUser, username, conversationMessages]);

    

    return(
        <div className='chat-body'>
            
            {/*Title*/}
            <h1 className='introduction'>WELCOME  {username}!</h1>

            {/*Toggle Button*/}                      
            <button className = "showFriendsBtn" onClick={() => setShowFriendsPanel(!showFriendsPanel)}>{showFriendsPanel ? "HIDE FRIENDS" : "SHOW FRIENDS"}</button>
            
            <div style={{ display: "flex" }}>

                {/*Friends Section*/}
                <div className = {`friends-panel ${showFriendsPanel ? 'visible' : ''}`} style={{ padding: "10px" }}>
                    <FriendRequest username={username} ws={socketRef.current} setTargetUser={setTargetUser} targetUser={targetUser}/>             
                </div>
                
                {/*Chat Section*/}
                <div className = "main-chat">
                    <h2 className='chat-with'>CHAT WITH {targetUser || "..."}</h2>

                    {/*Chat Box*/}
                    <div className="chat-box">
                        
                        {conversationMessages.map((msg, index) => ( //loops through every message, and creates a JSX block to display for each message
                            <div className="message-content" key={index}>
                                <div className="message-chat">
                                    <strong>{msg.sender}: </strong> {msg.content}
                                </div>
                                <small className="message-time">({new Date(msg.timestamp).toLocaleTimeString()})</small>
                            
                            </div>
                        ))}
                    </div>

                    {/*Message Input Field*/}
                    <div className='message-container'>
                    <input
                        className="message-input"
                        type="text"
                        value={newMessage}
                        placeholder="Type a message..."
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    />

                    {/*Send Button*/}          
                    <button className = "sendBtn" onClick={sendMessage} disabled={!targetUser}>►</button>
                    </div>
                </div>
            </div>
        </div>
    );
   
}
export default MainApp