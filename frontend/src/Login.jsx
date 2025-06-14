import React, {useState} from 'react';
import {useNavigate, useLocation, Link} from 'react-router-dom';

function Login(props){
    const navigate = useNavigate();
    const location = useLocation();
    const isSignUp = location.pathname === '/signup';
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [passwordAgain, setPasswordAgain] = useState("");
    
    
  //runs when the user clicks the Login/Singup button
  async function handleSubmit(){
    try{
        const endpoint = isSignUp ? 'signup' : 'login';
        const response = await fetch(`https://messaging-application-c9s5.onrender.com/${endpoint}`, {
        method: 'POST', 
        //labels on the package the client is sending to the server
        //this header is telling the server that the body of the request is in JSON format (not plain text or form data)
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username: username, password: password}),
    });

    if(isSignUp && passwordAgain !== password){
      throw Error("Passwords don't match");
    }

    //if there is an error, throw the error message
    if(!response.ok){
      throw Error(await response.text());
    }
    
    //if successful, alert the user
    const data = await response.json();
    alert(`Welcome, ${data.username}!`);
    
    window.localStorage.setItem("isLoggedIn", "true");       
    window.localStorage.setItem("username", username);

    props.setUsername(username); //store the logged-in username
    props.setIsLoggedIn(true); //if set to true, user is directed to the MainApp
    navigate("/chat", {replace: true});
  } 
    //shows an alert if anything goes wrong
    catch (error) {
      console.error("Error:", error.message);
      alert(error.message);
  }
}

  return(
    <div className="login" style={{ height: isSignUp ? "28rem" : "24rem" }}>
      {/*App Title*/}
        <h2 style ={{ fontSize: "30px"}}>B R E E Z E</h2>

        {/*Username Input*/}
        <div className="input-container">
          <input 
            value={username} //to be stored in the database in the server
            onChange={(e) => setUsername(e.target.value)} //updates username as it is typed
            placeholder=' ' 
            required
          />
          <label>ENTER USERNAME</label>
        </div>  

        {/*Password Input*/}
        <div className="input-container" style={{marginTop: '20px'}}>
          <input 
            type = "password"
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder=' ' 
            required
          />
          <label>ENTER PASSWORD</label>
        </div>

        {isSignUp && (
          <div className="input-container" style={{marginTop: '20px'}}>
          <input 
            type = "password"
            value={passwordAgain} 
            onChange={(e) => setPasswordAgain(e.target.value)} 
            placeholder=' ' 
            required
          />
          <label>ENTER PASSWORD (AGAIN)</label>
        </div>
        )}

        {/*Submit Button*/}
        <button className="username-button" onClick={handleSubmit}>{isSignUp ? "SIGN UP" : "LOGIN"}</button>
        
        {/*Switch between Login/Signup*/}
        <p className='login-p'>
          {isSignUp ? (
          <Link to="/login" style = {{color: "black"}}>Already have an account? Login</Link>
        ) : (
          <Link to="/signup" style = {{color: "black"}}>Need an account? Sign up</Link>
        )}
        </p>
    </div>
    
  );
}
export default Login;