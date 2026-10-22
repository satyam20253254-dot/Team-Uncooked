const Drive = require("../models/Drive");

// Create a new placement drive
const createDrive = async (req, res) => {
  try {
    const { name, description, startDate, endDate, dailyStartTime, dailyEndTime, timeZone } = req.body;

    const drive = await Drive.create({
      name,
      description,
      startDate,
      endDate,
      dailyStartTime,
      dailyEndTime,
      timeZone: timeZone || "Asia/Kolkata",
      createdBy: req.user.userId, // From auth middleware
    });

    res.status(201).json({
      success: true,
      message: "Placement drive created successfully",
      data: drive,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get all placement drives
const getAllDrives = async (req, res) => {
  try {
    const drives = await Drive.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: drives.length,
      data: drives,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get a single drive by ID
const getDriveById = async (req, res) => {
  try {
    const drive = await Drive.findById(req.params.id);
    if (!drive) {
      return res.status(404).json({ success: false, message: "Drive not found." });
    }
    res.status(200).json({
      success: true,
      data: drive,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createDrive, getAllDrives, getDriveById };
