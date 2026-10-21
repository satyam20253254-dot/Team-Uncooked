const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema(
  {
    driveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Drive',
      required: [true, 'Drive ID is required'],
    },
    scheduleVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScheduleVersion',
      required: [true, 'Schedule version ID is required'],
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Candidate ID is required'],
    },
    roundId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Round',
      required: [true, 'Round ID is required'],
    },
    interviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Interviewer ID is required'],
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room ID is required'],
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['scheduled', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid interview status',
      },
      default: 'scheduled',
    },
    assignmentSource: {
      type: String,
      enum: {
        values: ['automatic', 'manual'],
        message: '{VALUE} is not a valid assignment source',
      },
      default: 'automatic',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-validation Hook: Ensure endTime is strictly after startTime
interviewSchema.pre('validate', function (next) {
  if (this.startTime && this.endTime && this.endTime <= this.startTime) {
    this.invalidate('endTime', 'End time must be strictly after start time');
  }
  next();
});

// Compound Indexing for fast overlap checking and dashboard filtering
// 1. Candidate overlap check
interviewSchema.index({ scheduleVersionId: 1, candidateId: 1, startTime: 1, endTime: 1 });

// 2. Interviewer overlap check
interviewSchema.index({ scheduleVersionId: 1, interviewerId: 1, startTime: 1, endTime: 1 });

// 3. Room overlap check
interviewSchema.index({ scheduleVersionId: 1, roomId: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model('Interview', interviewSchema);