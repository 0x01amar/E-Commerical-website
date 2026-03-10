import { useState } from "react";
import { useNavigate } from "react-router-dom";

function CompleteProfile(){

const [name,setName] = useState("");
const [phone,setPhone] = useState("");
const [address,setAddress] = useState("");

const navigate = useNavigate();

const email = localStorage.getItem("email");


const saveProfile = ()=>{

if(phone.length !== 10){
alert("Phone must be 10 digits");
return;
}

fetch("http://localhost:5000/api/auth/complete-profile",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
email,
name,
phone,
address
})
})
.then(res=>res.json())
.then(data=>{

alert("Your password: "+data.password);

navigate("/dashboard");

});

};


return(

<div
style={{
display:"flex",
justifyContent:"center",
alignItems:"center",
height:"100vh",
background:"#f2f5fb"
}}
>

<div
style={{
background:"white",
padding:"40px",
borderRadius:"10px",
boxShadow:"0 5px 20px rgba(0,0,0,0.1)",
width:"350px"
}}
>

<h2 style={{textAlign:"center"}}>
Complete Profile
</h2>

<input
placeholder="Name"
value={name}
onChange={(e)=>setName(e.target.value)}
style={{width:"100%",padding:"10px",marginTop:"20px"}}
/>

<input
placeholder="Phone"
value={phone}
maxLength="10"
onChange={(e)=>setPhone(e.target.value)}
style={{width:"100%",padding:"10px",marginTop:"10px"}}
/>

<input
placeholder="Address"
value={address}
onChange={(e)=>setAddress(e.target.value)}
style={{width:"100%",padding:"10px",marginTop:"10px"}}
/>

<button
onClick={saveProfile}
style={{
width:"100%",
padding:"10px",
marginTop:"20px",
background:"#4CAF50",
color:"white",
border:"none",
borderRadius:"5px"
}}
>
Save Profile
</button>

</div>

</div>

);

}

export default CompleteProfile;