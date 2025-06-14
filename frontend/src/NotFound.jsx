import React from 'react';
import {Link} from 'react-router-dom';

function NotFound(){
    return(
        <>
            <div className='error-paragraph'>
                <div className='box'>
                    <p className='error'>404</p>
                    <p className='subheading' style = {{fontSize: "1.5rem"}}>Oops! Page Not Found :(</p>
                    <hr style={{border: '1px solid black', margin: '2px 0', width: "35rem"}}></hr>
                    <p className="text" style = {{fontSize: "1rem"}}>Sorry, we couldn't find the page you were looking for</p>
                    <button className='redirect-button'><Link to = "/login" style={{color: "black", textDecoration: "none"}}>← Back to Login</Link></button>
                </div>
            </div>
        </>
    );
}

export default NotFound;