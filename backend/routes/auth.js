const express = require("express");
const router = express.Router();
const User = require("../models/User");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const passwordPolicyRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;


// -------- EMAIL TRANSPORTER --------
// Updated to use Port 587 (STARTTLS) which is often more reliable than 465 in many environments
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    // Do not fail on invalid certificates (useful for some network configurations)
    rejectUnauthorized: false
  },
  connectionTimeout: 15000, // 15 seconds
  greetingTimeout: 15000,
});

// Verify connection configuration on startup
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter.verify(function (error, success) {
    if (error) {
      console.error(" [AUTH] !!! TRANSPORTER CONNECTION ERROR !!!");
      console.error(" [AUTH] Error Message:", error.message);
      console.error(" [AUTH] Error Code:", error.code);
      if (error.message.includes("Invalid login") || error.message.includes("auth")) {
        console.error(" [AUTH] TIP: Ensure you are using a 16-character 'App Password' if using Gmail with 2FA.");
      }
    } else {
      console.log(" [AUTH] Email server is ready to deliver OTPs (Connected to smtp.gmail.com:587)");
    }
  });
} else {
  console.warn(" [AUTH] WARNING: EMAIL_USER or EMAIL_PASS not set. OTP emails will fail.");
}

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const trimString = (value) => String(value || "").trim();

const normalizeAddress = (address = {}) => {
  if (typeof address === "string") {
    const fullAddress = trimString(address);

    return {
      line1: fullAddress,
      landmark: "",
      villageTown: "",
      wardNo: "",
      district: "",
      state: "",
      pincode: "",
      fullAddress,
    };
  }

  const normalized = {
    line1: trimString(address?.line1),
    landmark: trimString(address?.landmark),
    villageTown: trimString(address?.villageTown),
    wardNo: trimString(address?.wardNo),
    district: trimString(address?.district),
    state: trimString(address?.state),
    pincode: trimString(address?.pincode),
    fullAddress: trimString(address?.fullAddress),
  };

  const composedAddress = [
    normalized.line1,
    normalized.landmark,
    normalized.villageTown,
    normalized.wardNo ? `Ward No ${normalized.wardNo}` : "",
    normalized.district,
    normalized.state,
    normalized.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  normalized.fullAddress = normalized.fullAddress || composedAddress;

  return normalized;
};

const isPincodeValid = (pincode = "") => !pincode || /^\d{6}$/.test(trimString(pincode));

const isStrongPassword = (password = "") => passwordPolicyRegex.test(password);

const isBcryptHash = (value = "") => value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$");

const isAdminKeyValid = (adminKey = "") => {
  const configuredAdminKey = process.env.ADMIN_KEY || "";
  if (!configuredAdminKey) {
    console.warn("WARNING: ADMIN_KEY is not set in environment variables. Admin login will be disabled.");
    return false;
  }
  return adminKey === configuredAdminKey;
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

const safeUser = (user) => {
  const normalizedAddress = normalizeAddress(user.address || {});

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: normalizedAddress,
    addressText: normalizedAddress.fullAddress,
    photo: user.photo,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

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

    // Attempt to send email but don't crash if it fails
    let emailSent = false;
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    try {
      if (emailUser && emailPass) {
        console.log(` [AUTH] Sending OTP to ${email}...`);
        const mailOptions = {
          from: `"Maa Sheela Iron Arts" <${emailUser}>`,
          to: email,
          subject: `${otp} is your verification code`,
          text: `Hi ${name},\n\nYour OTP for signup is: ${otp}\nIt will expire in 5 minutes.\n\nIf you did not request this, please ignore this email.`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 8px;">
              <h2 style="color: #1A1A1A; font-size: 24px; border-bottom: 2px solid #4A5D4E; padding-bottom: 10px;">Verification Code</h2>
              <p style="color: #4A4A4A; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
              <p style="color: #4A4A4A; font-size: 16px; line-height: 1.6;">Thank you for joining <strong>Maa Sheela Iron Arts</strong>. Use the following code to verify your account:</p>
              <div style="background-color: #FDFCFB; border: 1px dashed #4A5D4E; padding: 20px; text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4A5D4E;">${otp}</span>
              </div>
              <p style="color: #999; font-size: 12px;">This code will expire in 5 minutes. If you did not request this, please ignore this email.</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
              <p style="text-align: center; color: #4A5D4E; font-weight: bold;">Maa Sheela Iron Arts</p>
            </div>
          `
        };
        const info = await transporter.sendMail(mailOptions);
        console.log(" [AUTH] MAIL SENT SUCCESSFULLY. MessageId:", info.messageId);
        emailSent = true;
      } else {
        console.warn(" [AUTH] CRITICAL: EMAIL_USER or EMAIL_PASS is missing in .env file.");
      }
    } catch (mailError) {
      console.error(" [AUTH] MAIL SENDING FAILED!");
      console.error(" [AUTH] Detail:", mailError.message);
      if (mailError.message.includes("Invalid login")) {
        console.error(" [AUTH] TIP: If using Gmail, ensure you are using a 16-character 'App Password', not your regular password.");
      }
    }

    if (emailSent) {
      return res.json({
        message: "OTP sent to your email. Please check your inbox (and spam folder).",
      });
    } else {
      return res.json({
        message: "OTP generation successful, but email delivery failed. Please check the server console for errors.",
        tip: "Server-side configuration error. Admin needs to check environment variables.",
        otp: process.env.NODE_ENV === "development" ? otp : undefined
      });
    }

  } catch (err) {

    console.error("SIGNUP OTP ERROR:", err);

    res.status(500).json({
      message: "Failed to process signup request: " + (err.message || "Unknown error"),
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

    if (!req.body) {
      return res.status(400).json({ message: "Request body is missing. Ensure you are sending JSON data." });
    }

    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password || "";
    const adminKey = String(req.body?.adminKey || "");
    const asAdmin = Boolean(req.body?.asAdmin);

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password +isVerified");

    if (!user) {
      return res.status(404).json({ message: "User account not found with this email" });
    }

    if (user.isVerified === false) {
      return res.status(403).json({ message: "Account exists but email is not verified. Please verify your OTP first." });
    }

    if (!user.password) {
      return res.status(401).json({ message: "Account is not set up for password login. Please use OTP to reset your password." });
    }

    const passwordMatched = await comparePassword(password, user.password);

    if (!passwordMatched) {
      return res.status(401).json({ message: "The password you entered is incorrect" });
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
    console.error("AUTH ROUTE ERROR:", error);
    res.status(500).json({ message: "Server error: " + (error.message || "Unknown error") });
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

    const normalizedAddress = normalizeAddress(address);

    if (!isPincodeValid(normalizedAddress.pincode)) {
      return res.status(400).json({
        message: "Pincode must be exactly 6 digits",
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
    user.address = normalizedAddress;

    await user.save();

    res.json({
      message: "Profile completed",
      passwordSent: false,
      user: safeUser(user),
    });

  } catch (error) {
    console.error("AUTH ROUTE ERROR:", error);
    res.status(500).json({ message: "Server error: " + (error.message || "Unknown error") });
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
    console.error("GET PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error: " + (err.message || "Unknown error") });
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

    if (updates.address !== undefined) {
      updates.address = normalizeAddress(updates.address);

      if (!isPincodeValid(updates.address.pincode)) {
        return res.status(400).json({ message: "Pincode must be exactly 6 digits" });
      }
    }

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
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error: " + (err.message || "Unknown error") });
  }

});

module.exports = router;