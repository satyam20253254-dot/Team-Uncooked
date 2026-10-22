const mongoose = require('mongoose');

const driveSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Drive name is required'],
      trim: true,
      maxlength: 150,
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      default: "",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    dailyStartTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    dailyEndTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    timeZone: {
      type: String,
      required: true,
      default: "Asia/Kolkata",
    },
    dailyStartTime: {
      type: String,
      required: [true, 'Daily start time is required'],
      match: [
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        'Please enter daily start time in HH:mm format (e.g., 09:00)',
      ],
    },
    dailyEndTime: {
      type: String,
      enum: ["draft", "configured", "scheduled", "completed", "cancelled"],
      default: "draft",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

driveSchema.pre("validate", function () {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    this.invalidate("endDate", "End date must be on or after start date.");
  }
  if (this.dailyStartTime && this.dailyEndTime && this.dailyEndTime <= this.dailyStartTime) {
    this.invalidate("dailyEndTime", "End time must be later than start time.");
  }
});

module.exports = mongoose.model("Drive", driveSchema);
