const express = require("express");
const router = express.Router();
const User = require("../models/User");
const OTPStore = require("./otpStore");

router.post("/", async (req, res) => {
  const { email, otp } = req.body; 
  if (!email || !otp) {
    return res.status(400).json({ message: "Email and verification code required" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const storedOTP = OTPStore[normalizedEmail];

  try {
    if (!storedOTP || storedOTP !== otp) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.emailVerified = true;
    user.status = "Active";
    await user.save();

    delete OTPStore[normalizedEmail];

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router ;
