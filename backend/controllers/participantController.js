const DriveParticipant = require("../models/DriveParticipant");
const User = require("../models/User");

// Add a participant (candidate or interviewer) to a drive
const addParticipant = async (req, res) => {
  try {
    const { driveId } = req.params;
    const { userId, role, metadata } = req.body;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const participant = await DriveParticipant.create({
      drive: driveId,
      user: userId,
      role, // 'candidate' or 'interviewer'
      metadata,
    });

    res.status(201).json({
      success: true,
      message: "Participant added to drive successfully",
      data: participant,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "User is already a participant in this drive." });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get all participants of a specific drive
const getDriveParticipants = async (req, res) => {
  try {
    const { driveId } = req.params;
    const { role } = req.query; // Optional filter by role (candidate/interviewer)

    const query = { drive: driveId };
    if (role) query.role = role;

    const participants = await DriveParticipant.find(query)
      .populate("user", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: participants.length,
      data: participants,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { addParticipant, getDriveParticipants };