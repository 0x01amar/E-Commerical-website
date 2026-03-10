const express = require("express");
const router = express.Router();
const User = require("../models/User");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");


// -------- EMAIL TRANSPORTER --------
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const normalizeEmail = (email = "") => email.trim().toLowerCase();

const passwordPolicyRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const isStrongPassword = (password = "") => passwordPolicyRegex.test(password);

const comparePassword = async (plainPassword, storedPassword) => {
  if (!storedPassword) {
    return false;
  }

  if (storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$") || storedPassword.startsWith("$2y$")) {
    return bcrypt.compare(plainPassword, storedPassword);
  }

  return plainPassword === storedPassword;
};

const safeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  address: user.address,
  photo: user.photo,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// -------- SEND OTP --------
router.post("/send-otp", async (req, res) => {

  try {

    const email = normalizeEmail(req.body?.email);
    const rawPassword = req.body?.password || "";

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    let user = await User.findOne({ email }).select("+password +pendingPassword +pendingPasswordExpire");
    const hasExistingPassword = Boolean(user?.password);

    if (!user) {
      user = new User({ email });
    }

    if (!hasExistingPassword) {
      if (!rawPassword) {
        return res.status(400).json({
          message: "Password required for first login",
        });
      }

      if (!isStrongPassword(rawPassword)) {
        return res.status(400).json({
          message:
            "Password must be at least 8 characters and include one uppercase letter, one number, and one special character",
        });
      }

      user.pendingPassword = await bcrypt.hash(rawPassword, 10);
      user.pendingPasswordExpire = Date.now() + 5 * 60 * 1000;
    }

    user.otp = otp;
    user.otpExpire = Date.now() + 5 * 60 * 1000;

    await user.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP and Login Details",
      text: hasExistingPassword
        ? `Your OTP is ${otp}`
        : `Your OTP is ${otp}.\nYour selected login password is: ${rawPassword}`,
    });

    res.json({
      message: "OTP sent successfully",
      login: hasExistingPassword,
    });

  } catch (err) {

    console.log("SEND OTP ERROR:", err);

    res.status(500).json({
      message: "OTP sending failed",
    });

  }

});

// -------- VERIFY OTP --------
router.post("/verify-otp", async (req,res)=>{

try{

const email = normalizeEmail(req.body?.email);
const { otp } = req.body;

if(!email || !otp){
return res.status(400).json({message:"Email and OTP are required"});
}

const user = await User.findOne({email}).select("+otp +otpExpire +password +pendingPassword +pendingPasswordExpire");

if(!user){
return res.status(404).json({message:"User not found"});
}

if(user.otp !== otp){
return res.status(400).json({message:"Invalid OTP"});
}

if(user.otpExpire < Date.now()){
return res.status(400).json({message:"OTP expired"});
}

if(!user.password && user.pendingPassword){
if(user.pendingPasswordExpire && user.pendingPasswordExpire < Date.now()){
user.pendingPassword = null;
user.pendingPasswordExpire = null;
await user.save();
return res.status(400).json({message:"Password setup expired. Please request OTP again"});
}

user.password = user.pendingPassword;
}

user.otp = null;
user.otpExpire = null;
user.pendingPassword = null;
user.pendingPasswordExpire = null;
await user.save();

res.json({
message:"OTP verified",
userExists: !!user.password,
needsProfile: !user.name || !user.phone || !user.address,
});

}catch(err){

console.log(err);
res.status(500).json({message:"Server error"});

}

});


// -------- COMPLETE PROFILE --------
router.post("/complete-profile", async (req, res) => {

  try {

    const email = normalizeEmail(req.body?.email);
    const { name, phone, address } = req.body;

    if (!email || !name || !phone || !address) {
      return res.status(400).json({
        message: "Email, name, phone and address are required",
      });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        message: "Phone must be exactly 10 digits",
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.name = name;
    user.phone = phone;
    user.address = address;

    await user.save();

    res.json({
      message: "Profile completed",
      passwordSent: false,
      user: safeUser(user),
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }

});


// -------- LOGIN WITH PASSWORD --------
router.post("/login-password", async (req, res) => {

  try {

    const email = normalizeEmail(req.body?.email);
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const passwordMatched = await comparePassword(password, user.password || "");

    if (!passwordMatched) {
      return res.status(401).json({
        message: "Wrong password",
      });
    }

    if (passwordMatched && user.password && !(user.password.startsWith("$2a$") || user.password.startsWith("$2b$") || user.password.startsWith("$2y$"))) {
      user.password = await bcrypt.hash(password, 10);
      await user.save();
    }

    res.json({
      message: "Login successful",
      user: safeUser(user),
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }

});

// Admin login
router.post("/login", async (req, res) => {

  try {

    const email = normalizeEmail(req.body?.email);
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const passwordMatched = await comparePassword(password, user.password || "");

    if (!passwordMatched) {
      return res.status(401).json({ message: "Wrong password" });
    }

    if (passwordMatched && user.password && !(user.password.startsWith("$2a$") || user.password.startsWith("$2b$") || user.password.startsWith("$2y$"))) {
      user.password = await bcrypt.hash(password, 10);
      await user.save();
    }

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Only admin can login here" });
    }

    res.json({
      message: "Login successful",
      user: safeUser(user),
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});


// -------- GET USER PROFILE --------
router.get("/profile/:email", async (req, res) => {

  try {

    const email = normalizeEmail(req.params.email);
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(safeUser(user));

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }

});


// -------- UPDATE USER PROFILE --------
router.put("/profile/:email", async (req, res) => {

  try {

    const email = normalizeEmail(req.params.email);
    const updates = {
      name: req.body?.name,
      phone: req.body?.phone,
      address: req.body?.address,
      photo: req.body?.photo,
    };

    Object.keys(updates).forEach((key) => {
      if (updates[key] === undefined) {
        delete updates[key];
      }
    });

    if (updates.phone && !/^\d{10}$/.test(updates.phone)) {
      return res.status(400).json({ message: "Phone must be exactly 10 digits" });
    }

    const updatedUser = await User.findOneAndUpdate(
      { email },
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(safeUser(updatedUser));

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }

});

module.exports = router;