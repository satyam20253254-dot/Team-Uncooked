const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    driveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Drive',
      required: [true, 'Drive ID is required'],
    },
    name: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true,
    },
    capacity: {
      type: Number,
      default: 1,
      min: [1, 'Capacity must be at least 1'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Index: Same drive ke andar identical room name block karein
roomSchema.index({ driveId: 1, name: 1 }, { unique: true });

// Index for fetching active rooms for a drive
roomSchema.index({ driveId: 1, isActive: 1 });

module.exports = mongoose.model('Room', roomSchema);