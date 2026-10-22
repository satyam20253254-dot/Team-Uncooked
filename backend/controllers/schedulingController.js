const ScheduleVersion = require("../models/ScheduleVersion");
const Interview = require("../models/Interview");
const Round = require("../models/Round");
const Room = require("../models/Room");
const Availability = require("../models/Availability");
const DriveParticipant = require("../models/DriveParticipant");

// Generate a new draft schedule for a drive
const generateSchedule = async (req, res) => {
  try {
    const { driveId } = req.params;
    const { changeSummary } = req.body;

    // 1. Determine the next version number for this drive
    const lastVersion = await ScheduleVersion.findOne({ drive: driveId }).sort({ versionNumber: -1 });
    const versionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

    // 2. Create a new Draft Schedule Version
    const draftVersion = await ScheduleVersion.create({
      drive: driveId,
      versionNumber,
      status: "draft",
      createdBy: req.user.userId,
      changeSummary: changeSummary || `Automated schedule generation v${versionNumber}`,
    });

    // 3. Fetch active rounds, rooms, candidates, interviewers, and availabilities
    const rounds = await Round.find({ drive: driveId }).sort({ sequenceOrder: 1 });
    const rooms = await Room.find({ drive: driveId, isActive: true });
    const candidates = await DriveParticipant.find({ drive: driveId, role: "candidate", status: "active" });
    const interviewers = await DriveParticipant.find({ drive: driveId, role: "interviewer", status: "active" });
    const availabilities = await Availability.find({ drive: driveId });

    const createdInterviews = [];

    // Simple automated assignment heuristic (matching available windows)
    for (const candidate of candidates) {
      // Find candidate availabilities
      const candAvails = availabilities.filter(a => a.ownerId.toString() === candidate.user.toString());

      for (const round of rounds) {
        let assigned = false;

        for (const candAvail of candAvails) {
          if (assigned) break;

          // Find an available room and interviewer for this time window
          for (const room of rooms) {
            if (assigned) break;

            const roomAvails = availabilities.filter(a => a.ownerId.toString() === room._id.toString());
            const roomMatch = roomAvails.some(ra => ra.startTime <= candAvail.startTime && ra.endTime >= candAvail.endTime);

            if (roomMatch && interviewers.length > 0) {
              // Pick the first available interviewer for simplicity
              const interviewer = interviewers[0];

              const startTime = new Date(candAvail.startTime);
              const endTime = new Date(startTime.getTime() + round.durationMinutes * 60000);

              // Create interview assignment
              const interview = await Interview.create({
                drive: driveId,
                scheduleVersion: draftVersion._id,
                round: round._id,
                candidate: candidate.user,
                interviewer: interviewer.user,
                room: room._id,
                startTime,
                endTime,
                status: "scheduled",
              });

              createdInterviews.push(interview);
              assigned = true;
            }
          }
        }

        if (!assigned) {
          // If no slot could be found, log an unassigned entry if required
          await Interview.create({
            drive: driveId,
            scheduleVersion: draftVersion._id,
            round: round._id,
            candidate: candidate.user,
            interviewer: interviewers[0]?.user || candidate.user, // fallback
            room: rooms[0]?._id, // fallback
            startTime: new Date(),
            endTime: new Date(),
            status: "cancelled",
            unassignedReason: "No matching overlapping availability found for candidate, room, or interviewer.",
          });
        }
      }
    }

    res.status(201).json({
      success: true,
      message: "Draft schedule generated successfully",
      data: {
        scheduleVersion: draftVersion,
        totalInterviewsScheduled: createdInterviews.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Publish a draft schedule version (and supersede previous published ones)
const publishSchedule = async (req, res) => {
  try {
    const { driveId, versionId } = req.params;

    const targetVersion = await ScheduleVersion.findOne({ _id: versionId, drive: driveId });
    if (!targetVersion) {
      return res.status(404).json({ success: false, message: "Schedule version not found." });
    }

    // Supersede any currently published version
    await ScheduleVersion.updateMany(
      { drive: driveId, status: "published" },
      { status: "superseded" }
    );

    // Publish the target version
    targetVersion.status = "published";
    targetVersion.publishedAt = new Date();
    await targetVersion.save();

    res.status(200).json({
      success: true,
      message: "Schedule version published successfully",
      data: targetVersion,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all schedule versions for a drive
const getScheduleVersions = async (req, res) => {
  try {
    const { driveId } = req.params;
    const versions = await ScheduleVersion.find({ drive: driveId }).sort({ versionNumber: -1 });

    res.status(200).json({
      success: true,
      count: versions.length,
      data: versions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get interviews for a specific schedule version
const getInterviewsByVersion = async (req, res) => {
  try {
    const { versionId } = req.params;
    const interviews = await Interview.find({ scheduleVersion: versionId })
      .populate("candidate", "name email")
      .populate("interviewer", "name email")
      .populate("round", "name sequenceOrder")
      .populate("room", "name location meetingLink");

    res.status(200).json({
      success: true,
      count: interviews.length,
      data: interviews,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { generateSchedule, publishSchedule, getScheduleVersions, getInterviewsByVersion };