const moment = require('moment-timezone');
const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const Scan = require("../models/Scan");
const { authenticateToken } = require("../middleware/auth");
const Queue = require("bull");
const fs = require("fs");
const path = require("path");
const Activity = require("../models/Activity");
const { exec } = require('child_process');
const router = express.Router();
const { getActiveModelPath } = require('../utils/modelManager');

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "..", "uploads", "scans");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Bull queue initialization
const scanProcessingQueue = new Queue("scan-processing", "redis://127.0.0.1:6379");

// Helper function to compute overall risk
const computeOverallRisk = (results) => {
  if (!results) return null;

  // First check explicit severities
  const severities = [];
  if (results.bowel?.status === "Injured") severities.push("high");
  if (results.extravasation?.status === "Present") severities.push("high");
  
  // For organs, use probabilities if available
  ['liver', 'kidney', 'spleen'].forEach(organ => {
    if (results[organ]?.probabilities) {
      const probs = results[organ].probabilities;
      if (probs[2] > 0.4) severities.push("high");  // High injury prob > 40%
      else if (probs[1] > 0.3) severities.push("moderate");  // Low injury prob > 30%
    }
    else if (results[organ]?.severity) {
      severities.push(results[organ].severity);
    }
  });

  if (severities.includes("high")) return "High Risk";
  if (severities.includes("moderate")) return "Moderate Risk";
  return "Low Risk";
};

const validateDicomZip = async (zipPath) => {
  try {
    const { execSync } = require('child_process');
    // Convert Windows paths to forward slashes and escape properly
    const normalizedPath = zipPath.replace(/\\/g, '/').replace(/'/g, "\\'");
    const command = `python -c "import zipfile; z=zipfile.ZipFile(r'${normalizedPath}'); print(len([f for f in z.namelist() if f.lower().endswith('.dcm') or not '.' in f]))"`;
    const result = execSync(command);
    const count = parseInt(result.toString().trim());
    return count > 0;
  } catch (error) {
    console.error('Error validating DICOM zip:', error);
    return false;
  }
};

// Process jobs in the queue
scanProcessingQueue.process(async (job) => {
  const { scanId, filePath, fileType, userId, userEmail, userName } = job.data;
  const processingStart = new Date();
  const userIdentifier = userName || userEmail || userId?.toString() || 'system';

  try {
    // Update status to Processing
    await Scan.findByIdAndUpdate(scanId, {
      status: "Processing",
      processingStarted: processingStart
    });

    console.log(`Processing scan ${scanId}...`);

    // Execute Python script
    const modelPath = await getActiveModelPath();

    // Verify model exists
    if (!fs.existsSync(modelPath)) {
      throw new Error(`Model file not found: ${modelPath}`);
    }

    // Only validate if it's a ZIP file
    if (fileType === 'dicom_zip') {
      if (!await validateDicomZip(filePath)) {
        throw new Error('ZIP archive contains no valid DICOM files');
      }
    }

    const pythonScriptPath = path.join(__dirname, '..', 'python', 'inference.py');
    const pythonProcess = exec(
      `python "${pythonScriptPath}" "${filePath}" "${modelPath}" --tta --thresholds`,
      { maxBuffer: 1024 * 1024 * 50 }
    );
    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
      console.log(`Python stdout: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
      console.error(`Python stderr: ${data}`);
    });

    // Wait for Python process to complete
    const exitCode = await new Promise((resolve) => {
      pythonProcess.on('close', resolve);
    });

    if (exitCode !== 0) {
      throw new Error(`Python process exited with code ${exitCode}: ${stderrData}`);
    }

    // Parse Python output
    const results = JSON.parse(stdoutData);
    console.log('Parsed results:', results);

    const processingEnd = new Date();
    const processingDuration = processingEnd - processingStart;

    const dbResults = {
      overallRisk: computeOverallRisk(results),
      confidence: Math.round((results.confidence || 0) * 100), // Ensure we have a number
      findings: {
        bowel: {
          status: results.bowel?.status || "Not Analyzed",
          severity: results.bowel?.severity || "normal",
          confidence: Math.round((results.bowel?.confidence || 0) * 100)
        },
        extravasation: {
          status: results.extravasation?.status || "Not Analyzed",
          severity: results.extravasation?.severity || "normal",
          confidence: Math.round((results.extravasation?.confidence || 0) * 100)
        },
        liver: {
          status: results.liver?.status || "Not Analyzed",
          severity: results.liver?.severity || "normal",
          confidence: Math.round((results.liver?.confidence || 0) * 100)
        },
        kidney: {
          status: results.kidney?.status || "Not Analyzed",
          severity: results.kidney?.severity || "normal",
          confidence: Math.round((results.kidney?.confidence || 0) * 100)
        },
        spleen: {
          status: results.spleen?.status || "Not Analyzed",
          severity: results.spleen?.severity || "normal",
          confidence: Math.round((results.spleen?.confidence || 0) * 100)
        }
      },
      recommendations: [
        "Follow up with specialist",
        "Consider additional imaging"
      ],
      summary: "AI analysis completed",
      technicalDetails: {
        modelVersion: "1.0.0",
        processingNode: "GPU-1",
        algorithmUsed: "DeepLearning v2",
        qualityScore: 95
      }
    };

    // Update scan with results
    await Scan.findByIdAndUpdate(scanId, {
      status: "Completed",
      results: dbResults,
      processingCompleted: processingEnd,
      processingTime: processingDuration > 0 ? processingDuration : 1000
    });

    // Log successful processing
    await Activity.create({
      type: "scan",
      user: userIdentifier,
      action: "Completed scan analysis",
      status: "success",
      metadata: { scanId, processingTime: processingDuration }
    });

    console.log(`Processed scan ${scanId} successfully.`);

  } catch (error) {
    console.error(`Error processing scan ${scanId}:`, error);

    const processingEnd = new Date();
    const processingDuration = processingEnd - processingStart;

    await Scan.findByIdAndUpdate(scanId, {
      status: "Failed",
      error: error.message,
      processingCompleted: processingEnd,
      processingTime: processingDuration > 0 ? processingDuration : 1000
    });

    await Activity.create({
      type: "scan",
      user: userIdentifier,
      action: "Failed scan analysis",
      status: "error",
      metadata: { scanId, error: error.message }
    });

    throw error;
  }
});

// Helper function to estimate wait time
const estimateWaitTime = async () => {
  const counts = await scanProcessingQueue.getJobCounts();
  const avgProcessingTime = 60; // seconds - adjust based on your actual processing time
  return {
    waiting: counts.waiting,
    active: counts.active,
    estimatedSeconds: counts.waiting * avgProcessingTime
  };
};

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}_${file.originalname}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  }
});


router.get("/average-time", async (req, res) => {
  try {
    const result = await Scan.aggregate([
      {
        $match: {
          status: "Completed",
          processingTime: { $exists: true, $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          averageTime: { $avg: "$processingTime" },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      averageTime: result[0] ? (result[0].averageTime / 1000).toFixed(1) : 0,
      scanCount: result[0]?.count || 0
    });

  } catch (error) {
    console.error("Error calculating average time:", error);
    res.status(500).json({ message: "Error calculating average time" });
  }
});

// Upload scan
router.post("/upload", authenticateToken, upload.single("scan"), async (req, res) => {
  try {
    const file = req.file;
    const { scanType, bodyPart, contrast, priority } = req.body;
    const { userId, email: userEmail, name: userName } = req.user;

    if (!file) return res.status(400).json({ message: "No file uploaded" });

    // Determine file type based on extension
    let fileType;
    if (file.originalname.toLowerCase().endsWith('.zip')) {
      fileType = 'dicom_zip';
    } else if (file.originalname.toLowerCase().endsWith('.nii') ||
      file.originalname.toLowerCase().endsWith('.nii.gz')) {
      fileType = 'nifti';
    } else {
      return res.status(400).json({ message: "Unsupported file format" });
    }

    const newScan = new Scan({
      userId,
      fileName: file.filename,
      originalName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      fileType, // Store the determined file type
      scanType: scanType || "CT",
      bodyPart: bodyPart || "Abdomen",
      contrast: contrast === "true",
      priority: priority || "Normal",
      status: "Queued"
    });


    await newScan.save();

    // Log activity
    await Activity.create({
      type: "scan",
      user: userName || userEmail || userId.toString(),
      action: "Uploaded a new CT scan",
      status: "success",
      metadata: {
        scanId: newScan._id,
        fileType,
        size: file.size
      }
    });

    // Add to processing queue with all user info
    await scanProcessingQueue.add({
      scanId: newScan._id,
      filePath: file.path,
      fileType,
      userId,
      userEmail,
      userName,
      startedAt: new Date()
    });

    res.status(201).json({
      message: "Scan uploaded and queued",
      scanId: newScan._id,
      status: "Queued"
    });

  } catch (err) {
    console.error("Scan upload error:", err);
    if (req.file?.path) fs.unlink(req.file.path, () => { });
    res.status(500).json({ message: "Server error during upload", error: err.message });
  }
});

// Get scan details
router.get("/:scanId", authenticateToken, async (req, res) => {
  try {
    const { scanId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(scanId)) {
      return res.status(400).json({ message: "Invalid scan ID" });
    }

    const scan = await Scan.findById(scanId);
    console.log('DATABASE RESULTS: ', scan.results)
    if (!scan) {
      return res.status(404).json({ message: "Scan not found" });
    }

    // Verify ownership
    if (scan.userId.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    // Format dates for Kathmandu timezone
    const formatKathmanduDate = (date) => {
      if (!date) return null;
      return {
        iso: date.toISOString(),
        localDate: moment(date).tz('Asia/Kathmandu').format('YYYY-MM-DD'),
        localTime: moment(date).tz('Asia/Kathmandu').format('HH:mm:ss'),
        formatted: moment(date).tz('Asia/Kathmandu').format('YYYY-MM-DD [at] hh:mm A')
      };
    };

    const formattedDate = formatKathmanduDate(scan.createdAt);

    return res.json({
      scanId: scan._id,
      date: formattedDate?.localDate || "Unknown Date",
      time: formattedDate?.localTime || "Unknown Time",
      formattedDateTime: formattedDate?.formatted || "Unknown Date/Time",
      scanner: scan.scanner || "Unknown",
      status: scan.status,
      overallRisk: scan.results?.overallRisk || null,
      confidence: scan.results?.confidence || 0,
      findings: scan.results?.findings || {},
      recommendations: scan.results?.recommendations || [],
      summary: scan.results?.summary || "Analysis in progress",
      processingTime: scan.processingTime ? Math.round(scan.processingTime / 1000) : null,
      error: scan.error
    });
  } catch (error) {
    console.error("Error fetching scan:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});

// Check scan status
router.get("/:scanId/status", authenticateToken, async (req, res) => {
  try {
    const { scanId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(scanId)) {
      return res.status(400).json({ message: "Invalid scan ID" });
    }

    const scan = await Scan.findOne({
      _id: scanId,
      userId: req.user.userId
    }).select('status results error createdAt processingStarted processingCompleted');

    if (!scan) {
      return res.status(404).json({ message: "Scan not found or unauthorized" });
    }

    let progress = 0;
    if (scan.status === "Queued") progress = 10;
    else if (scan.status === "Processing") progress = 50;
    else if (scan.status === "Completed") progress = 100;

    return res.json({
      status: scan.status,
      isComplete: scan.status === "Completed",
      hasResults: !!scan.results,
      scanId: scan._id,
      progress,
      error: scan.error,
      processingTime: scan.processingStarted && scan.processingCompleted ?
        Math.round((scan.processingCompleted - scan.processingStarted) / 1000) : null
    });
  } catch (error) {
    console.error("Error checking scan status:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});

// Public scan status endpoint
router.get("/:scanId/public-status", async (req, res) => {
  try {
    const { scanId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(scanId)) {
      return res.status(400).json({ message: "Invalid scan ID" });
    }

    const scan = await Scan.findById(scanId)
      .select('status progress');

    if (!scan) {
      return res.status(404).json({ message: "Scan not found" });
    }

    return res.json({
      status: scan.status,
      progress: scan.progress || 0
    });
  } catch (error) {
    console.error("Error checking public scan status:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});

// List user's scans
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { limit = 10, page = 1 } = req.query;

    const options = {
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      sort: { createdAt: -1 }
    };

    const scans = await Scan.find({ userId }, null, options);
    const total = await Scan.countDocuments({ userId });

    const response = scans.map((scan) => ({
      _id: scan._id,
      fileName: scan.originalName,
      scanner: scan.scanner || "Unknown",
      date: scan.createdAt.toISOString(),
      fileType: scan.fileType,
      status: scan.status,
      overallRisk: scan.results?.overallRisk || null,
      findings: scan.results?.findings || {},
      processingTime: scan.processingTime ? Math.round(scan.processingTime / 1000) : null
    }));

    res.json({
      scans: response,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error("Error fetching scans:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
});

// In your routes/scan.js temporarily add:
router.get("/test-scans", async (req, res) => {
  const scans = await Scan.find({ status: "Completed" });
  res.json(scans);
});

module.exports = router;
