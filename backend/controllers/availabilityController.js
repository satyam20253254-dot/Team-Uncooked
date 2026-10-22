const Availability = require("../models/Availability");

// Add availability time window
const setAvailability = async (req, res) => {
  try {
    const { driveId } = req.params;
    const { ownerType, ownerId, startTime, endTime } = req.body;

    const availability = await Availability.create({
      drive: driveId,
      ownerType, // 'candidate', 'interviewer', or 'room'
      ownerId: ownerId || req.user.userId, // Default to logged-in user if not specified
      ownerModel: ownerType === "room" ? "Room" : "User",
      startTime,
      endTime,
    });

    res.status(201).json({
      success: true,
      message: "Availability added successfully",
      data: availability,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get all availabilities for a drive (with optional filters)
const getDriveAvailabilities = async (req, res) => {
  try {
    const { driveId } = req.params;
    const { ownerType, ownerId } = req.query;

    const query = { drive: driveId };
    if (ownerType) query.ownerType = ownerType;
    if (ownerId) query.ownerId = ownerId;

    const availabilities = await Availability.find(query).sort({ startTime: 1 });

    res.status(200).json({
      success: true,
      count: availabilities.length,
      data: availabilities,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { setAvailability, getDriveAvailabilities };