const express = require("express");
const router = express.Router();
const User = require("../models/User");
const nodemailer = require("nodemailer");
const crypto = require("crypto");


// -------- EMAIL TRANSPORTER --------
const transporter = nodemailer.createTransport({
    host:"smtp.gmail.com",
    port:587,
    secure:false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// -------- SEND OTP --------
router.post("/send-otp", async (req, res) => {

  try {

    const { email } = req.body;

    if(!email){
      return res.status(400).json({message:"Email required"});
    }

    // OTP generate
    const otp = Math.floor(100000 + Math.random()*900000).toString();

    let user = await User.findOne({email});

    if(!user){
      user = new User({email});
    }

    user.otp = otp;
    user.otpExpire = Date.now() + 5*60*1000;

    await user.save();

    await transporter.sendMail({
      from:process.env.EMAIL_USER,
      to:email,
      subject:"Your OTP",
      text:`Your OTP is ${otp}`
    });

    res.json({
      message:"OTP sent successfully"
    });

  } catch(err){

    console.log("SEND OTP ERROR:",err);

    res.status(500).json({
      message:"OTP sending failed"
    });

  }

});

// -------- VERIFY OTP --------
router.post("/verify-otp", async (req,res)=>{

try{

const {email,otp} = req.body;

const user = await User.findOne({email});

if(!user){
return res.status(404).json({message:"User not found"});
}

if(user.otp !== otp){
return res.status(400).json({message:"Invalid OTP"});
}

if(user.otpExpire < Date.now()){
return res.status(400).json({message:"OTP expired"});
}
user.otp = null;
user.otpExpire = null;
await user.save();

// -------- NEW USER PASSWORD GENERATE --------

if(!user.password){

const password = crypto.randomBytes(4).toString("hex");

user.password = password;

await user.save();

await transporter.sendMail({
from:process.env.EMAIL_USER,
to:email,
subject:"Maa Sheela Iron Art Login Password",
text:`Your login password is: ${password}`
});

}


res.json({
message:"OTP verified",
userExists: !!user.password
});

}catch(err){

console.log(err);
res.status(500).json({message:"Server error"});

}

});


// -------- COMPLETE PROFILE --------
router.post("/complete-profile", async (req, res) => {

  try {

    const { email, name, phone, address } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // random password generate
    const password = crypto.randomBytes(4).toString("hex");

    user.name = name;
    user.phone = phone;
    user.address = address;
    user.password = password;

    await user.save();
    await transporter.sendMail({
        from:process.env.EMAIL_USER,
        to:email,
        subject:"Maa Sheela Iron Art Login Password",
        text:`Your login password is: ${password}`
    });

    res.json({
      message: "Profile completed",
      password
    });

  } catch (error) {
    res.status(500).json(error);
  }

});


// -------- LOGIN WITH PASSWORD --------
router.post("/login-password", async (req, res) => {

  try {

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    if (user.password !== password) {
      return res.status(401).json({
        message: "Wrong password"
      });
    }

    res.json({
      message: "Login successful",
      user
    });

  } catch (error) {
    res.status(500).json(error);
  }

});

// Admin login
router.post("/login", async (req, res) => {

  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.password !== password) {
    return res.status(401).json({ message: "Wrong password" });
  }

  res.json({
    message: "Login successful",
    user
  });

});


// -------- GET USER PROFILE --------
router.get("/profile/:email", async (req, res) => {

  try {

    const user = await User.findOne({ email: req.params.email });

    res.json(user);

  } catch (err) {
    res.status(500).json(err);
  }

});


// -------- UPDATE USER PROFILE --------
router.put("/profile/:email", async (req, res) => {

  try {

    const updatedUser = await User.findOneAndUpdate(
      { email: req.params.email },
      req.body,
      { new: true }
    );

    res.json(updatedUser);

  } catch (err) {
    res.status(500).json(err);
  }

});

module.exports = router;