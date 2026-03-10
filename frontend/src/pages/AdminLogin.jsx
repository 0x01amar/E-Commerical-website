import { useState } from "react";
import { useNavigate } from "react-router-dom";

function AdminLogin() {

  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");

  const navigate = useNavigate();

  const handleLogin = (e) => {

    e.preventDefault();

    fetch("http://localhost:5000/api/auth/login",{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        email,
        password
      })
    })
    .then(res=>res.json())
    .then(data=>{

      if(data.message === "Login successful"){

        alert("Admin Login successful");

        navigate("/admin-dashboard");

      }else{

        alert("Invalid admin credentials");

      }

    });

  };

  return(

    <div style={{padding:"40px"}}>

      <h2>Admin Login</h2>

      <form onSubmit={handleLogin}>

        <input
        placeholder="Email"
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
        />

        <br/><br/>

        <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e)=>setPassword(e.target.value)}
        />

        <br/><br/>

        <button type="submit">Login</button>

      </form>

    </div>

  );

}

export default AdminLogin;