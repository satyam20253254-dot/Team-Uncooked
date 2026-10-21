const mongoose = require("mongoose");

const driveParticipantSchema = new mongoose.Schema(
  {
    drive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Drive",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["candidate", "interviewer"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "withdrawn", "disqualified"],
      default: "active",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
  },
  { timestamps: true }
);

driveParticipantSchema.index({ drive: 1, user: 1 }, { unique: true });
driveParticipantSchema.index({ drive: 1, role: 1, status: 1 });

module.exports = mongoose.model("DriveParticipant", driveParticipantSchema);
