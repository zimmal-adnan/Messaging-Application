import React, {useState, useEffect} from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login.jsx'
import MainApp from './MainApp.jsx';
import NotFound from './NotFound.jsx';

function App(){
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  
  useEffect(() => {
    const storedLogin = window.localStorage.getItem('isLoggedIn');
    const storedUsername = window.localStorage.getItem('username');

    if (storedLogin === "true" && storedUsername) {
      setIsLoggedIn(true);
      setUsername(storedUsername);
    }

  }, [])

  return(
    <Router>
      <Routes> 
        <Route path="/" element={
          <Navigate to="/login" replace />
        } />
        <Route path = "/login" element = {
          isLoggedIn ? <Navigate to="/chat" replace /> : 
          <Login setIsLoggedIn={setIsLoggedIn} setUsername={setUsername}></Login>
        }/>
        <Route path = "/signup" element = {
          isLoggedIn ? <Navigate to="/chat" replace /> : 
          <Login setIsLoggedIn={setIsLoggedIn} setUsername={setUsername}></Login>
        }/>
        <Route 
          path="/chat" 
          element={isLoggedIn ? <MainApp username={username} setIsLoggedIn={setIsLoggedIn}></MainApp> : <Navigate to="/login"></Navigate>
        }/>
        <Route 
          path="*" 
          element={<NotFound></NotFound>
        }/>
      </Routes>
    </Router>
  
  );

}

export default App;