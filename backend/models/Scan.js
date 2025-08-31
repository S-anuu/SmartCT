const mongoose = require("mongoose");

const scanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    fileName: {
      type: String,
      required: [true, "File name is required"],
      trim: true,
      maxlength: [255, "File name cannot exceed 255 characters"],
    },
    originalName: {
      type: String,
      required: [true, "Original file name is required"],
      trim: true,
      maxlength: [255, "Original file name cannot exceed 255 characters"],
    },
    filePath: {
      type: String,
      required: [true, "File path is required"],
      trim: true,
    },
    fileSize: {
      type: Number,
      required: [true, "File size is required"],
      min: [0, "File size cannot be negative"],
      max: [500 * 1024 * 1024, "File size cannot exceed 500MB"], // 500MB limit
    },
    fileType: {
      type: String,
      required: [true, "File type is required"],
      enum: {
        values: ["dicom", "nifti", "dicom_zip", "other"],
        message: "Invalid file type. Must be dicom, nifti, dicom_zip, or other",
      },
    },
    scanner: {
      type: String,
      default: "Unknown Scanner",
      trim: true,
      maxlength: [100, "Scanner name cannot exceed 100 characters"],
    },
    scanType: {
      type: String,
      enum: ["CT", "MRI", "X-Ray", "Ultrasound"],
      default: "CT",
    },
    bodyPart: {
      type: String,
      enum: ["Abdomen", "Chest", "Head", "Pelvis", "Extremities"],
      default: "Abdomen",
    },
    contrast: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: {
        values: ["Uploaded", "Queued", "Processing", "Completed", "Failed"],
        message: "Invalid status value",
      },
      default: "Uploaded",
      index: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Normal", "High", "Emergency"],
      default: "Normal",
    },
    processingStarted: {
      type: Date,
    },
    processingCompleted: {
      type: Date,
    },
    processingTime: {
      type: Number, // in milliseconds
      min: [0, "Processing time cannot be negative"],
    },
    error: {
      message: String,
      stack: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
    results: {
      overallRisk: {
        type: String,
        enum: ["Low Risk", "Moderate Risk", "High Risk"],
      },
      confidence: {
        type: Number,
        min: [0, "Confidence cannot be less than 0"],
        max: [100, "Confidence cannot exceed 100"],
        set: v => Math.round(v), // Always round to integer
      },
      findings: {
        bowel: {
          status: {
            type: String,
            enum: ["Normal", "Abnormal", "Not Analyzed"],
            default: "Not Analyzed",
          },
          confidence: {
            type: Number,
            min: 0,
            max: 100,
            set: v => Math.round(v),
          },
          severity: {
            type: String,
            enum: ["normal", "low", "moderate", "high"],
            default: "normal",
          },
          details: {
            type: String,
            trim: true,
            maxlength: [1000, "Details cannot exceed 1000 characters"],
          },
        },
        extravasation: {
          status: {
            type: String,
            enum: ["Normal", "Abnormal", "Not Analyzed"],
            default: "Not Analyzed",
          },
          confidence: {
            type: Number,
            min: 0,
            max: 100,
            set: v => Math.round(v),
          },
          severity: {
            type: String,
            enum: ["normal", "low", "moderate", "high"],
            default: "normal",
          },
          details: {
            type: String,
            trim: true,
            maxlength: [1000, "Details cannot exceed 1000 characters"],
          },
        },
        liver: {
          status: {
            type: String,
            enum: ["Normal", "Abnormal", "Not Analyzed"],
            default: "Not Analyzed",
          },
          confidence: {
            type: Number,
            min: 0,
            max: 100,
            set: v => Math.round(v),
          },
          severity: {
            type: String,
            enum: ["normal", "low", "moderate", "high"],
            default: "normal",
          },
          details: {
            type: String,
            trim: true,
            maxlength: [1000, "Details cannot exceed 1000 characters"],
          },
        },
        kidney: {
          status: {
            type: String,
            enum: ["Normal", "Abnormal", "Not Analyzed"],
            default: "Not Analyzed",
          },
          confidence: {
            type: Number,
            min: 0,
            max: 100,
            set: v => Math.round(v),
          },
          severity: {
            type: String,
            enum: ["normal", "low", "moderate", "high"],
            default: "normal",
          },
          details: {
            type: String,
            trim: true,
            maxlength: [1000, "Details cannot exceed 1000 characters"],
          },
        },
        spleen: {
          status: {
            type: String,
            enum: ["Normal", "Abnormal", "Not Analyzed"],
            default: "Not Analyzed",
          },
          confidence: {
            type: Number,
            min: 0,
            max: 100,
            set: v => Math.round(v),
          },
          severity: {
            type: String,
            enum: ["normal", "low", "moderate", "high"],
            default: "normal",
          },
          details: {
            type: String,
            trim: true,
            maxlength: [1000, "Details cannot exceed 1000 characters"],
          },
        },
      },
      recommendations: {
        type: [String],
        default: [
          "Follow up with specialist",
          "Consider additional imaging if clinically indicated",
        ],
        validate: {
          validator: function(v) {
            return v.length <= 10; // Maximum 10 recommendations
          },
          message: "Cannot have more than 10 recommendations",
        },
      },
      technicalDetails: {
        modelVersion: {
          type: String,
          trim: true,
          maxlength: [50, "Model version cannot exceed 50 characters"],
        },
        processingNode: {
          type: String,
          trim: true,
          maxlength: [50, "Processing node cannot exceed 50 characters"],
        },
        algorithmUsed: {
          type: String,
          trim: true,
          maxlength: [100, "Algorithm name cannot exceed 100 characters"],
        },
        qualityScore: {
          type: Number,
          min: 0,
          max: 100,
          set: v => Math.round(v),
        },
        processingTimeMs: Number, // Duplicate for easy querying
      },
    },
    metadata: {
      patientAge: {
        type: Number,
        min: [0, "Age cannot be negative"],
        max: [120, "Age cannot exceed 120"],
      },
      patientGender: {
        type: String,
        enum: ["Male", "Female", "Other", "Unknown"],
        default: "Unknown",
      },
      clinicalHistory: {
        type: String,
        trim: true,
        maxlength: [2000, "Clinical history cannot exceed 2000 characters"],
      },
      urgency: {
        type: String,
        enum: ["Routine", "Urgent", "Emergency"],
        default: "Routine",
      },
      referringPhysician: {
        type: String,
        trim: true,
        maxlength: [100, "Physician name cannot exceed 100 characters"],
      },
      studyDate: {
        type: Date,
        validate: {
          validator: function(v) {
            return v <= new Date();
          },
          message: "Study date cannot be in the future",
        },
      },
      acquisitionParameters: {
        sliceThickness: {
          type: Number,
          min: [0.1, "Slice thickness must be at least 0.1mm"],
          max: [10, "Slice thickness cannot exceed 10mm"],
        },
        kvp: {
          type: Number,
          min: [80, "kVp must be at least 80"],
          max: [140, "kVp cannot exceed 140"],
        },
        mas: {
          type: Number,
          min: [10, "mAs must be at least 10"],
          max: [500, "mAs cannot exceed 500"],
        },
        reconstructionKernel: {
          type: String,
          trim: true,
          maxlength: [50, "Kernel name cannot exceed 50 characters"],
        },
      },
    },
    qualityControl: {
      imageQuality: {
        type: String,
        enum: ["Excellent", "Good", "Fair", "Poor", "Unacceptable"],
        default: "Good",
      },
      artifacts: {
        type: [String],
        validate: {
          validator: function(v) {
            return v.length <= 10; // Maximum 10 artifacts
          },
          message: "Cannot have more than 10 artifacts",
        },
      },
      technicalIssues: {
        type: [String],
        validate: {
          validator: function(v) {
            return v.length <= 10; // Maximum 10 issues
          },
          message: "Cannot have more than 10 technical issues",
        },
      },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      reviewDate: {
        type: Date,
        validate: {
          validator: function(v) {
            return !v || v <= new Date();
          },
          message: "Review date cannot be in the future",
        },
      },
      approved: {
        type: Boolean,
        default: false,
      },
    },
    annotations: {
      type: [
        {
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          comment: {
            type: String,
            required: true,
            trim: true,
            maxlength: [1000, "Comment cannot exceed 1000 characters"],
          },
          timestamp: {
            type: Date,
            default: Date.now,
          },
          type: {
            type: String,
            enum: ["Note", "Correction", "Question", "Approval"],
            default: "Note",
          },
        },
      ],
      validate: {
        validator: function(v) {
          return v.length <= 50; // Maximum 50 annotations
        },
        message: "Cannot have more than 50 annotations",
      },
    },
    tags: {
      type: [String],
      validate: {
        validator: function(v) {
          return v.length <= 20; // Maximum 20 tags
        },
        message: "Cannot have more than 20 tags",
      },
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      validate: {
        validator: function(v) {
          return !v || v <= new Date();
        },
        message: "Deletion date cannot be in the future",
      },
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        // Convert processingTime to seconds for API responses
        if (ret.processingTime) {
          ret.processingTimeSec = (ret.processingTime / 1000).toFixed(2);
        }
        // Remove sensitive/internal fields
        delete ret.isDeleted;
        delete ret.deletedAt;
        delete ret.deletedBy;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Indexes for optimized queries
scanSchema.index({ userId: 1, status: 1, createdAt: -1 }); // User dashboard view
scanSchema.index({ status: 1, priority: 1, createdAt: -1 }); // Processing queue
scanSchema.index({ "results.overallRisk": 1, createdAt: -1 }); // Risk analysis
scanSchema.index({ "metadata.studyDate": -1 }); // Study date queries
scanSchema.index({ "metadata.referringPhysician": 1 }); // Physician lookup

// Virtuals
scanSchema.virtual("processingDuration").get(function() {
  if (this.processingStarted && this.processingCompleted) {
    return this.processingCompleted - this.processingStarted;
  }
  return null;
});

scanSchema.virtual("processingTimeFormatted").get(function() {
  if (!this.processingTime) return "N/A";
  const seconds = (this.processingTime / 1000).toFixed(2);
  return `${seconds}s`;
});

scanSchema.virtual("fileTypeDisplay").get(function() {
  const ext = this.originalName.split(".").pop().toLowerCase();
  switch (ext) {
    case "dcm":
      return "DICOM";
    case "nii":
      return "NIfTI";
    case "gz":
      return this.originalName.includes(".nii.") ? "NIfTI Compressed" : "Compressed";
    default:
      return "Medical Image";
  }
});

scanSchema.virtual("riskColor").get(function() {
  if (!this.results || !this.results.overallRisk) return "gray";
  switch (this.results.overallRisk) {
    case "Low Risk":
      return "green";
    case "Moderate Risk":
      return "yellow";
    case "High Risk":
      return "red";
    default:
      return "gray";
  }
});

// Pre-save hooks
scanSchema.pre("save", function(next) {
  // Auto-set processing time if status changed to Completed
  if (this.isModified("status") && this.status === "Completed") {
    if (!this.processingCompleted) {
      this.processingCompleted = new Date();
    }
    if (this.processingStarted && !this.processingTime) {
      this.processingTime = this.processingCompleted - this.processingStarted;
    }
  }
  
  // Auto-set processing time if both timestamps exist but no processingTime
  if (this.processingStarted && this.processingCompleted && !this.processingTime) {
    this.processingTime = this.processingCompleted - this.processingStarted;
  }

  next();
});

// Static methods
scanSchema.statics.getAverageProcessingTime = async function(userId = null) {
  const match = { 
    status: "Completed",
    processingTime: { $exists: true, $gt: 0 }
  };
  
  if (userId) {
    match.userId = userId;
  }

  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        averageTimeMs: { $avg: "$processingTime" },
        count: { $sum: 1 },
        minTimeMs: { $min: "$processingTime" },
        maxTimeMs: { $max: "$processingTime" }
      }
    }
  ]);

  return result[0] || {
    averageTimeMs: 0,
    count: 0,
    minTimeMs: 0,
    maxTimeMs: 0
  };
};

scanSchema.statics.getStats = async function(userId = null) {
  const match = userId ? { userId } : {};
  
  const result = await this.aggregate([
    { $match: { ...match, isDeleted: { $ne: true } } },
    {
      $facet: {
        statusCounts: [
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 }
            }
          }
        ],
        riskCounts: [
          {
            $group: {
              _id: "$results.overallRisk",
              count: { $sum: 1 }
            }
          }
        ],
        processingStats: [
          {
            $match: {
              status: "Completed",
              processingTime: { $exists: true, $gt: 0 }
            }
          },
          {
            $group: {
              _id: null,
              avgProcessingTime: { $avg: "$processingTime" },
              totalScans: { $sum: 1 }
            }
          }
        ],
        fileStats: [
          {
            $group: {
              _id: "$fileType",
              count: { $sum: 1 },
              totalSize: { $sum: "$fileSize" }
            }
          }
        ]
      }
    }
  ]);

  return {
    statusCounts: result[0].statusCounts,
    riskCounts: result[0].riskCounts,
    processingStats: result[0].processingStats[0] || { avgProcessingTime: 0, totalScans: 0 },
    fileStats: result[0].fileStats
  };
};

scanSchema.statics.getRecentScans = async function(limit = 10, userId = null) {
  const query = userId ? { userId, isDeleted: { $ne: true } } : { isDeleted: { $ne: true } };
  
  return this.find(query)
    .populate("userId", "firstName lastName email role")
    .populate("deletedBy", "firstName lastName")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Instance methods
scanSchema.methods.softDelete = async function(deletedBy) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

scanSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  return this.save();
};

module.exports = mongoose.model("Scan", scanSchema);