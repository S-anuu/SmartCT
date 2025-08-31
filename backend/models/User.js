const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const crypto = require("crypto")

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    role: {
      type: String,
      enum: {
        values: ["Doctor", "Radiologist", "Nurse", "Technician", "Admin"],
        message: "Role must be one of: Doctor, Radiologist, Nurse, Technician, Admin",
      },
      default: "Doctor",
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[+]?[1-9][\d]{0,15}$/, "Please enter a valid phone number"],
    },
    dob: {
      type: Date,
      validate: {
        validator: (value) => !value || value < new Date(),
        message: "Date of birth cannot be in the future",
      },
    },
    gender: {
      type: String,
      enum: {
        values: ["Male", "Female", "Other"],
        message: "Gender must be Male, Female, or Other",
      },
    },
    status: {
      type: String,
      enum: {
        values: ["Active", "Inactive", "Pending"],
        message: "Status must be Active, Inactive, or Pending",
      },
      default: "Active",
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,

    // Password reset
    passwordResetToken: String,
    passwordResetExpires: Date,

    // Email verification
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,

    profilePic: {
      type: String,
      default: "",
    },

    preferences: {
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: true },
      },
      theme: {
        type: String,
        enum: ["light", "dark", "auto"],
        default: "light",
      },
      language: {
        type: String,
        default: "en",
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password
        delete ret.loginAttempts
        delete ret.lockUntil
        delete ret.passwordResetToken
        delete ret.passwordResetExpires
        delete ret.emailVerificationToken
        return ret
      },
    },
  }
)

// 🔍 Indexes
userSchema.index({ status: 1 })
userSchema.index({ role: 1 })
userSchema.index({ createdAt: -1 })

// 🧾 Virtuals
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`
})

userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now())
})


// 🔒 Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

// 🔁 Login Attempt Handling
userSchema.methods.incLoginAttempts = function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $unset: { lockUntil: 1 }, $set: { loginAttempts: 1 } })
  }

  const updates = { $inc: { loginAttempts: 1 } }
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 } // 2 hours
  }

  return this.updateOne(updates)
}

userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({ $unset: { loginAttempts: 1, lockUntil: 1 } })
}

// 🔐 Generate hashed reset token (save hash, return plain)
userSchema.methods.generatePasswordResetToken = function () {
  const rawToken = crypto.randomBytes(20).toString("hex")
  const hash = crypto.createHash("sha256").update(rawToken).digest("hex")
  this.passwordResetToken = hash
  this.passwordResetExpires = Date.now() + 15 * 60 * 1000 // 15 mins
  return rawToken
}

// 🧠 Static Login Logic
userSchema.statics.findByCredentials = async function (email, password) {
  const user = await this.findOne({ email: email.toLowerCase() })
  if (!user) throw new Error("Invalid email or password")
  if (user.isLocked) throw new Error("Account is temporarily locked due to too many failed login attempts")
  if (user.status !== "Active") throw new Error("Account is not active")

  const isMatch = await user.comparePassword(password)
  if (!isMatch) {
    await user.incLoginAttempts()
    throw new Error("Invalid email or password")
  }

  if (user.loginAttempts > 0) await user.resetLoginAttempts()

  user.lastLogin = new Date()
  await user.save()

  return user
}

// 📊 Static Stats
userSchema.statics.getStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] } },
        inactive: { $sum: { $cond: [{ $eq: ["$status", "Inactive"] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] } },
        admins: { $sum: { $cond: ["$isAdmin", 1, 0] } },
      },
    },
  ])

  return stats[0] || { total: 0, active: 0, inactive: 0, pending: 0, admins: 0 }
}

module.exports = mongoose.model("User", userSchema)
