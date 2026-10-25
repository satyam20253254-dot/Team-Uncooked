import mongoose from "mongoose";

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
      default: null,
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
      required: true,
      default: "scheduled",
    },

    unassignedReason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Ensure an interview ends after it starts.
interviewSchema.pre("validate", function () {
  if (
    this.startTime &&
    this.endTime &&
    this.endTime <= this.startTime
  ) {
    this.invalidate(
      "endTime",
      "End time must be later than start time."
    );
  }
});

// Indexes for retrieving interviews by participant or room.
interviewSchema.index({
  drive: 1,
  scheduleVersion: 1,
  candidate: 1,
});

interviewSchema.index({
  drive: 1,
  scheduleVersion: 1,
  interviewer: 1,
});

interviewSchema.index({
  drive: 1,
  scheduleVersion: 1,
  room: 1,
});

// Compound index for fast collision checking during constraint matching & self-booking
interviewSchema.index({
  drive: 1,
  status: 1,
  startTime: 1,
  endTime: 1,
});

// Fast lookup for schedule publishing and listing
interviewSchema.index({
  scheduleVersion: 1,
  status: 1,
});

export const Interview = mongoose.model("Interview", interviewSchema);