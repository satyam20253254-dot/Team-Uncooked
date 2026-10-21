const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema(
  {
    driveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Drive',
      required: [true, 'Drive ID is required'],
    },
    resourceType: {
      type: String,
      enum: {
        values: ['candidate', 'interviewer', 'room'],
        message: '{VALUE} is not a valid resource type',
      },
      required: [true, 'Resource type is required'],
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Resource ID is required'],
      // Points to User ID (if candidate/interviewer) or Room ID (if room)
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Schema Validation: Ensure endTime is after startTime
availabilitySchema.pre('validate', function (next) {
  if (this.startTime && this.endTime && this.endTime <= this.startTime) {
    this.invalidate('endTime', 'End time must be after start time');
  }
  next();
});

// Query Index: Fast lookup during overlap check and scheduling calculations
availabilitySchema.index({ driveId: 1, resourceType: 1, resourceId: 1 });

module.exports = mongoose.model('Availability', availabilitySchema);