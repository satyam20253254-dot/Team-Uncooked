
import mongoose from "mongoose";

import { Drive } from "../models/Drive.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Create a new placement drive
export const createDrive = asyncHandler(async (req, res) => {
  const {
    name,
    companyName,
    startDate,
    endDate,
    dailyStartTime,
    dailyEndTime,
    timeZone = "Asia/Kolkata",
  } = req.body;

  // Validate required fields
  if (
    !name?.trim() ||
    !companyName?.trim() ||
    !startDate ||
    !endDate ||
    !dailyStartTime ||
    !dailyEndTime
  ) {
    throw new ApiError(
      400,
      "Name, company name, start date, end date, daily start time, and daily end time are required"
    );
  }

  if (!req.user?._id) {
    throw new ApiError(401, "Authentication required");
  }

  // Validate date values
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    throw new ApiError(400, "Invalid start date or end date");
  }

  if (end < start) {
    throw new ApiError(
      400,
      "End date must be on or after the start date"
    );
  }

  // Validate daily time range (HH:mm, 24-hour format)
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

  if (
    !timePattern.test(dailyStartTime) ||
    !timePattern.test(dailyEndTime)
  ) {
    throw new ApiError(
      400,
      "Daily start and end times must use HH:mm format"
    );
  }

  if (dailyEndTime <= dailyStartTime) {
    throw new ApiError(
      400,
      "Daily end time must be later than daily start time"
    );
  }

  const drive = await Drive.create({
    name: name.trim(),
    companyName: companyName.trim(),
    startDate: start,
    endDate: end,
    dailyStartTime,
    dailyEndTime,
    timeZone,
    createdBy: req.user._id,
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      drive,
      "Placement drive created successfully"
    )
  );
});

// Get all placement drives
export const getAllDrives = asyncHandler(async (req, res) => {
  const drives = await Drive.find()
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        count: drives.length,
        drives,
      },
      "Placement drives fetched successfully"
    )
  );
});

// Get a single drive by ID
export const getDriveById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "Invalid drive ID");
  }

  const drive = await Drive.findById(id).populate("createdBy", "name email");

  if (!drive) {
    throw new ApiError(404, "Drive not found");
  }

  return res.status(200).json(
    new ApiResponse(200, drive, "Drive fetched successfully")
  );
});

// Update an existing placement drive
export const updateDrive = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    companyName,
    startDate,
    endDate,
    dailyStartTime,
    dailyEndTime,
    timeZone,
  } = req.body;

  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "Invalid drive ID");
  }

  const drive = await Drive.findById(id);
  if (!drive) {
    throw new ApiError(404, "Drive not found");
  }

  if (name?.trim()) drive.name = name.trim();
  if (companyName?.trim()) drive.companyName = companyName.trim();
  if (timeZone) drive.timeZone = timeZone;

  if (startDate) {
    const sDate = new Date(startDate);
    if (Number.isNaN(sDate.getTime())) {
      throw new ApiError(400, "Invalid start date");
    }
    drive.startDate = sDate;
  }

  if (endDate) {
    const eDate = new Date(endDate);
    if (Number.isNaN(eDate.getTime())) {
      throw new ApiError(400, "Invalid end date");
    }
    drive.endDate = eDate;
  }

  if (drive.endDate < drive.startDate) {
    throw new ApiError(400, "End date must be on or after start date");
  }

  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (dailyStartTime) {
    if (!timePattern.test(dailyStartTime)) {
      throw new ApiError(400, "Daily start time must use HH:mm format");
    }
    drive.dailyStartTime = dailyStartTime;
  }

  if (dailyEndTime) {
    if (!timePattern.test(dailyEndTime)) {
      throw new ApiError(400, "Daily end time must use HH:mm format");
    }
    drive.dailyEndTime = dailyEndTime;
  }

  if (drive.dailyEndTime <= drive.dailyStartTime) {
    throw new ApiError(400, "Daily end time must be later than daily start time");
  }

  await drive.save();

  return res.status(200).json(
    new ApiResponse(200, drive, "Drive updated successfully")
  );
});

// Update drive status
export const updateDriveStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "Invalid drive ID");
  }

  const validStatuses = ["draft", "configured", "scheduled", "completed", "cancelled"];
  if (!validStatuses.includes(status)) {
    throw new ApiError(
      400,
      `Status must be one of: ${validStatuses.join(", ")}`
    );
  }

  const drive = await Drive.findById(id);
  if (!drive) {
    throw new ApiError(404, "Drive not found");
  }

  drive.status = status;
  await drive.save();

  return res.status(200).json(
    new ApiResponse(200, drive, `Drive status updated to '${status}' successfully`)
  );
});

// Delete a drive (only if draft or cancelled)
export const deleteDrive = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "Invalid drive ID");
  }

  const drive = await Drive.findById(id);
  if (!drive) {
    throw new ApiError(404, "Drive not found");
  }

  if (!["draft", "cancelled"].includes(drive.status)) {
    throw new ApiError(
      400,
      "Cannot delete a drive that is currently configured, scheduled, or completed. Cancel the drive first."
    );
  }

  await Promise.all([
    Drive.findByIdAndDelete(id),
    mongoose.model("DriveParticipant").deleteMany({ driveId: id }),
    mongoose.model("Round").deleteMany({ driveId: id }),
    mongoose.model("Room").deleteMany({ drive: id }),
    mongoose.model("Availability").deleteMany({ drive: id }),
    mongoose.model("ScheduleVersion").deleteMany({ drive: id }),
    mongoose.model("Interview").deleteMany({ drive: id }),
  ]);

  return res.status(200).json(
    new ApiResponse(200, {}, "Drive and associated records deleted successfully")
  );
});
