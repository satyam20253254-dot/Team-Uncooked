const mongoose = require("mongoose");

const driveSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return !this.startDate || value >= this.startDate;
        },
        message: "endDate must be on or after startDate"
      }
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "in_progress", "completed", "cancelled"],
      default: "draft"
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Drive", driveSchema);
