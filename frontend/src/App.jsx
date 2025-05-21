import React, {useState} from 'react';
import Login from './Login.jsx'
import MainApp from './MainApp.jsx';

function App(){
  const [isLoggedin, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  
  return(
    <>
    {!isLoggedin ? (<Login 
    setIsLoggedIn={setIsLoggedIn} setUsername={setUsername}></Login>
     ) : ( //if the user is logged in, load the MainApp component
      <MainApp username={username}></MainApp>
    )}
    </>
  
  );

}

export default App