const express = require("express");
const router = express.Router();
const User = require("../models/User");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const passwordPolicyRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;


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

const isStrongPassword = (password = "") => passwordPolicyRegex.test(password);

const isBcryptHash = (value = "") => value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$");

const isAdminKeyValid = (adminKey = "") => {
  const configuredAdminKey = process.env.ADMIN_KEY || "";
  return Boolean(configuredAdminKey) && adminKey === configuredAdminKey;
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const comparePassword = async (plainPassword, storedPassword) => {
  if (!storedPassword) {
    return false;
  }

  if (isBcryptHash(storedPassword)) {
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

// -------- SIGNUP: REQUEST OTP --------
router.post("/signup/request-otp", async (req, res) => {

  try {

    const name = req.body?.name?.trim();
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password || "";
    const confirmPassword = req.body?.confirmPassword || "";

    if (!name) {
      return res.status(400).json({ message: "Full name is required" });
    }

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    if (!password || !confirmPassword) {
      return res.status(400).json({ message: "Password and confirm password are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Password and confirm password must match" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include one uppercase letter, one number, and one special character",
      });
    }

    const existingVerifiedUser = await User.findOne({ email, isVerified: true });

    if (existingVerifiedUser) {
      return res.status(409).json({ message: "Email is already registered. Please login." });
    }

    const otp = generateOtp();

    let user = await User.findOne({ email }).select("+password +signupOtp +signupOtpExpire");

    if (!user) {
      user = new User({ email });
    }

    user.name = name;
    user.password = await bcrypt.hash(password, 10);
    user.isVerified = false;
    user.signupOtp = otp;
    user.signupOtpExpire = Date.now() + OTP_EXPIRY_MS;
    user.role = "user";

    await user.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Signup OTP",
      text: `Hi ${name},\n\nYour OTP for signup is: ${otp}\nIt will expire in 5 minutes.\n\nIf you did not request this, please ignore this email.`,
    });

    res.json({
      message: "OTP sent to your email",
    });

  } catch (err) {

    console.log("SIGNUP OTP ERROR:", err);

    res.status(500).json({
      message: "OTP sending failed",
    });

  }

});

// -------- SIGNUP: VERIFY OTP --------
router.post("/signup/verify-otp", async (req, res) => {

  try {

    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || "").trim();

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email }).select("+signupOtp +signupOtpExpire +password");

    if (!user) {
      return res.status(404).json({ message: "Signup request not found. Please sign up again." });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User is already verified. Please login." });
    }

    if (!user.signupOtp || user.signupOtp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (!user.signupOtpExpire || user.signupOtpExpire < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    user.isVerified = true;
    user.signupOtp = null;
    user.signupOtpExpire = null;
    await user.save();

    res.json({
      message: "Signup successful",
      user: safeUser(user),
    });

  } catch (err) {

    console.log(err);
    res.status(500).json({ message: "Server error" });

  }

});


const loginHandler = async (req, res) => {

  try {

    const email = normalizeEmail(req.body?.email);
    const { password } = req.body;
    const adminKey = String(req.body?.adminKey || "");
    const asAdmin = Boolean(req.body?.asAdmin);

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "Please verify signup OTP first" });
    }

    const passwordMatched = await comparePassword(password, user.password || "");

    if (!passwordMatched) {
      return res.status(401).json({ message: "Wrong password" });
    }

    if (passwordMatched && user.password && !isBcryptHash(user.password)) {
      user.password = await bcrypt.hash(password, 10);
      await user.save();
    }

    const isAdmin = isAdminKeyValid(adminKey);

    if (asAdmin && !isAdmin) {
      return res.status(403).json({ message: "Invalid admin key" });
    }

    res.json({
      message: "Login successful",
      user: safeUser(user),
      role: isAdmin ? "admin" : "user",
      isAdmin,
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }

};


// -------- LOGIN --------
router.post("/login", loginHandler);


// -------- LOGIN (BACKWARD COMPAT) --------
router.post("/login-password", loginHandler);


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

    const user = await User.findOne({ email, isVerified: true }).select("+password");

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


// -------- GET USER PROFILE --------
router.get("/profile/:email", async (req, res) => {

  try {

    const email = normalizeEmail(req.params.email);
    const user = await User.findOne({ email, isVerified: true });

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
      { email, isVerified: true },
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