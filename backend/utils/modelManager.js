const path = require('path');
const fs = require('fs');
const Model = require('../models/Model');

async function getActiveModelPath() {
  try {
    // Get the active model with highest accuracy
    const activeModel = await Model.findOne({ status: "Active" })
      .sort({ accuracy: -1, deployedDate: -1 })
      .lean();

    if (!activeModel) {
      // Fallback to most recent previous model if no active model found
      const fallbackModel = await Model.findOne({ status: "Previous" })
        .sort({ deployedDate: -1 })
        .lean();
        
      if (!fallbackModel) {
        throw new Error('No available models found in database');
      }
      return fallbackModel.filePath;
    }

    // Verify the file exists
    if (!fs.existsSync(activeModel.filePath)) {
      throw new Error(`Model file not found at ${activeModel.filePath}`);
    }

    return activeModel.filePath;
  } catch (error) {
    console.error('Model path resolution error:', error);
    throw error;
  }
}

async function getAllModelStatus() {
  return Model.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        latest: { $max: "$deployedDate" },
        bestAccuracy: { $max: "$accuracy" }
      }
    }
  ]);
}

module.exports = {
  getActiveModelPath,
  getAllModelStatus
};