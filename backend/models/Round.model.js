import mongoose from "mongoose";

const roundSchema = new mongoose.Schema(
  {
    driveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Drive",
      required: [true, "Drive ID is required"],
    },

    name: {
      type: String,
      required: [true, "Round name is required"],
      trim: true,
    },

    sequence: {
      type: Number,
      required: [true, "Round sequence number is required"],
      min: [1, "Sequence must be at least 1"],
      validate: {
        validator: Number.isInteger,
        message: "Sequence must be a whole number",
      },
    },

    durationMinutes: {
      type: Number,
      required: [true, "Round duration in minutes is required"],
      min: [15, "Interview duration must be at least 15 minutes"],
      validate: {
        validator: Number.isInteger,
        message: "Duration must be a whole number of minutes",
      },
    },

    prerequisiteRound: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Round",
      },
    ],

    isRequired: {
      type: Boolean,
      default: true,
    },

    requiredSkills: [
      {
        type: String,
        trim: true,
      },
    ],

    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate sequence numbers within the same drive.
roundSchema.index(
  { driveId: 1, sequence: 1 },
  { unique: true }
);

export const Round = mongoose.model("Round", roundSchema);