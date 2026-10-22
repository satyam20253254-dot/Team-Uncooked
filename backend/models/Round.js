const mongoose = require("mongoose");

const roundSchema = new mongoose.Schema(
  {
    drive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Drive",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    sequenceOrder: {
      type: Number,
      required: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 5,
    },
    prerequisiteRound: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Round",
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

roundSchema.index({ drive: 1, sequenceOrder: 1 }, { unique: true });

module.exports = mongoose.model("Round", roundSchema);
