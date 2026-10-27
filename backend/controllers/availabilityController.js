
import mongoose from "mongoose";

import { Availability } from "../models/Availability.model.js";
import { Drive } from "../models/Drive.model.js";
import { Room } from "../models/Room.model.js";
import { DriveParticipant } from "../models/DriveParticipant.model.js";
import { Round } from "../models/Round.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Add availability time window
export const setAvailability = asyncHandler(async (req, res) => {
  const { driveId } = req.params;
  const { ownerType, ownerId, startTime, endTime } = req.body;

  // Validate required fields
  if (!driveId || !ownerType || !startTime || !endTime) {
    throw new ApiError(
      400,
      "Drive ID, owner type, start time, and end time are required"
    );
  }

  if (!mongoose.isValidObjectId(driveId)) {
    throw new ApiError(400, "Invalid drive ID");
  }

  if (!["candidate", "interviewer", "room"].includes(ownerType)) {
    throw new ApiError(400, "Invalid owner type");
  }

  // Validate dates
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    throw new ApiError(400, "Invalid start or end time");
  }

  if (end <= start) {
    throw new ApiError(
      400,
      "End time must be later than start time"
    );
  }

  if (start <= new Date()) {
    throw new ApiError(400, "Availability must start in the future");
  }

  // Ensure the user is authenticated
  if (!req.user?._id) {
    throw new ApiError(401, "Authentication required");
  }

  // Verify drive exists
  const drive = await Drive.findById(driveId);
  if (!drive) {
    throw new ApiError(404, "Drive not found");
  }

  let actualOwnerId;
  let ownerModel;

  if (ownerType === "room") {
    // Only coordinators and admins can set room availability
    if (!["admin", "coordinator"].includes(req.user.role)) {
      throw new ApiError(
        403,
        "Only admins and coordinators can set room availability"
      );
    }

    // Room availability requires an explicitly supplied room ID belonging to this drive
    if (!ownerId || !mongoose.isValidObjectId(ownerId)) {
      throw new ApiError(400, "A valid room ID is required");
    }

    const room = await Room.findOne({ _id: ownerId, drive: driveId });
    if (!room) {
      throw new ApiError(404, "Room not found for this drive");
    }

    actualOwnerId = ownerId;
    ownerModel = "Room";
  } else {
    // Candidates and interviewers can only set their own availability unless coordinator/admin
    if (
      !["admin", "coordinator"].includes(req.user.role) &&
      ownerType !== req.user.role
    ) {
      throw new ApiError(403, "You can only set availability for your own role");
    }

    if (
      ownerId &&
      String(ownerId) !== String(req.user._id) &&
      !["admin", "coordinator"].includes(req.user.role)
    ) {
      throw new ApiError(
        403,
        "You cannot set availability for another user"
      );
    }

    actualOwnerId = ownerId && ["admin", "coordinator"].includes(req.user.role) ? ownerId : req.user._id;
    ownerModel = "User";

    // Verify user is an active participant in this drive, or auto-enroll them
    let isParticipant = await DriveParticipant.exists({
      driveId,
      userId: actualOwnerId,
      role: ownerType,
      status: "active",
    });

    if (!isParticipant) {
      try {
        const rounds = await Round.find({ driveId }).sort({ sequence: 1 });
        await DriveParticipant.create({
          driveId,
          userId: actualOwnerId,
          role: ownerType,
          status: "active",
          eligibleRoundIds: ownerType === "candidate" ? rounds.map((r) => r._id) : [],
          metadata: {
            department: ownerType === "interviewer" ? "Engineering & Tech" : "Computer Science",
            skills: ownerType === "interviewer" ? ["DSA", "React", "Node.js", "System Design"] : ["DSA", "React"],
            maxDailyInterviews: 4,
            registeredAt: new Date().toISOString(),
          },
        });
        isParticipant = true;
      } catch (enrollErr) {
        console.warn("Participant auto-enroll on availability notice:", enrollErr.message);
      }
    }
  }

  // Prevent duplicate or overlapping availability for the same owner in this drive
  const overlap = await Availability.findOne({
    drive: driveId,
    ownerType,
    ownerId: actualOwnerId,
    startTime: { $lt: end },
    endTime: { $gt: start },
  });

  if (overlap) {
    throw new ApiError(
      409,
      "An overlapping availability window already exists for this owner"
    );
  }

  const availability = await Availability.create({
    drive: driveId,
    ownerType,
    ownerId: actualOwnerId,
    ownerModel,
    startTime: start,
    endTime: end,
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      availability,
      "Availability added successfully"
    )
  );
});

// Get all availabilities for a drive, with optional filters
export const getDriveAvailabilities = asyncHandler(
  async (req, res) => {
    const { driveId } = req.params;
    const { ownerType, ownerId } = req.query;

    if (!driveId || !mongoose.isValidObjectId(driveId)) {
      throw new ApiError(400, "Invalid drive ID");
    }

    const query = { drive: driveId };
    const isStaff = ["admin", "coordinator"].includes(req.user?.role);

    if (!isStaff) {
      if (!["candidate", "interviewer"].includes(req.user?.role)) {
        throw new ApiError(403, "You are not authorized to view availability");
      }
      query.ownerType = req.user.role;
      query.ownerId = req.user._id;
    }

    if (ownerType) {
      if (!["candidate", "interviewer", "room"].includes(ownerType)) {
        throw new ApiError(400, "Invalid owner type");
      }

      if (isStaff) query.ownerType = ownerType;
    }

    if (ownerId) {
      if (!mongoose.isValidObjectId(ownerId)) {
        throw new ApiError(400, "Invalid owner ID");
      }

      if (isStaff) query.ownerId = ownerId;
    }

    const availabilities = await Availability.find(query)
      .populate("ownerId", "name email location meetingLink isVirtual")
      .sort({ startTime: 1 });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          count: availabilities.length,
          availabilities,
        },
        "Availabilities fetched successfully"
      )
    );
  }
);

// Delete an availability window
export const deleteAvailability = asyncHandler(async (req, res) => {
  const { driveId, availabilityId } = req.params;

  if (
    !mongoose.isValidObjectId(driveId) ||
    !mongoose.isValidObjectId(availabilityId)
  ) {
    throw new ApiError(400, "Invalid drive or availability ID");
  }

  const availability = await Availability.findOne({
    _id: availabilityId,
    drive: driveId,
  });

  if (!availability) {
    throw new ApiError(404, "Availability not found");
  }

  // Access check: only owner or admin/coordinator can delete
  const isStaff = ["admin", "coordinator"].includes(req.user.role);
  const isOwner =
    availability.ownerId.toString() === req.user._id.toString();

  if (!isStaff && !isOwner) {
    throw new ApiError(
      403,
      "You are not authorized to delete this availability window"
    );
  }

  await Availability.findByIdAndDelete(availabilityId);

  return res.status(200).json(
    new ApiResponse(200, {}, "Availability window deleted successfully")
  );
});
