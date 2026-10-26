import mongoose from "mongoose";

const evaluationSchema = new mongoose.Schema(
  {
    interview: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Interview",
      required: true,
      unique: true,
    },

    interviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    rating: {
      type: Number,
      required: true,
      min: [1, "Rating must be at least 1"],
      max: [10, "Rating cannot exceed 10"],
      validate: {
        validator: Number.isInteger,
        message: "Rating must be a whole number",
      },
    },

    feedback: {
      type: String,
      trim: true,
      default: "",
    },

    recommendation: {
      type: String,
      enum: ["hire", "reject", "hold", "next_round"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Evaluation = mongoose.model(
  "Evaluation",
  evaluationSchema
);