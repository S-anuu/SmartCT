const nodemailer = require("nodemailer")

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
})

// ✅ 1. Send OTP for Email Verification
const sendOTP = async (email, code) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "SmartCT - Your Verification Code",
    html: `
      <p>Hello,</p>
      <p>Your 4-digit SmartCT verification code is:</p>
      <h2>${code}</h2>
      <p>This code will expire shortly. Please do not share it with anyone.</p>
      <br/>
      <p>— SmartCT Team</p>
    `,
  }

  await transporter.sendMail(mailOptions)
}

// ✅ 2. Send Password Reset Link
const sendPasswordResetLink = async (email, link) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "SmartCT - Password Reset Request",
    html: `
      <p>Hello,</p>
      <p>You requested a password reset for your SmartCT account. Click the link below to reset your password:</p>
      <a href="${link}" target="_blank">${link}</a>
      <p><b>Note:</b> This link will expire in 15 minutes. If you didn’t request this, you can safely ignore this email.</p>
      <br/>
      <p>— SmartCT Team</p>
    `,
  }

  await transporter.sendMail(mailOptions)
}

module.exports = {
  sendOTP,
  sendPasswordResetLink,
}


