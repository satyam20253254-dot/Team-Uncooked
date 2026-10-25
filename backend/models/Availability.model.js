import mongoose from "mongoose";

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
      enum: ["User", "Room"],
      required: true,
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
  {
    timestamps: true,
  }
);

// Validate that the end time occurs after the start time.
availabilitySchema.pre("validate", function () {
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

  // Ensure the owner type agrees with the referenced model.
  if (
    (this.ownerType === "room" && this.ownerModel !== "Room") ||
    (["candidate", "interviewer"].includes(this.ownerType) &&
      this.ownerModel !== "User")
  ) {
    this.invalidate(
      "ownerModel",
      "Owner model must match the owner type."
    );
  }
});

// Useful for retrieving availability by owner within a drive.
availabilitySchema.index({
  drive: 1,
  ownerType: 1,
  ownerId: 1,
});

// Useful for searching time slots within a drive.
availabilitySchema.index({
  drive: 1,
  startTime: 1,
  endTime: 1,
});

export const Availability = mongoose.model(
  "Availability",
  availabilitySchema
);