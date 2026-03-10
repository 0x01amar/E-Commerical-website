import { useState } from "react";
import { useNavigate } from "react-router-dom";

function LoginPassword(){

const [email,setEmail] = useState("");
const [password,setPassword] = useState("");

const navigate = useNavigate();

const login = ()=>{

fetch("http://localhost:5000/api/auth/login-password",{
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

if(data.message==="Login successful"){

localStorage.setItem("email",email);

navigate("/dashboard");

}else{

alert("Wrong email or password");

}

});

};

return(

<div style={{display:"flex",justifyContent:"center",alignItems:"center",height:"100vh",background:"#f4f6fb"}}>

<div style={{background:"white",padding:"40px",borderRadius:"10px",boxShadow:"0 5px 20px rgba(0,0,0,0.1)",width:"350px"}}>

<h2 style={{textAlign:"center"}}>Login</h2>

<input
placeholder="Email"
value={email}
onChange={(e)=>setEmail(e.target.value)}
style={{width:"100%",padding:"10px",marginTop:"20px"}}
/>

<input
placeholder="Password"
type="password"
value={password}
onChange={(e)=>setPassword(e.target.value)}
style={{width:"100%",padding:"10px",marginTop:"10px"}}
/>

<button
onClick={login}
style={{width:"100%",padding:"10px",marginTop:"20px",background:"#4CAF50",color:"white",border:"none"}}
>
Login
</button>

</div>

</div>

);

}

export default LoginPassword;