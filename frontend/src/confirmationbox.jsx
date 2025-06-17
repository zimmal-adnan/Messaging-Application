import React from "react";
import "./PopUps.css";
import ReactDOM from 'react-dom';

function ConfirmationBox({confirmRemove, setConfirmRemove, setFriends, ws}){
    //remove a friend from the list
    function removeFriend(targetUser){
        if (!targetUser || !ws) return;
        
        //only keep users which don't match the target user
        setFriends(prev => prev.filter(u => u !== targetUser));

        ws.send(JSON.stringify({
            type: "remove_friend",
            target: targetUser
        }));
    }

    if (!confirmRemove){
        return null
    };

    return ReactDOM.createPortal(
        <div className="confirmation-box">
            <div className="white-box">
                <p>Are you sure you want to remove <strong>{confirmRemove}</strong> as a friend?</p>
                <button className = "confirmation-button"  id = "yes-button" onClick={() => { removeFriend(confirmRemove); setConfirmRemove(null); }}>YES</button>
                <button className = "confirmation-button"  id = "cancel-button" onClick={() => setConfirmRemove(null)}>CANCEL</button>
            </div>
        </div>,
        document.body
    );
}


export default ConfirmationBox;