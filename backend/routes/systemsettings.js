const express = require("express")
const router = express.Router()

// Example in-memory settings (use DB in production)
let settings = {
  modelVersion: "2.1.3",
  autoUpdateModel: true,
  storageLimit: 80,
  enableLogging: true,
  maxConcurrentScans: 5,
  sessionTimeout: 30,
  alertThreshold: 90,
  notificationsEnabled: true,
  maintenanceMode: false,
}

// GET current system settings
router.get("/", (req, res) => {
  res.json(settings)
})

// PUT update settings
router.put("/", (req, res) => {
  settings = { ...settings, ...req.body }
  res.json({ message: "Settings updated", settings })
})

module.exports = router
