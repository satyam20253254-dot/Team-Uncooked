const mongoose = require('mongoose');

const driveSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Drive name is required'],
      trim: true,
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
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
      required: [true, 'Daily end time is required'],
      match: [
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        'Please enter daily end time in HH:mm format (e.g., 17:00)',
      ],
    },
    timeZone: {
      type: String,
      default: 'Asia/Kolkata',
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator (Coordinator) ID is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'published', 'completed'],
        message: '{VALUE} is not a valid drive status',
      },
      default: 'draft',
    },
  },
  {
    timestamps: true,
  }
);

// Schema Validation: Ensure endDate is on or after startDate
driveSchema.pre('validate', function (next) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'End date cannot be earlier than start date');
  }
  next();
});

// Indexing for faster filtering by status and dates
driveSchema.index({ status: 1, startDate: 1 });

module.exports = mongoose.model('Drive', driveSchema);