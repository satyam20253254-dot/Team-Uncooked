const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema(
  {
    drive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Drive",
      required: true,
    },
    scheduleVersion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScheduleVersion",
      required: true,
    },
    round: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Round",
      required: true,
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    interviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "rescheduled"],
      default: "scheduled",
    },
    unassignedReason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

interviewSchema.pre("validate", function () {
  if (this.startTime && this.endTime && this.endTime <= this.startTime) {
    this.invalidate("endTime", "End time must be later than start time.");
  }
});

interviewSchema.index({ drive: 1, scheduleVersion: 1, candidate: 1 });
interviewSchema.index({ drive: 1, scheduleVersion: 1, interviewer: 1 });
interviewSchema.index({ drive: 1, scheduleVersion: 1, room: 1 });

module.exports = mongoose.model("Interview", interviewSchema);
