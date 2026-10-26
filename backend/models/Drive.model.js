
import mongoose from "mongoose";

const driveSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Drive name is required"],
            trim: true,
            maxlength: 150
        },

        companyName: {
            type: String,
            required: [true, "Company name is required"],
            trim: true
        },

        startDate: {
            type: Date,
            required: true
        },

        endDate: {
            type: Date,
            required: true
        },

        dailyStartTime: {
            type: String,
            required: [true, "Daily start time is required"],
            match: [
                /^([01]\d|2[0-3]):[0-5]\d$/,
                "Please enter daily start time in HH:mm format (e.g., 09:00)"
            ]
        },

        dailyEndTime: {
            type: String,
            required: [true, "Daily end time is required"],
            match: [
                /^([01]\d|2[0-3]):[0-5]\d$/,
                "Please enter daily end time in HH:mm format (e.g., 17:00)"
            ]
        },

        timeZone: {
            type: String,
            required: true,
            default: "Asia/Kolkata"
        },

        status: {
            type: String,
            enum: [
                "draft",
                "configured",
                "scheduled",
                "completed",
                "cancelled"
            ],
            default: "draft"
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    {
        timestamps: true
    }
);

// Validate date and daily time ranges
driveSchema.pre("validate", function () {
    if (
        this.startDate &&
        this.endDate &&
        this.endDate < this.startDate
    ) {
        this.invalidate(
            "endDate",
            "End date must be on or after start date."
        );
    }

    if (
        this.dailyStartTime &&
        this.dailyEndTime &&
        this.dailyEndTime <= this.dailyStartTime
    ) {
        this.invalidate(
            "dailyEndTime",
            "End time must be later than start time."
        );
    }
});

export const Drive = mongoose.model("Drive", driveSchema);
