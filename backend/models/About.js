const mongoose = require("mongoose");

const AboutSchema = new mongoose.Schema({
  name: String,
  version: String,
  build: String,
  releaseDate: String,
  developer: String,
  copyright: String,
  description: String,
  features: [String],
}, { timestamps: true });

module.exports = mongoose.model("About", AboutSchema);
