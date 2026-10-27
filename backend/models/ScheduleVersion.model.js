import mongoose from "mongoose";

const scheduleVersionSchema = new mongoose.Schema(
  {
    drive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Drive",
      required: true,
    },

    versionNumber: {
      type: Number,
      required: true,
      min: [1, "Version number must be at least 1"],
      validate: {
        validator: Number.isInteger,
        message: "Version number must be a whole number",
      },
    },

    status: {
      type: String,
      enum: ["draft", "published", "superseded", "cancelled"],
      required: true,
      default: "draft",
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    changeSummary: {
      type: String,
      trim: true,
      default: "",
    },

    unassignedInterviews: [
      {
        candidateId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        candidateName: { type: String, trim: true, default: "Candidate" },
        roundId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Round",
          required: true,
        },
        roundName: { type: String, trim: true, default: "Interview round" },
        reason: { type: String, trim: true, required: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate version numbers within the same drive.
scheduleVersionSchema.index(
  { drive: 1, versionNumber: 1 },
  { unique: true }
);

// Helps retrieve versions by drive and status.
scheduleVersionSchema.index({
  drive: 1,
  status: 1,
});

export const ScheduleVersion = mongoose.model(
  "ScheduleVersion",
  scheduleVersionSchema
);
