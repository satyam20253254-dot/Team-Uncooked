import mongoose from "mongoose";

const driveParticipantSchema = new mongoose.Schema(
  {
    driveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Drive",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    role: {
      type: String,
      enum: ["candidate", "interviewer"],
      required: true,
    },

    eligibleRoundIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Round",
      },
    ],

    status: {
      type: String,
      enum: ["active", "withdrawn", "disqualified"],
      default: "active",
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent the same user from joining the same drive more than once.
driveParticipantSchema.index(
  { driveId: 1, userId: 1 },
  { unique: true }
);

// Useful for querying participants by drive, role, and status.
driveParticipantSchema.index({
  driveId: 1,
  role: 1,
  status: 1,
});

export const DriveParticipant = mongoose.model(
  "DriveParticipant",
  driveParticipantSchema
);