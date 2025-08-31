const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Model = require("../models/Model");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// ==================== MULTER CONFIGURATION ====================
const modelUploadDir = path.join(__dirname, "..", "uploads", "models");

// Ensure upload directory exists
fs.mkdirSync(modelUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, modelUploadDir);
  },
  filename: (req, file, cb) => {
    const { name, version } = req.body;
    const cleanName = (name || "model").replace(/[^a-zA-Z0-9_-]/g, "_");
    const cleanVersion = (version || "v0").replace(/[^a-zA-Z0-9_.-]/g, "_");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const ext = path.extname(file.originalname) || ".pth";
    const filename = `${cleanName}_v${cleanVersion}_${timestamp}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname) !== ".pth") {
      return cb(new Error("Only .pth model files are allowed"));
    }
    cb(null, true);
  },
   limits: {
     fileSize: 1000 * 1024 * 1024, // 100MB limit
   },
});

// ==================== ROUTE HANDLERS ====================
const handleModelUpload = async (req, res) => {
  try {
    const { name, version, accuracy, status = "Active" } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No model file uploaded" });
    }

    if (!name || !version || !accuracy) {
      return res.status(400).json({
        message: "Name, version, and accuracy are required"
      });
    }

    // Set existing models to "Previous" if activating new model
    if (status === "Active") {
      await Model.updateMany(
        { status: "Active" },
        { $set: { status: "Previous" } }
      );
    }

    const newModel = new Model({
      name,
      version,
      accuracy: parseFloat(accuracy),
      deployedDate: new Date(),
      status,
      filePath: file.path,
      fileName: file.filename,
      originalFileName: file.originalname,
      uploadedBy: req.user?.email || "system",
    });

    await newModel.save();

    res.status(201).json({
      message: "Model uploaded successfully",
      model: newModel,
    });
  } catch (error) {
    console.error("Model upload error:", error);
    res.status(500).json({
      message: "Failed to upload model",
      error: error.message
    });
  }
};

const getActiveModel = async (req, res) => {
  try {
    const model = await Model.findOne({ status: "Active" })
      .sort({ accuracy: -1, deployedDate: -1 });

    if (!model) {
      return res.status(404).json({ message: "No active model found" });
    }

    res.json(model);
  } catch (error) {
    console.error("Error fetching active model:", error);
    res.status(500).json({
      message: "Failed to fetch active model",
      error: error.message
    });
  }
};

const getModelHistory = async (req, res) => {
  try {
    const models = await Model.find().sort({ deployedDate: -1 });
    res.json(models);
  } catch (error) {
    console.error("Error fetching model history:", error);
    res.status(500).json({
      message: "Failed to fetch model history",
      error: error.message
    });
  }
};

// ==================== ROUTES ====================
router.post(
  "/upload",
  authenticateToken,
  upload.single("model"),
  handleModelUpload
);

router.get("/current", getActiveModel);
router.get("/history", authenticateToken, getModelHistory);

module.exports = router;
