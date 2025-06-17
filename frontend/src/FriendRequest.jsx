import React, { useState, useEffect } from "react";
import ConfirmationBox from "./confirmationbox";

function FriendRequest({ ws, setTargetUser, targetUser, }) {
    const [friends, setFriends] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [requestInput, setRequestInput] = useState("");
    const [isHovering, setIsHovering] = useState(null);
    const [confirmRemove, setConfirmRemove] = useState(null);
    const [remove, setRemove] = useState(true);
    const [touchTimer, setTouchTimer] = useState(null);
    
    //runs when the WebSocket becomes available
    useEffect(() => {
        if (!ws) return;

        //handles every incoming message from the server
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
        
        //sends messages to the server
        //everytime a message is received, run handleMessage
        ws.addEventListener("message", handleMessage);

        //sends requests to the backend
        ws.send(JSON.stringify({ type: "get_friends" }));
        ws.send(JSON.stringify({ type: "get_pending_requests" }));
        
        //removes the listener when the component unmounts
        return () => {
            ws.removeEventListener('message', handleMessage);
        };
    }, [ws]);

    //sets the name of the friend to remove
    function confirmRemoveFriend(user) {
        setConfirmRemove(user); 
        setRemove(true);
    }

    //send a friend request to the user
    function SendRequest() {
        //if request field empty
        if (!requestInput.trim()) return;

        ws.send(JSON.stringify({
            type: "friend_request",
            recipient: requestInput
        }));
        //clear the input field after sending
        setRequestInput("");
    }

    //function to accept a friend request
    function AcceptFriend(user) {
        if (!user || !ws) return;

        ws.send(JSON.stringify({
            type: "friend_response",
            requester: user,
            response: 'accept'
        }));

        //optimistic update
        setPendingRequests(pendingRequests.filter(u => u !== user));
        setFriends([...friends, user]);
    }

    //to decline a friend request
    function DeclineFriend(user) {
        if (!user || !ws) return;

        ws.send(JSON.stringify({
            type: "friend_response",
            requester: user,
            response: 'declined'
        }));

        //remove the user from the pending list
        setPendingRequests(pendingRequests.filter(u => u !== user));
    }

    //runs when the friend's name is clicked in the UI
    function handleFriendClick(user) {
        //checks if the user is in the current friend list
        if (friends.includes(user)) {
            setTargetUser(user);
        }
    }

    const handleTouchStart = (user) => {
        const timer = setTimeout(() => {
            setIsHovering(user);
        }, 500); 
        setTouchTimer(timer);
    };

    const handleTouchEnd = () => {
        clearTimeout(touchTimer);
    };

    return (
        <div className="friends-div">

            {/*Friend Request Input*/}
            <div className="request-container">
                <input
                    className="input-username"
                    value={requestInput}
                    type="text"
                    onChange={(e) => setRequestInput(e.target.value)}
                    placeholder="Enter username..."
                    onKeyDown={(e) => e.key === "Enter" && SendRequest()}
                />
                <button className="request-button" onClick={SendRequest}>►</button>
            </div>

            {/*Pending Requests List*/}
            <div>
                <h2>Pending Friend Requests: </h2>
                {pendingRequests.length === 0 ? (
                    <p>No pending requests</p>
                ) : (
                    <ol>
                        {/*JSX for each pending user*/}
                        {pendingRequests.map(user => (
                            <li className = "friend-names" key={user}>
                                {user}
                                <button className="friend-response" onClick={() => AcceptFriend(user)}><img src="/tick.jpg" id="accept-button" className="img-response" alt="Accept"/></button>
                                <button className="friend-response" onClick={() => DeclineFriend(user)}><img src="x.jpg" id="decline-button" className="img-response" alt="Decline"/></button>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
            
            {/*Friend List*/}
            <div>
                <h2>Your Friends: </h2>
                {friends.length === 0 ? (
                    <p>No friends yet</p>
                ) : (
                    <ol>
                        {/*JSX for each friend*/}
                        {friends.map(user => (
                            <li className="friend-names"
                                key={user} //to identify each element in a list to track changes and re-render only the elements that changed
                                onClick={() => handleFriendClick(user)}
                                onMouseEnter={() => setIsHovering(user)} //if the mouse is hovered over a friend's name, it stores the username of the currently hovered friend
                                onMouseLeave={() => setIsHovering(null)} //clears the hovered state
                                onTouchStart={() => handleTouchStart(user)}
                                onTouchEnd={handleTouchEnd}
                                style={{ 
                                    cursor: "pointer", 
                                    fontWeight: targetUser === user ? "bold" : "normal",
                                    color: targetUser === user ? "grey" : "black",
                                }}><span>{user}</span>

                                {/*if the list item is the one being hovered, show the button*/}
                                {isHovering === user && (
                                    <button className="remove-button" style={{ marginLeft: "10px" }} onClick={() => confirmRemoveFriend(user)}>REMOVE FRIEND</button>
                                )}
                            </li>
                        ))}
                    </ol>
                )}
            </div>
            
            {confirmRemove ? (
                <ConfirmationBox confirmRemove ={confirmRemove} setConfirmRemove={setConfirmRemove} setFriends={setFriends} ws={ws}></ConfirmationBox>
            ):("")}

        </div>
    );

}

export default FriendRequest