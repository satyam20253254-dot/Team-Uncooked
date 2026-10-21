const mongoose = require("mongoose");

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
    },
    status: {
      type: String,
      enum: ["draft", "published", "superseded", "cancelled"],
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
  },
  { timestamps: true }
);

scheduleVersionSchema.index({ drive: 1, versionNumber: 1 }, { unique: true });
scheduleVersionSchema.index({ drive: 1, status: 1 });

module.exports = mongoose.model("ScheduleVersion", scheduleVersionSchema);
