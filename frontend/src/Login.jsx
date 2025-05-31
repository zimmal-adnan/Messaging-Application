import React, {useState} from 'react';

function Login(props){
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [passwordAgain, setPasswordAgain] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);

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

    if(isSignUp){
      if(passwordAgain != password){
      throw Error("Passwords don't match")
      }
    }


    //if there is an error, throw the error message
    if(!response.ok){
      throw Error(await response.text());
    }
    
    //if successful, alert the user
    const data = await response.json();
    alert(`Welcome, ${data.username}!`);
    props.setUsername(username); //store the logged-in username
    props.setIsLoggedIn(true); //if set to true, user is directed to the MainApp
    
  } 
    //shows an alert if anything goes wrong
    catch (error) {
      console.error("Error:", error.message);
      alert(error.message);
  }
}

  return(
    <>

    {isSignUp ? (

      <div className = "login" style = {{height: "28rem"}}>

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

        {/*Submit Button*/}
        <button className="username-button" onClick={handleSubmit}>{isSignUp ? "SIGN UP" : "LOGIN"}</button>
        
        {/*Switch between Login/Signup*/}
        <p className='login-p' onClick={() => setIsSignUp(!isSignUp)} >
          {isSignUp ? "Already have an account? Login" : "Need an account? Sign up"}
        </p>

        
    </div>

    ) : (
      <div className = "login">

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

        {/*Submit Button*/}
        <button className="username-button" onClick={handleSubmit}>{isSignUp ? "SIGN UP" : "LOGIN"}</button>
        
        {/*Switch between Login/Signup*/}
        <p className='login-p' onClick={() => setIsSignUp(!isSignUp)} >
          {isSignUp ? "Already have an account? Login" : "Need an account? Sign up"}
        </p>

        
    </div>
    )}
    
    </>
    
  );
}
export default Login