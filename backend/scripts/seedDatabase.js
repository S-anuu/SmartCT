const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
require("dotenv").config()

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/smartct"

// User Schema (duplicate from server.js for seeding)
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["Doctor", "Radiologist", "Nurse", "Technician", "Admin"], default: "Doctor" },
  phone: { type: String },
  dob: { type: Date },
  gender: { type: String, enum: ["Male", "Female", "Other"] },
  status: { type: String, enum: ["Active", "Inactive", "Pending"], default: "Active" },
  isAdmin: { type: Boolean, default: false },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

const User = mongoose.model("User", userSchema)

const seedUsers = [
  {
    firstName: "Admin",
    lastName: "User",
    email: "admin@example.com",
    password: "password123",
    role: "Admin",
    phone: "+1 (555) 000-0000",
    gender: "Other",
    isAdmin: true,
    status: "Active",
  },
  {
    firstName: "Dr. Sarah",
    lastName: "Johnson",
    email: "user@example.com",
    password: "password123",
    role: "Doctor",
    phone: "+1 (555) 123-4567",
    gender: "Female",
    isAdmin: false,
    status: "Active",
  },
  {
    firstName: "Dr. Michael",
    lastName: "Chen",
    email: "michael.chen@hospital.com",
    password: "password123",
    role: "Radiologist",
    phone: "+1 (555) 234-5678",
    gender: "Male",
    isAdmin: false,
    status: "Active",
  },
  {
    firstName: "Nurse Emily",
    lastName: "Davis",
    email: "emily.davis@hospital.com",
    password: "password123",
    role: "Nurse",
    phone: "+1 (555) 345-6789",
    gender: "Female",
    isAdmin: false,
    status: "Active",
  },
  {
    firstName: "Dr. Robert",
    lastName: "Wilson",
    email: "robert.wilson@hospital.com",
    password: "password123",
    role: "Doctor",
    phone: "+1 (555) 456-7890",
    gender: "Male",
    isAdmin: false,
    status: "Active",
  },
  {
    firstName: "Tech Alex",
    lastName: "Rodriguez",
    email: "alex.rodriguez@hospital.com",
    password: "password123",
    role: "Technician",
    phone: "+1 (555) 567-8901",
    gender: "Male",
    isAdmin: false,
    status: "Active",
  },
]

async function seedDatabase() {
  try {
    console.log("Connecting to MongoDB...")
    mongoose.connect(MONGODB_URI)

    console.log("Connected to MongoDB")

    // Clear existing users
    console.log("Clearing existing users...")
    await User.deleteMany({})

    // Hash passwords and create users
    console.log("Creating seed users...")
    for (const userData of seedUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 10)
      const user = new User({
        ...userData,
        password: hashedPassword,
        dob: new Date("1990-01-01"), // Default DOB
        lastLogin: new Date(),
      })
      await user.save()
      console.log(`Created user: ${user.email}`)
    }

    console.log("Database seeded successfully!")
    console.log("\nDemo Credentials:")
    console.log("Admin: admin@example.com / password123")
    console.log("User: user@example.com / password123")
    console.log("\nAll users have password: password123")
  } catch (error) {
    console.error("Error seeding database:", error)
  } finally {
    await mongoose.connection.close()
    console.log("Database connection closed")
  }
}

// Run the seed function
seedDatabase()
