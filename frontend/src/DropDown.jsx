import React from "react";
import { VscGear } from "react-icons/vsc";
import {useNavigate} from 'react-router-dom';

function DropDownMenu({showProfile, setShowProfile, setUsername, setIsLoggedIn}){
    const navigate = useNavigate();

    function LogOut(){
        setIsLoggedIn(false);
        navigate("/login", {replace: true});
        setUsername("");
    }

    return (
        <div className="menu">
        <button className="settings" onClick = {() => setShowProfile(!showProfile)}><VscGear /></button>
        
        {showProfile && (<div className="drop-down">
            <ul className="drop-down-content" style={{listStyleType: "none"}}>
                <li>Profile</li>
                <li>Settings</li>
                <hr style = {{ width: "5rem", position: "relative", left: "-23px", marginTop: "10px"}}></hr>
                <li onClick={LogOut}>Logout</li>
            </ul>
        </div>)}
        </div>
    );
}

export default DropDownMenu;