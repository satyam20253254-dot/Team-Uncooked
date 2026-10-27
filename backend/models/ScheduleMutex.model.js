import mongoose from "mongoose";

const scheduleMutexSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    revision: {
      type: Number,
      default: 0,
    },
    lockedBy: {
      type: String,
      default: null,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

export const ScheduleMutex = mongoose.model("ScheduleMutex", scheduleMutexSchema);
