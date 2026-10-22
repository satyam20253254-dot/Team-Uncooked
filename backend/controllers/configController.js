const Round = require("../models/Round");
const Room = require("../models/Room");

// --- ROUNDS ---

// Create an interview round for a drive
const createRound = async (req, res) => {
  try {
    const { driveId } = req.params;
    const { name, sequenceOrder, durationMinutes, prerequisiteRound, description } = req.body;

    const round = await Round.create({
      drive: driveId,
      name,
      sequenceOrder,
      durationMinutes,
      prerequisiteRound: prerequisiteRound || null,
      description,
    });

    res.status(201).json({
      success: true,
      message: "Interview round created successfully",
      data: round,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Sequence order must be unique for this drive." });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get all rounds for a drive
const getRoundsByDrive = async (req, res) => {
  try {
    const { driveId } = req.params;
    const rounds = await Round.find({ drive: driveId }).sort({ sequenceOrder: 1 }).populate("prerequisiteRound", "name");

    res.status(200).json({
      success: true,
      count: rounds.length,
      data: rounds,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- ROOMS ---

// Create an interview room for a drive
const createRoom = async (req, res) => {
  try {
    const { driveId } = req.params;
    const { name, capacity, isVirtual, meetingLink, location } = req.body;

    const room = await Room.create({
      drive: driveId,
      name,
      capacity: capacity || 1,
      isVirtual: isVirtual || false,
      meetingLink,
      location,
    });

    res.status(201).json({
      success: true,
      message: "Interview room created successfully",
      data: room,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Room name must be unique for this drive." });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get all rooms for a drive
const getRoomsByDrive = async (req, res) => {
  try {
    const { driveId } = req.params;
    const rooms = await Room.find({ drive: driveId }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createRound, getRoundsByDrive, createRoom, getRoomsByDrive };