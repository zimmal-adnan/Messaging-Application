import React, { useState, useEffect } from "react";

function FriendRequest({ username, ws, setTargetUser, targetUser, }) {
    const [friends, setFriends] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [requestInput, setRequestInput] = useState("");
    const [isHovering, setIsHovering] = useState(null);
    const [confirmRemove, setConfirmRemove] = useState(null);
    

    useEffect(() => {
        if (!ws) return;

        const handleMessage = (e) => {
            const data = JSON.parse(e.data);
            console.log("FriendRequest received:", data);
            
            if (data.type === "pending_requests") {
                setPendingRequests(data.requests);
            }
            else if (data.type === "friends_list") {
                setFriends(data.friends);
            }
            else if (data.type === "friend_request_received") {
                setPendingRequests(f => [...f, data.from]);
            }
        

            else if (data.type === "friend_response") {
                if (data.response === "accept") {
                    setFriends(f => [...f, data.from]);
                }
                setPendingRequests(f => f.filter(u => u !== data.from));
            }
            else if (data.type === "friend_removed") {
                setFriends(f => f.filter(u => u !== data.removed_user));
            }

        };

        ws.addEventListener("message", handleMessage);

        // Request initial data
        ws.send(JSON.stringify({ type: "get_friends" }));
        ws.send(JSON.stringify({ type: "get_pending_requests" }));
        
        return () => {
            ws.removeEventListener('message', handleMessage);
        };
    }, [ws]);



    function removeFriend(targetUser){
        if (!targetUser || !ws) return;

        setFriends(prev => prev.filter(u => u !== targetUser));

        ws.send(JSON.stringify({
            type: "remove_friend",
            target: targetUser
        }));

    }

    function confirmRemoveFriend(user) {
    setConfirmRemove(user); 
    }

    function SendRequest() {
        if (!requestInput.trim()) return;

        ws.send(JSON.stringify({
            type: "friend_request",
            recipient: requestInput
        }));
        setRequestInput("");
    }

    function AcceptFriend(user) {
        if (!user || !ws) return;

        ws.send(JSON.stringify({
            type: "friend_response",
            requester: user,
            response: 'accept'
        }));

        // Optimistic update
        setPendingRequests(pendingRequests.filter(u => u !== user));
        setFriends([...friends, user]);
    }

    function DeclineFriend(user) {
        if (!user || !ws) return;

        ws.send(JSON.stringify({
            type: "friend_response",
            requester: user,
            response: 'declined'
        }));

        setPendingRequests(pendingRequests.filter(u => u !== user));
    }

    function handleFriendClick(user) {
        if (friends.includes(user)) {
            setTargetUser(user);
        }
    }

    return (
        <div className="friends-div">
            <div className="request-container">
                <input
                    className="input-username"
                    value={requestInput}
                    type="text"
                    onChange={(e) => setRequestInput(e.target.value)}
                    placeholder="Enter username..."
                />
                <button className="request-button" onClick={SendRequest}>►</button>
            </div>

            <div>
                <h2>Pending Friend Requests: </h2>
                {pendingRequests.length === 0 ? (
                    <p>No pending requests</p>
                ) : (
                    <ol>
                        {pendingRequests.map(user => (
                            <li className = "friend-names" key={user}>
                                {user}
                                <button className="friend-response" onClick={() => AcceptFriend(user)}><img src="/tick.jpg" className="img-response" alt="Accept"/></button>
                                <button className="friend-response" onClick={() => DeclineFriend(user)}><img src="x.jpg" className="img-response" alt="Accept"/></button>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
            
            <div>
                <h2>Your Friends: </h2>
                {friends.length === 0 ? (
                    <p>No friends yet</p>
                ) : (
                    <ol>
                        {friends.map(user => (
                            <li className="friend-names"
                                key={user} 
                                onClick={() => handleFriendClick(user)}
                                onMouseEnter={() => setIsHovering(user)} 
                                onMouseLeave={() => setIsHovering(null)}
                                style={{ 
                                    cursor: "pointer", 
                                    fontWeight: targetUser === user ? "bold" : "normal",
                                    color: targetUser === user ? "grey" : "black",
                                }}><span>{user}</span>
                                {isHovering === user && (
                                    <button className="remove-button" style={{ marginLeft: "10px" }} onClick={() => confirmRemoveFriend(user)}>REMOVE FRIEND</button>
                                )}
                            </li>
                        ))}
                    </ol>
                )}
            </div>

            {confirmRemove && (
                <div className="confirmation-box">
                    <div className="white-box">
                        <p>Are you sure you want to remove <strong>{confirmRemove}</strong> as a friend?</p>
                        <button className = "confirmation-button"  id = "yes-button" onClick={() => { removeFriend(confirmRemove); setConfirmRemove(null); }}>YES</button>
                        <button className = "confirmation-button"  id = "cancel-button" onClick={() => setConfirmRemove(null)}>CANCEL</button>
                    </div>
                </div>
            )}

        </div>
    );

}

export default FriendRequest