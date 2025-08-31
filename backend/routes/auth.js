const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const { sendOTP, sendPasswordResetLink } = require("../mailer");
const OTPStore = require("./otpStore");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Rate limiter for login/register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many attempts. Please try again later." },
});

router.use("/login", authLimiter);
router.use("/register", authLimiter);

/* Register - Send OTP */
router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password, dob, gender } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password.trim(), 12); 

    const newUser = new User({
      firstName,
      lastName,
      email: normalizedEmail,
      password: hashedPassword,
      dob,
      gender,
      status: "Pending",
      emailVerified: false,
    });

    await newUser.save();

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    OTPStore[normalizedEmail] = otp;

    await sendOTP(normalizedEmail, otp);
    console.log("🔐 OTP for", normalizedEmail, ":", otp);

    res.status(201).json({ message: "Verification code sent to email" });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/*  Verify OTP */
router.post("/verify-code", async (req, res) => {
  const { email, otp } = req.body;
  const normalizedEmail = email.toLowerCase().trim();
  const storedOTP = OTPStore[normalizedEmail];

  if (!storedOTP || storedOTP !== otp) {
    return res.status(400).json({ message: "Invalid or expired verification code" });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) return res.status(404).json({ message: "User not found" });

  user.emailVerified = true;
  user.status = "Active";
  await user.save();

  delete OTPStore[normalizedEmail];
  res.status(200).json({ message: "Email verified successfully!" });
});

/*  Login */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) return res.status(404).json({ message: "User not found" });

  console.log("Entered:", password.trim());
  console.log("Stored:", user.password);


  const isMatch = await bcrypt.compare(password.trim(), user.password);
   console.log("bcrypt.compare result:", isMatch)
  if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });
  

  if (!user.emailVerified || user.status !== "Active") {
    return res.status(403).json({ message: "Email not verified or account inactive" });
  }

  user.lastLogin = new Date();
  await user.save();

  const token = jwt.sign(
    { userId: user._id, email: user.email, isAdmin: user.isAdmin },
    JWT_SECRET,
    { expiresIn: "24h" }
  );

  res.json({
    message: "Login successful",
    token,
    user: {
      id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
    },
  });
});

/* Forgot Password */
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) return res.status(404).json({ message: "User not found" });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 min
  await user.save();

  const resetLink = `http://localhost:3000/reset-password/${rawToken}`;
  await sendPasswordResetLink(normalizedEmail, resetLink);

  res.json({ message: "Password reset link sent to your email" });
});

/*  Reset Password via /reset-password/:token */
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) return res.status(400).json({ message: "Invalid or expired token" });

  user.password = await bcrypt.hash(password.trim(), 12); // match register
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.json({ message: "Password reset successful" });
});

// ✅ Verify token validity (for frontend to check session)
router.get("/verify", authenticateToken, (req, res) => {
  res.status(200).json({ message: "Token valid", user: req.user });
});


// POST /api/privacy/logout-all
router.post("/logout-all", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    user.tokenVersion = (user.tokenVersion || 0) + 1; // increment version to invalidate tokens
    await user.save();
    res.json({ message: "Logged out from all devices" });
  } catch (err) {
    res.status(500).json({ error: "Failed to log out from all devices" });
  }
});

// POST /api/privacy/2fa
router.post("/2fa", authenticateToken, async (req, res) => {
  const { enabled } = req.body;
  try {
    await User.findByIdAndUpdate(req.user.userId, { twoFactorEnabled: enabled });
    res.json({ message: `Two-factor authentication ${enabled ? "enabled" : "disabled"}` });
  } catch (err) {
    res.status(500).json({ error: "Failed to update 2FA setting" });
  }
});

// POST /api/privacy/visibility
router.post("/visibility", authenticateToken, async (req, res) => {
  const { visible } = req.body;
  try {
    await User.findByIdAndUpdate(req.user.userId, { profileVisible: visible });
    res.json({ message: `Profile visibility set to ${visible}` });
  } catch (err) {
    res.status(500).json({ error: "Failed to update visibility setting" });
  }
});

// DELETE /api/privacy/delete-account
router.delete("/delete-account", authenticateToken, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.userId);
    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete account" });
  }
});

// GET /api/privacy/export-data
router.get("/export-data", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Failed to export data" });
  }
});


module.exports = router;
