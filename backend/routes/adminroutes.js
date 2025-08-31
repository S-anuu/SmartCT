const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Scan = require("../models/Scan");
const Model = require("../models/Model");
const Activity = require("../models/Activity");

router.get("/stats", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalScans = await Scan.countDocuments();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayScans = await Scan.countDocuments({ createdAt: { $gte: today } });

    let modelAccuracy = 0;
    const modelData = await Model.findOne({ status: "Active" }).sort({ deployedDate: -1 });
    if (modelData) {
      modelAccuracy = modelData.accuracy;
    }

    res.json({
      totalUsers,
      totalScans,
      todayScans,
      modelAccuracy,
      systemUptime: "99.8%",
      storageUsed: 78,
      processingQueue: 3
    });
  } catch (err) {
    console.error("❌ Error in /api/admin/stats:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.get("/recent-activity", async (req, res) => {
  try {
    const activities = await Activity.find().sort({ createdAt: -1 }).limit(10);
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

module.exports = router;
