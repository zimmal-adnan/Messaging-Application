import React, {useState} from 'react';

function Login(props){
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);



  async function handleSubmit(){
    try{
        const endpoint = isSignUp ? 'signup' : 'login';
        const response = await fetch(`https://your-backend.onrender.com/${endpoint}`, {
        method: 'POST', 
        headers: {'Content-Type': 'application/json',},
        body: JSON.stringify({username: username, password: password}),
    });

   


    if(!response.ok){
      throw Error(await response.text());
    }
    
    const data = await response.json();
    alert(`Welcome, ${data.username}!`);
    props.setUsername(username);
    props.setIsLoggedIn(true);
    
  } 
    catch (error) {
      console.error("Error:", error.message);
      alert(error.message);
  }
}

  return(
    <div className = "login">
        <h2 style ={{ fontSize: "30px"}}>B R E E Z E</h2>
        <div className="input-container">
          <input 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            placeholder=' ' 
            required
          />
          <label>ENTER USERNAME</label>
        </div>

        <div className="input-container" style={{marginTop: '20px'}}>
          <input 
            type = "text"
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder=' ' 
            required
          />
          <label>ENTER PASSWORD</label>
        </div>

        <button className="username-button" onClick={handleSubmit}>{isSignUp ? "SIGN UP" : "LOGIN"}</button>

        <p className='login-p' onClick={() => setIsSignUp(!isSignUp)} >
          {isSignUp ? "Already have an account? Login" : "Need an account? Sign up"}
        </p>
    </div>
  );
}
export default Login