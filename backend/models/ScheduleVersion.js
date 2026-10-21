const mongoose = require('mongoose');

const scheduleVersionSchema = new mongoose.Schema(
  {
    driveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Drive',
      required: [true, 'Drive ID is required'],
    },
    versionNumber: {
      type: Number,
      required: [true, 'Version number is required'],
      min: [1, 'Version number must be at least 1'],
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'published', 'superseded'],
        message: '{VALUE} is not a valid schedule status',
      },
      default: 'draft',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator (Coordinator) ID is required'],
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Index: Ek hi drive ke andar same version number duplicate na ho
scheduleVersionSchema.index({ driveId: 1, versionNumber: 1 }, { unique: true });

// Query Index: Fast retrieval of currently published or draft version
scheduleVersionSchema.index({ driveId: 1, status: 1 });

module.exports = mongoose.model('ScheduleVersion', scheduleVersionSchema);