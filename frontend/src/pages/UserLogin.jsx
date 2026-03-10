import { useState } from "react";
import { useNavigate } from "react-router-dom";

function UserLogin() {

const [email,setEmail] = useState("");
const [otp,setOtp] = useState("");
const [step,setStep] = useState(1);

const navigate = useNavigate();


// -------- SEND OTP --------
const sendOtp = () => {

fetch("http://localhost:5000/api/auth/send-otp",{
    method:"POST",
    headers:{
    "Content-Type":"application/json"
 },
body:JSON.stringify({email})
})
.then(res=>res.json())
.then(data=>{

// Agar user pehle se registered hai
if(data.login){
    navigate("/login-password");
}else{
    alert("OTP sent to your email");
    setStep(2);
    }

  });

};


// -------- VERIFY OTP --------
const verifyOtp = () => {

fetch("http://localhost:5000/api/auth/verify-otp",{
    method:"POST",
    headers:{
    "Content-Type":"application/json"
},
    body:JSON.stringify({
    email,
    otp
    })
})
.then(res=>res.json())
.then(data=>{

    if(data.message ==="Invalid OTP"||
        data.message ==="OTP expired"
    ){
        alert(data.message);
        return
    }

if(data.userExists){

    localStorage.setItem("email",email);

    navigate("/dashboard");

}else{

    navigate("/complete-profile");

}

});

};


return(
    
    <div
        style={{
        display:"flex",
        justifyContent:"center",
        alignItems:"center",
        height:"100vh",
        background:"#f4f6fb"
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
    
    <h2 style={{textAlign:"center",color:"#333"}}>
        User Login
    </h2>
    
    
    {/* STEP 1 EMAIL */}
    
    {step===1 && (
    
    <>
    
    <input
        placeholder="Enter your email"
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
        style={{
        width:"100%",
        padding:"10px",
        marginTop:"20px",
        borderRadius:"5px",
        border:"1px solid #ccc"
    }}
    />
    
    <button
        onClick={sendOtp}
        style={{
        width:"100%",
        padding:"10px",
        marginTop:"20px",
        background:"#4CAF50",
        color:"white",
        border:"none",
        borderRadius:"5px",
        cursor:"pointer"
    }}
    >
    Send OTP
    </button>
    
    </>
    
)}
    
    
    
{/* STEP 2 OTP */}
    
    {step===2 && (
    
    <>
    
    <input
        placeholder="Enter OTP"
        value={otp}
        onChange={(e)=>setOtp(e.target.value)}
        style={{
        width:"100%",
        padding:"10px",
        marginTop:"20px",
        borderRadius:"5px",
        border:"1px solid #ccc"
    }}
    />

    <button
        onClick={verifyOtp}
        style={{
        width:"100%",
        padding:"10px",
        marginTop:"20px",
        background:"#2196F3",
        color:"white",
        border:"none",
        borderRadius:"5px",
        cursor:"pointer"
    }}
    >
      Verify OTP
    </button>

</>

    )}

        </div>

        </div>

    );

    }

export default UserLogin;