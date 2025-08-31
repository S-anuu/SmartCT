const express = require("express");
const router = express.Router();
const Model = require("../models/Model");

// GET /api/about - returns complete system and model info
router.get("/", async (req, res) => {
  try {
    const activeModel = await Model.findOne({ status: "Active" }).sort({ deployedDate: -1 });

    if (!activeModel) {
      return res.json({
        application: "SmartCT",
        version: "2.1.3",
        model: {
          name: "No active model",
          version: "N/A",
          accuracy: 0,
          deployedDate: null,
          status: "Inactive"
        }
      });
    }

    res.json({
      application: "SmartCT",
      version: "2.1.3",
      model: {
        name: activeModel.name,
        version: activeModel.version,
        accuracy: activeModel.accuracy,
        deployedDate: activeModel.deployedDate,
        status: activeModel.status
      }
    });
  } catch (error) {
    console.error("Error fetching about info:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
