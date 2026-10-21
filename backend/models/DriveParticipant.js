const mongoose = require('mongoose');

const driveParticipantSchema = new mongoose.Schema(
  {
    driveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Drive',
      required: [true, 'Drive ID is required'],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    participantRole: {
      type: String,
      enum: {
        values: ['candidate', 'interviewer'],
        message: '{VALUE} is not a valid participant role',
      },
      required: [true, 'Participant role is required'],
    },
    eligibleRoundIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Round',
      },
    ],
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive'],
        message: '{VALUE} is not a valid status',
      },
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Compound Index: Ek hi drive mein same user multiple times enroll na ho sake
driveParticipantSchema.index({ driveId: 1, userId: 1 }, { unique: true });

// Query Index: Fast retrieval of all participants in a drive by role
driveParticipantSchema.index({ driveId: 1, participantRole: 1 });

module.exports = mongoose.model('DriveParticipant', driveParticipantSchema);