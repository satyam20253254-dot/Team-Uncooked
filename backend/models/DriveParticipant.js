const mongoose = require("mongoose");

const driveParticipantSchema = new mongoose.Schema(
  {
    drive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Drive",
      required: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    participantRole: {
      type: String,
      enum: ["candidate", "interviewer"],
      required: true
    },
    status: {
      type: String,
      enum: ["active", "withdrawn"],
      default: "active"
    }
  },
  { timestamps: true }
);

driveParticipantSchema.index(
  { drive: 1, user: 1, participantRole: 1 },
  { unique: true }
);

module.exports = mongoose.model("DriveParticipant", driveParticipantSchema);
