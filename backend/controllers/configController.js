import mongoose from "mongoose";

import { Round } from "../models/Round.model.js";
import { Room } from "../models/Room.model.js";
import { Drive } from "../models/Drive.model.js";
import { Interview } from "../models/Interview.model.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { notifyDriveEvent } from "../utils/notifications.js";

// --- ROUNDS ---

// Create an interview round for a drive
export const createRound = asyncHandler(async (req, res) => {
  const { driveId } = req.params;
  const {
    name,
    sequence,
    durationMinutes,
    prerequisiteRound,
    requiredSkills,
    isRequired,
    description,
  } = req.body;

  if (!mongoose.isValidObjectId(driveId)) {
    throw new ApiError(400, "Invalid drive ID");
  }

  if (!name?.trim() || sequence == null || durationMinutes == null) {
    throw new ApiError(400, "Name, sequence, and duration are required");
  }

  if (!Number.isInteger(Number(sequence)) || Number(sequence) < 1) {
    throw new ApiError(400, "Sequence must be a positive integer");
  }

  if (!Number.isInteger(Number(durationMinutes)) || Number(durationMinutes) < 15) {
    throw new ApiError(400, "Duration must be an integer of at least 15 minutes");
  }

  const drive = await Drive.findById(driveId);
  if (!drive) {
    throw new ApiError(404, "Drive not found");
  }

  // Validate prerequisite rounds belong to this drive.
  const prerequisites = prerequisiteRound ?? [];

  if (!Array.isArray(prerequisites)) {
    throw new ApiError(400, "prerequisiteRound must be an array");
  }

  if (prerequisites.length > 0) {
    const validIds = prerequisites.every((id) =>
      mongoose.isValidObjectId(id)
    );

    if (!validIds) {
      throw new ApiError(400, "Invalid prerequisite round ID");
    }

    const matchingRounds = await Round.find({
      _id: { $in: prerequisites },
      driveId,
    });

    if (matchingRounds.length !== new Set(prerequisites.map(String)).size) {
      throw new ApiError(
        400,
        "All prerequisite rounds must belong to this drive"
      );
    }

    if (matchingRounds.some((round) => round.sequence >= Number(sequence))) {
      throw new ApiError(400, "Prerequisite rounds must come earlier in the sequence");
    }
  }

  const skills = Array.isArray(requiredSkills)
    ? requiredSkills.map((s) => String(s).trim()).filter(Boolean)
    : [];

  let round;
  try {
    round = await Round.create({
      driveId,
      name: name.trim(),
      sequence: Number(sequence),
      durationMinutes: Number(durationMinutes),
      prerequisiteRound: prerequisites,
      requiredSkills: skills,
      isRequired: isRequired ?? true,
      description,
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(
        409,
        "A round with this sequence number already exists for this drive"
      );
    }
    throw error;
  }

  await notifyDriveEvent({
    driveId,
    type: "round_created",
    title: "Interview round added",
    message: `${round.name} was added to the interview process.`,
    entityType: "round",
    entityId: round._id,
    includeDriveParticipants: true,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, round, "Interview round created successfully"));
});

// Get all rounds for a drive
export const getRoundsByDrive = asyncHandler(async (req, res) => {
  const { driveId } = req.params;

  if (!mongoose.isValidObjectId(driveId)) {
    throw new ApiError(400, "Invalid drive ID");
  }

  const drive = await Drive.findById(driveId);
  if (!drive) {
    throw new ApiError(404, "Drive not found");
  }

  const rounds = await Round.find({ driveId }).sort({ sequence: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, rounds, "Interview rounds fetched successfully"));
});

// --- ROOMS ---

// Create an interview room for a drive
export const createRoom = asyncHandler(async (req, res) => {
  const { driveId } = req.params;
  const { name, location, capacity, isVirtual, meetingLink, isActive } = req.body;

  if (!mongoose.isValidObjectId(driveId)) {
    throw new ApiError(400, "Invalid drive ID");
  }

  if (!name?.trim()) {
    throw new ApiError(400, "Room name is required");
  }

  const drive = await Drive.findById(driveId);
  if (!drive) {
    throw new ApiError(404, "Drive not found");
  }

  let room;
  try {
    room = await Room.create({
      drive: driveId,
      name: name.trim(),
      location: location || "",
      capacity: capacity ? Number(capacity) : 1,
      isVirtual: Boolean(isVirtual),
      meetingLink: meetingLink || "",
      isActive: isActive ?? true,
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(
        409,
        "A room with this name already exists for this drive"
      );
    }
    throw error;
  }

  return res
    .status(201)
    .json(new ApiResponse(201, room, "Interview room created successfully"));
});

// Get all rooms for a drive
export const getRoomsByDrive = asyncHandler(async (req, res) => {
  const { driveId } = req.params;

  if (!mongoose.isValidObjectId(driveId)) {
    throw new ApiError(400, "Invalid drive ID");
  }

  const drive = await Drive.findById(driveId);
  if (!drive) {
    throw new ApiError(404, "Drive not found");
  }

  const rooms = await Room.find({ drive: driveId }).sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, rooms, "Rooms fetched successfully"));
});

// Update an interview round
export const updateRound = asyncHandler(async (req, res) => {
  const { driveId, roundId } = req.params;
  const {
    name,
    sequence,
    durationMinutes,
    prerequisiteRound,
    requiredSkills,
    isRequired,
    description,
  } = req.body;

  if (!mongoose.isValidObjectId(driveId) || !mongoose.isValidObjectId(roundId)) {
    throw new ApiError(400, "Invalid drive or round ID");
  }

  const round = await Round.findOne({ _id: roundId, driveId });
  if (!round) {
    throw new ApiError(404, "Round not found for this drive");
  }

  const nextSequence = sequence == null ? round.sequence : Number(sequence);

  if (name?.trim()) round.name = name.trim();
  if (sequence != null) {
    const seqNum = Number(sequence);
    if (!Number.isInteger(seqNum) || seqNum < 1) {
      throw new ApiError(400, "Sequence must be a positive integer");
    }
    round.sequence = seqNum;
  }

  if (durationMinutes != null) {
    const durNum = Number(durationMinutes);
    if (!Number.isInteger(durNum) || durNum < 15) {
      throw new ApiError(400, "Duration must be an integer of at least 15 minutes");
    }
    round.durationMinutes = durNum;
  }

  if (Array.isArray(prerequisiteRound)) {
    if (prerequisiteRound.length > 0) {
      const validIds = prerequisiteRound.every((id) => mongoose.isValidObjectId(id));
      if (!validIds) {
        throw new ApiError(400, "Invalid prerequisite round ID");
      }
      if (prerequisiteRound.some((id) => id.toString() === roundId.toString())) {
        throw new ApiError(400, "A round cannot be its own prerequisite");
      }
      const matchingRounds = await Round.find({
        _id: { $in: prerequisiteRound },
        driveId,
      });
      if (matchingRounds.length !== new Set(prerequisiteRound.map(String)).size) {
        throw new ApiError(400, "All prerequisite rounds must belong to this drive");
      }
      if (matchingRounds.some((item) => item.sequence >= nextSequence)) {
        throw new ApiError(400, "Prerequisite rounds must come earlier in the sequence");
      }
    }
    round.prerequisiteRound = prerequisiteRound;
  } else if (prerequisiteRound !== undefined) {
    throw new ApiError(400, "prerequisiteRound must be an array");
  }

  if (sequence != null) {
    const dependentRound = await Round.findOne({
      driveId,
      prerequisiteRound: roundId,
      sequence: { $lte: nextSequence },
      _id: { $ne: roundId },
    });
    if (dependentRound) {
      throw new ApiError(400, `This round must stay before ${dependentRound.name} because it is a prerequisite`);
    }
  }

  if (Array.isArray(requiredSkills)) {
    round.requiredSkills = requiredSkills.map((s) => String(s).trim()).filter(Boolean);
  }

  if (isRequired !== undefined) round.isRequired = Boolean(isRequired);
  if (description !== undefined) round.description = description.trim();

  try {
    await round.save();
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(
        409,
        "Another round with this sequence already exists for this drive"
      );
    }
    throw error;
  }

  await notifyDriveEvent({
    driveId,
    type: "round_updated",
    title: "Interview round updated",
    message: `${round.name} details or prerequisites were updated.`,
    entityType: "round",
    entityId: round._id,
    includeDriveParticipants: true,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, round, "Interview round updated successfully"));
});

// Delete an interview round
export const deleteRound = asyncHandler(async (req, res) => {
  const { driveId, roundId } = req.params;

  if (!mongoose.isValidObjectId(driveId) || !mongoose.isValidObjectId(roundId)) {
    throw new ApiError(400, "Invalid drive or round ID");
  }

  const hasInterviews = await Interview.exists({ round: roundId, status: { $in: ["scheduled", "rescheduled"] } });
  if (hasInterviews) {
    throw new ApiError(
      400,
      "Cannot delete round because active scheduled or rescheduled interviews exist for this round. Discard schedule or cancel interviews first."
    );
  }

  const dependentRound = await Round.findOne({ driveId, prerequisiteRound: roundId }).select("name");
  if (dependentRound) {
    throw new ApiError(400, `Remove ${dependentRound.name}'s prerequisite link before deleting this round`);
  }

  const round = await Round.findOneAndDelete({ _id: roundId, driveId });
  if (!round) {
    throw new ApiError(404, "Round not found for this drive");
  }

  await notifyDriveEvent({
    driveId,
    type: "round_deleted",
    title: "Interview round removed",
    message: `${round.name} was removed from the interview process.`,
    entityType: "round",
    entityId: round._id,
    includeDriveParticipants: true,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Interview round deleted successfully"));
});

// Update an interview room
export const updateRoom = asyncHandler(async (req, res) => {
  const { driveId, roomId } = req.params;
  const { name, location, capacity, isVirtual, meetingLink, isActive } = req.body;

  if (!mongoose.isValidObjectId(driveId) || !mongoose.isValidObjectId(roomId)) {
    throw new ApiError(400, "Invalid drive or room ID");
  }

  const room = await Room.findOne({ _id: roomId, drive: driveId });
  if (!room) {
    throw new ApiError(404, "Room not found for this drive");
  }

  if (name?.trim()) room.name = name.trim();
  if (location !== undefined) room.location = location;
  if (capacity != null) room.capacity = Math.max(1, Number(capacity));
  if (isVirtual !== undefined) room.isVirtual = Boolean(isVirtual);
  if (meetingLink !== undefined) room.meetingLink = meetingLink;
  if (isActive !== undefined) room.isActive = Boolean(isActive);

  try {
    await room.save();
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(
        409,
        "Another room with this name already exists for this drive"
      );
    }
    throw error;
  }

  return res
    .status(200)
    .json(new ApiResponse(200, room, "Interview room updated successfully"));
});

// Delete an interview room
export const deleteRoom = asyncHandler(async (req, res) => {
  const { driveId, roomId } = req.params;

  if (!mongoose.isValidObjectId(driveId) || !mongoose.isValidObjectId(roomId)) {
    throw new ApiError(400, "Invalid drive or room ID");
  }

  const hasInterviews = await Interview.exists({ room: roomId, status: { $in: ["scheduled", "rescheduled"] } });
  if (hasInterviews) {
    throw new ApiError(
      400,
      "Cannot delete room because active scheduled or rescheduled interviews exist for this room. Discard schedule or reassign room first."
    );
  }

  const room = await Room.findOneAndDelete({ _id: roomId, drive: driveId });
  if (!room) {
    throw new ApiError(404, "Room not found for this drive");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Interview room deleted successfully"));
});
