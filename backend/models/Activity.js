const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["scan", "user", "system", "alert"],
      required: true,
    },
    user: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "info", "warning", "error"],
      default: "info",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Activity", activitySchema);
