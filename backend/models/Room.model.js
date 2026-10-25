import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    drive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Drive",
      required: true,
    },

    name: {
      type: String,
      required: [true, "Room name is required"],
      trim: true,
      maxlength: 100,
    },

    capacity: {
      type: Number,
      required: true,
      min: [1, "Room capacity must be at least 1"],
      default: 1,
      validate: {
        validator: Number.isInteger,
        message: "Room capacity must be a whole number",
      },
    },

    isVirtual: {
      type: Boolean,
      default: false,
    },

    meetingLink: {
      type: String,
      trim: true,
      default: "",
    },

    location: {
      type: String,
      trim: true,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Room names must be unique within each drive.
roomSchema.index(
  { drive: 1, name: 1 },
  { unique: true }
);

export const Room = mongoose.model("Room", roomSchema);