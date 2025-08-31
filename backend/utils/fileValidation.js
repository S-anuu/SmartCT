const path = require("path")

// Allowed file extensions for medical images
const ALLOWED_EXTENSIONS = [".dcm", ".nii", ".gz"]

// Maximum file size (500MB)
const MAX_FILE_SIZE = 500 * 1024 * 1024

// MIME types for medical images
const ALLOWED_MIME_TYPES = ["application/dicom", "application/octet-stream", "application/x-gzip", "application/gzip"]

/**
 * Validate if file extension is allowed
 * @param {string} filename - The filename to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidFileExtension(filename) {
  const ext = path.extname(filename).toLowerCase()
  const isNiftiGz = filename.toLowerCase().endsWith(".nii.gz")

  return ALLOWED_EXTENSIONS.includes(ext) || isNiftiGz
}

/**
 * Validate file size
 * @param {number} fileSize - Size in bytes
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidFileSize(fileSize) {
  return fileSize <= MAX_FILE_SIZE
}

/**
 * Get file type from filename
 * @param {string} filename - The filename
 * @returns {string} - File type description
 */
function getFileType(filename) {
  const lowerName = filename.toLowerCase()

  if (lowerName.endsWith(".dcm")) {
    return "DICOM"
  } else if (lowerName.endsWith(".nii.gz")) {
    return "NIfTI Compressed"
  } else if (lowerName.endsWith(".nii")) {
    return "NIfTI"
  }

  return "Medical Image"
}

/**
 * Validate medical image file
 * @param {Object} file - Multer file object
 * @returns {Object} - Validation result
 */
function validateMedicalImageFile(file) {
  const errors = []

  // Check file extension
  if (!isValidFileExtension(file.originalname)) {
    errors.push("Invalid file format. Only .dcm, .nii, and .nii.gz files are allowed.")
  }

  // Check file size
  if (!isValidFileSize(file.size)) {
    errors.push(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`)
  }

  // Check if file exists
  if (!file) {
    errors.push("No file provided.")
  }

  return {
    isValid: errors.length === 0,
    errors,
    fileType: getFileType(file.originalname),
  }
}

/**
 * Generate safe filename
 * @param {string} originalName - Original filename
 * @returns {string} - Safe filename
 */
function generateSafeFilename(originalName) {
  const timestamp = Date.now()
  const random = Math.round(Math.random() * 1e9)
  const ext = path.extname(originalName)
  const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9]/g, "_")

  return `${baseName}_${timestamp}_${random}${ext}`
}

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

module.exports = {
  isValidFileExtension,
  isValidFileSize,
  getFileType,
  validateMedicalImageFile,
  generateSafeFilename,
  formatFileSize,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
}
