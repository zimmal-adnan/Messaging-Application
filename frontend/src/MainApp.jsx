import React, { useState, useEffect, useRef } from 'react';
import FriendRequest from './FriendRequest';

function MainApp({username}){
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [targetUser, setTargetUser] = useState("");
    const [showFriendsPanel, setShowFriendsPanel] = useState(false);
    const socketRef = useRef(null);

    function sendMessage(){
        if(socketRef.current && targetUser && newMessage.trim()){
            socketRef.current.send(JSON.stringify({
                type: "message",
                recipient: targetUser,
                message: newMessage
            }));
            setMessages(m => [...m, {
                sender: username,
                content: newMessage,
                timestamp: new Date().toLocaleString(),
                recipient: targetUser
            }])
            setNewMessage("");
        }
    }

    useEffect(() => {
        const ws = new WebSocket(`ws://localhost:8000/ws/${username}`);
    
        ws.onopen = () => {
          console.log("WebSocket connected"); 
        };
      
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("Parsed data:", data);
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
      
        socketRef.current = ws;
      
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
      }, [username]);

      useEffect(() => {
        const loadConversation = async () => {
            if (!targetUser) return;
            
            try {
                const response = await fetch(`http://localhost:8000/get_messages?user1=${username}&user2=${targetUser}`);
                if (response.ok) {
                    const data = await response.json();
                    setMessages(data);
                }
            } catch (error) {
                console.error("Error loading messages:", error);
            }
        };
        
        loadConversation();
    }, [targetUser, username]);

    const conversationMessages = messages.filter(msg => 
    (msg.sender === targetUser && msg.recipient === username) ||
    (msg.sender === username && msg.recipient === targetUser)
    );

    return(
        <div className='chat-body'>
            <h1 className='introduction'>WELCOME  {username}!</h1>
            <button className = "showFriendsBtn" onClick={() => setShowFriendsPanel(!showFriendsPanel)}>{showFriendsPanel ? "HIDE FRIENDS" : "SHOW FRIENDS"}</button>
            <div style={{ display: "flex" }}>
                {/* Friends Section */}
                <div className = {`friends-panel ${showFriendsPanel ? 'visible' : ''}`} style={{ padding: "10px" }}>
                    <FriendRequest username={username} ws={socketRef.current} setTargetUser={setTargetUser} targetUser={targetUser}/>             
                </div>
                
                {/* Chat Section */}
                <div style={{ width: showFriendsPanel ? "70%" : "100%", padding: "10px", transition: "width 0.3s ease-out" }}>
                    <h2 className='chat-with'>CHAT WITH {targetUser || "..."}</h2>
                    <div className="chat-box">
                        {conversationMessages.map((msg, index) => (
                            <div className="message-content" key={index}>
                                <div className="message-chat">
                                    <strong>{msg.sender}: </strong> {msg.content}
                                </div>
                                <small className="message-time">({new Date(msg.timestamp).toLocaleTimeString()})</small>
                            
                            </div>
                        ))}
                    </div>
                    <div className='message-container'>
                    <input
                        className="message-input"
                        type="text"
                        value={newMessage}
                        placeholder="Type a message..."
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    />
                    <button className = "sendBtn" onClick={sendMessage} disabled={!targetUser}>SEND</button>
                    </div>
                </div>
            </div>
        </div>
    );
   
}
export default MainApp