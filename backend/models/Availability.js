const mongoose = require("mongoose");

const availabilitySchema = new mongoose.Schema(
  {
    drive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Drive",
      required: true,
    },
    ownerType: {
      type: String,
      enum: ["candidate", "interviewer", "room"],
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "ownerModel",
    },
    ownerModel: {
      type: String,
      required: true,
      enum: ["User", "Room"],
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

availabilitySchema.pre("validate", function () {
  if (this.startTime && this.endTime && this.endTime <= this.startTime) {
    this.invalidate("endTime", "End time must be later than start time.");
  }
});

availabilitySchema.index({ drive: 1, ownerType: 1, ownerId: 1 });
availabilitySchema.index({ drive: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model("Availability", availabilitySchema);
