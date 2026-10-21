const mongoose = require('mongoose');

const roundSchema = new mongoose.Schema(
  {
    driveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Drive',
      required: [true, 'Drive ID is required'],
    },
    name: {
      type: String,
      required: [true, 'Round name is required'],
      trim: true,
    },
    sequence: {
      type: Number,
      required: [true, 'Round sequence number is required'],
      min: [1, 'Sequence must be at least 1'],
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Round duration in minutes is required'],
      min: [15, 'Interview duration must be at least 15 minutes'],
    },
    prerequisiteRoundIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Round',
      },
    ],
    isRequired: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Index: Same drive ke andar duplicate sequence number block karein
roundSchema.index({ driveId: 1, sequence: 1 }, { unique: true });

// Query Index: Single drive ke saare rounds sequence order mein fetch karne ke liye
roundSchema.index({ driveId: 1, sequence: 1 });

module.exports = mongoose.model('Round', roundSchema);