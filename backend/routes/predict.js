const express = require("express");
const multer = require("multer");
const path = require("path");
const { spawn } = require("child_process");  // or use python-shell or direct PyTorch inference in Node if setup

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/scans"),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// POST /api/predict
router.post("/predict", upload.single("scan"), async (req, res) => {
  try {
    const scanFile = req.file;
    if (!scanFile) {
      return res.status(400).json({ message: "No scan file uploaded" });
    }

    // Load latest deployed model info from DB
    const activeModel = await Model.findOne({ status: "Active" }).sort({ deployedDate: -1 });
    if (!activeModel) return res.status(500).json({ message: "No active model found" });

    // At this point:
    // - You have scanFile.path (uploaded scan)
    // - You have activeModel.filePath (path to .pth model file)

    // Run inference with your Python script or Node.js model loader (example with Python script):
    // spawn python script that loads model and scan, then returns JSON predictions

    const pythonProcess = spawn("python3", [
      "path/to/inference_script.py",
      scanFile.path,
      activeModel.filePath,
    ]);

    let result = "";
    pythonProcess.stdout.on("data", (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      console.error("Python error:", data.toString());
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        return res.status(500).json({ message: "Inference script failed" });
      }
      try {
        const predictions = JSON.parse(result);
        res.json({ predictions });
      } catch (err) {
        res.status(500).json({ message: "Invalid prediction output" });
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
