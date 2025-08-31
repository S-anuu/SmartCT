const mongoose = require("mongoose");

const modelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  version: { type: String, required: true },
  accuracy: { type: Number, required: true },
  deployedDate: { type: String, required: true },
  status: { type: String, enum: ["Active", "Previous"], default: "Previous" },
  filePath: { type: String, required: true },
  fileName: { type: String, required: true },
  originalFileName: { type: String }, // Store original uploaded filename
  uploadedBy: { type: String, default: "admin" },
  uploadDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Model", modelSchema);
