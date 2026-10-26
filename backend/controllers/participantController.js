
import mongoose from "mongoose";
import { DriveParticipant } from "../models/DriveParticipant.model.js";
import { User } from "../models/User.model.js";
import { Drive } from "../models/Drive.model.js";
import { Interview } from "../models/Interview.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Add a participant (candidate or interviewer) to a drive
export const addParticipant = asyncHandler(async (req, res) => {
  const { driveId } = req.params;
  const { userId, role, eligibleRoundIds, metadata } = req.body;

  // Validate IDs
  if (!mongoose.isValidObjectId(driveId)) {
    throw new ApiError(400, "Invalid drive ID");
  }

  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  // Validate participant role
  const allowedRoles = ["candidate", "interviewer"];

  if (!allowedRoles.includes(role)) {
    throw new ApiError(
      400,
      `Role must be one of: ${allowedRoles.join(", ")}`
    );
  }

  // Verify drive exists
  const drive = await Drive.findById(driveId);

  if (!drive) {
    throw new ApiError(404, "Drive not found");
  }

  // Verify user exists and check role alignment
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Ensure user's account role matches the drive participant role
  if (user.role !== role && user.role !== "admin") {
    throw new ApiError(
      400,
      `User account role is '${user.role}', but you are trying to add them as '${role}'`
    );
  }

  if (Array.isArray(eligibleRoundIds) && eligibleRoundIds.length > 0) {
    const allValid = eligibleRoundIds.every((id) => mongoose.isValidObjectId(id));
    if (!allValid) {
      throw new ApiError(400, "One or more eligibleRoundIds are invalid ObjectIds");
    }
  }

  // Create participant
  let participant;

  try {
    participant = await DriveParticipant.create({
      driveId,
      userId,
      role,
      eligibleRoundIds: Array.isArray(eligibleRoundIds) ? eligibleRoundIds : [],
      metadata,
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(
        409,
        "User is already a participant in this drive"
      );
    }

    throw error;
  }

  return res.status(201).json(
    new ApiResponse(
      201,
      participant,
      "Participant added to drive successfully"
    )
  );
});

// Get all participants of a specific drive
export const getDriveParticipants = asyncHandler(async (req, res) => {
  const { driveId } = req.params;
  const { role } = req.query;

  // Validate drive ID
  if (!mongoose.isValidObjectId(driveId)) {
    throw new ApiError(400, "Invalid drive ID");
  }

  // Validate optional role filter
  const allowedRoles = ["candidate", "interviewer"];

  if (role && !allowedRoles.includes(role)) {
    throw new ApiError(
      400,
      `Role must be one of: ${allowedRoles.join(", ")}`
    );
  }

  // Verify drive exists
  const drive = await Drive.findById(driveId);

  if (!drive) {
    throw new ApiError(404, "Drive not found");
  }

  // Build query
  const query = { driveId };

  if (role) {
    query.role = role;
  }

  const participants = await DriveParticipant.find(query)
    .populate("userId", "name email role")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        count: participants.length,
        participants,
      },
      "Drive participants fetched successfully"
    )
  );
});

// Update participant status, eligible rounds, or metadata
export const updateParticipantStatus = asyncHandler(async (req, res) => {
  const { driveId, participantId } = req.params;
  const { status, eligibleRoundIds, metadata } = req.body;

  if (
    !mongoose.isValidObjectId(driveId) ||
    !mongoose.isValidObjectId(participantId)
  ) {
    throw new ApiError(400, "Invalid drive or participant ID");
  }

  const participant = await DriveParticipant.findOne({
    _id: participantId,
    driveId,
  });

  if (!participant) {
    throw new ApiError(404, "Participant not found in this drive");
  }

  if (status) {
    const validStatuses = ["active", "withdrawn", "disqualified"];
    if (!validStatuses.includes(status)) {
      throw new ApiError(
        400,
        `Status must be one of: ${validStatuses.join(", ")}`
      );
    }
    participant.status = status;
  }

  if (Array.isArray(eligibleRoundIds)) {
    const allValid = eligibleRoundIds.every((id) => mongoose.isValidObjectId(id));
    if (!allValid) {
      throw new ApiError(400, "One or more eligibleRoundIds are invalid ObjectIds");
    }
    participant.eligibleRoundIds = eligibleRoundIds;
  }

  if (metadata && typeof metadata === "object") {
    participant.metadata = {
      ...(participant.metadata || {}),
      ...metadata,
    };
    participant.markModified("metadata");
  }

  await participant.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      participant,
      "Participant status updated successfully"
    )
  );
});

// Remove participant from a drive
export const removeParticipant = asyncHandler(async (req, res) => {
  const { driveId, participantId } = req.params;

  if (
    !mongoose.isValidObjectId(driveId) ||
    !mongoose.isValidObjectId(participantId)
  ) {
    throw new ApiError(400, "Invalid drive or participant ID");
  }

  const participant = await DriveParticipant.findOne({
    _id: participantId,
    driveId,
  });

  if (!participant) {
    throw new ApiError(404, "Participant not found in this drive");
  }

  const hasInterviews = await Interview.exists({
    drive: driveId,
    $or: [{ candidate: participant.userId }, { interviewer: participant.userId }],
    status: { $in: ["scheduled", "rescheduled"] },
  });

  if (hasInterviews) {
    throw new ApiError(
      400,
      "Cannot remove participant with active scheduled or pending rescheduled interviews. Please resolve or cancel the interviews first, or update participant status to 'withdrawn'."
    );
  }

  await DriveParticipant.findByIdAndDelete(participantId);

  return res.status(200).json(
    new ApiResponse(200, {}, "Participant removed from drive successfully")
  );
});
