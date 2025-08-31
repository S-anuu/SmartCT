const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const { authenticateToken } = require('./middleware/auth');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Database connection
// Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log(" Connected to MongoDB"))
  .catch((err) => {
    console.error(" MongoDB connection error:", err);
    process.exit(1);
  });


// Middleware
// Replace your current CORS middleware with this:
app.use(cors({
  origin: [
    'http://localhost:3000', // Your Next.js frontend
    process.env.FRONTEND_URL // If you have this set
  ].filter(Boolean),
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json()); // Body parsing middleware
app.use(express.urlencoded({ extended: true }));

// Import routes
const systemSettingsRoutes = require("./routes/systemsettings");
const adminRoutes = require("./routes/adminroutes");
const userRoutes = require("./routes/users");
const aboutRoutes = require("./routes/about");
const verifyCodeRoute = require("./routes/verify-code");
const privacyRoutes = require("./routes/privacy");
const authRoutes = require('./routes/auth');
const modelRoutes = require("./routes/models");
const scanRoutes = require("./routes/scans");


// Mount routes
app.use("/api/settings", systemSettingsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/about", aboutRoutes);
app.use("/api/verify-code", verifyCodeRoute);
app.use("/api/privacy", privacyRoutes);
app.use('/api/auth', authRoutes);
app.use("/api/models", modelRoutes);
// app.use("/api/scans", authenticateToken);
app.use("/api/scans", scanRoutes);
app.use("/api/test", (req, res) => res.send("Test working"));

// Static files
app.use("/uploads/models", express.static("uploads/models"));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Worker process
const { processScanQueue } = require('./workers/inferenceWorker');
setInterval(async () => {
  try {
    await processScanQueue();
  } catch (error) {
    console.error('Worker process error:', error);
  }
}, 10000);



app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
  console.log(` API available at http://localhost:${PORT}/api`);
});
