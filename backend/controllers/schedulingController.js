import mongoose from "mongoose";

import { ScheduleVersion } from "../models/ScheduleVersion.model.js";
import { Interview } from "../models/Interview.model.js";
import { Round } from "../models/Round.model.js";
import { Room } from "../models/Room.model.js";
import { Availability } from "../models/Availability.model.js";
import { DriveParticipant } from "../models/DriveParticipant.model.js";
import { Drive } from "../models/Drive.model.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Helper: check if interviewer has all required skills
const matchesSkills = (interviewerSkills = [], requiredSkills = []) => {
  if (!requiredSkills || requiredSkills.length === 0) return true;
  const normalizedInterviewerSkills = interviewerSkills.map((s) =>
    String(s).trim().toLowerCase()
  );
  return requiredSkills.every((reqSkill) =>
    normalizedInterviewerSkills.includes(String(reqSkill).trim().toLowerCase())
  );
};

// Generate a new draft schedule for a drive using Constraint-Satisfaction
export const generateSchedule = asyncHandler(async (req, res) => {
  const { driveId } = req.params;
  const { changeSummary } = req.body;

  // Validate drive ID
  if (!mongoose.isValidObjectId(driveId)) {
    throw new ApiError(400, "Invalid drive ID");
  }

  if (!req.user?._id) {
    throw new ApiError(401, "Authentication required");
  }

  // Verify drive exists
  const drive = await Drive.findById(driveId);
  if (!drive) {
    throw new ApiError(404, "Drive not found");
  }

  // Fetch configuration, participants, and availabilities
  const [
    rounds,
    rooms,
    candidateParticipants,
    interviewerParticipants,
    availabilities,
    lastVersion,
  ] = await Promise.all([
    Round.find({ driveId }).sort({ sequence: 1 }),
    Room.find({ drive: driveId, isActive: true }),
    DriveParticipant.find({
      driveId,
      role: "candidate",
      status: "active",
    }).populate("userId", "name email role"),
    DriveParticipant.find({
      driveId,
      role: "interviewer",
      status: "active",
    }).populate("userId", "name email role"),
    Availability.find({ drive: driveId }).sort({ startTime: 1 }),
    ScheduleVersion.findOne({ drive: driveId }).sort({ versionNumber: -1 }),
  ]);

  if (rounds.length === 0) {
    throw new ApiError(400, "No rounds configured for this drive");
  }

  if (rooms.length === 0) {
    throw new ApiError(400, "No active rooms available for this drive");
  }

  if (candidateParticipants.length === 0) {
    throw new ApiError(400, "No active candidates found for this drive");
  }

  if (interviewerParticipants.length === 0) {
    throw new ApiError(400, "No active interviewers found for this drive");
  }

  const versionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

  // Create a new draft schedule version
  let draftVersion;
  try {
    draftVersion = await ScheduleVersion.create({
      drive: driveId,
      versionNumber,
      status: "draft",
      createdBy: req.user._id,
      changeSummary:
        changeSummary?.trim() ||
        `Automated constraint-satisfaction schedule generation v${versionNumber}`,
    });
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(409, "A schedule version with this number already exists");
    }
    throw err;
  }

  const createdInterviews = [];
  const occupiedSlots = []; // tracks overlapping bookings { ownerType, ownerId, startTime, endTime }
  const interviewerDailyCounts = {}; // tracks daily interviews per interviewer { `${interviewerId}_${dateStr}`: count }

  // Check whether a resource already has an overlapping interview
  const hasConflict = (ownerType, ownerId, startTime, endTime) => {
    const sTime = startTime.getTime();
    const eTime = endTime.getTime();

    return occupiedSlots.some((slot) => {
      if (slot.ownerType !== ownerType) return false;
      if (slot.ownerId.toString() !== ownerId.toString()) return false;
      return sTime < slot.endTime.getTime() && eTime > slot.startTime.getTime();
    });
  };

  // Check whether an availability window fully covers a requested slot
  const coversSlot = (availability, startTime, endTime) => {
    return (
      new Date(availability.startTime).getTime() <= startTime.getTime() &&
      new Date(availability.endTime).getTime() >= endTime.getTime()
    );
  };

  try {
    // Step interval for sliding window (15 minutes)
    const STEP_MS = 15 * 60 * 1000;

    // For each candidate, attempt to schedule each configured round in sequence
    for (const participant of candidateParticipants) {
      const candidateUser = participant.userId;
      if (!candidateUser?._id) continue;

      const candidateId = candidateUser._id;

      // Filter candidate availability windows
      const candidateAvailabilities = availabilities.filter(
        (a) =>
          a.ownerType === "candidate" &&
          a.ownerId.toString() === candidateId.toString()
      );

      // Keep track of candidate's last scheduled round end time to enforce sequence
      let lastScheduledEndTime = null;

      for (const round of rounds) {
        // Enforce Multi-Stage Pipeline Prerequisite Constraint:
        // 1) If candidate has eligibleRoundIds configured, round must be explicitly unlocked
        if (
          participant.eligibleRoundIds &&
          participant.eligibleRoundIds.length > 0 &&
          !participant.eligibleRoundIds.some((id) => id.toString() === round._id.toString())
        ) {
          continue;
        }

        // 2) If candidate has no eligibleRoundIds set yet, only initial rounds (without prerequisite rounds) can be scheduled
        if (
          (!participant.eligibleRoundIds || participant.eligibleRoundIds.length === 0) &&
          round.prerequisiteRound &&
          round.prerequisiteRound.length > 0
        ) {
          continue;
        }

        const durationMinutes = round.durationMinutes || 30;
        const durationMs = durationMinutes * 60 * 1000;
        let assignment = null;

        // Iterate through all availability windows of this candidate
        for (const candidateAvail of candidateAvailabilities) {
          const windowStart = new Date(candidateAvail.startTime).getTime();
          const windowEnd = new Date(candidateAvail.endTime).getTime();

          // Slide time window across candidate's availability in 15-minute steps
          for (
            let currentStartMs = windowStart;
            currentStartMs + durationMs <= windowEnd;
            currentStartMs += STEP_MS
          ) {
            const slotStart = new Date(currentStartMs);
            const slotEnd = new Date(currentStartMs + durationMs);

            // Constraint: Sequence ordering — round must start after previous round finishes
            if (lastScheduledEndTime && slotStart < lastScheduledEndTime) {
              continue;
            }

            // Constraint: Candidate must not be busy
            if (hasConflict("candidate", candidateId, slotStart, slotEnd)) {
              continue;
            }

            const slotDateKey = slotStart.toISOString().split("T")[0];

            // Find an eligible interviewer who satisfies expertise/skill & capacity constraints
            for (const interviewerPart of interviewerParticipants) {
              const interviewerUser = interviewerPart.userId;
              if (!interviewerUser?._id) continue;
              const interviewerId = interviewerUser._id;

              // Constraint: Panel expertise / skill tags from metadata
              const interviewerSkills = interviewerPart.metadata?.skills || [];
              if (
                round.requiredSkills?.length > 0 &&
                !matchesSkills(interviewerSkills, round.requiredSkills)
              ) {
                continue;
              }

              // Constraint: Max daily interview capacity from metadata
              const dailyKey = `${interviewerId}_${slotDateKey}`;
              const currentDailyCount = interviewerDailyCounts[dailyKey] || 0;
              const maxDaily = interviewerPart.metadata?.maxDailyInterviews || 4;
              if (currentDailyCount >= maxDaily) {
                continue;
              }

              // Constraint: Interviewer availability window
              const interviewerAvail = availabilities.some(
                (a) =>
                  a.ownerType === "interviewer" &&
                  a.ownerId.toString() === interviewerId.toString() &&
                  coversSlot(a, slotStart, slotEnd)
              );

              if (!interviewerAvail) {
                continue;
              }

              // Constraint: Interviewer conflict check
              if (hasConflict("interviewer", interviewerId, slotStart, slotEnd)) {
                continue;
              }

              // Find an available room satisfying room constraints
              for (const room of rooms) {
                // If room is virtual, meetingLink takes precedence
                // Verify room availability if room has explicit availability set
                const roomAvails = availabilities.filter(
                  (a) =>
                    a.ownerType === "room" &&
                    a.ownerId.toString() === room._id.toString()
                );

                if (roomAvails.length > 0) {
                  const roomCovers = roomAvails.some((a) =>
                    coversSlot(a, slotStart, slotEnd)
                  );
                  if (!roomCovers) continue;
                }

                // Constraint: Physical room conflict check
                if (!room.isVirtual && hasConflict("room", room._id, slotStart, slotEnd)) {
                  continue;
                }

                assignment = {
                  candidateId,
                  interviewerId,
                  roomId: room._id,
                  startTime: slotStart,
                  endTime: slotEnd,
                  dateKey: dailyKey,
                };
                break;
              }

              if (assignment) break;
            }

            if (assignment) break;
          }

          if (assignment) break;
        }

        // If assignment found, create interview and reserve slots
        if (assignment) {
          const interview = await Interview.create({
            drive: driveId,
            scheduleVersion: draftVersion._id,
            round: round._id,
            candidate: assignment.candidateId,
            interviewer: assignment.interviewerId,
            room: assignment.roomId,
            startTime: assignment.startTime,
            endTime: assignment.endTime,
            status: "scheduled",
          });

          createdInterviews.push(interview);
          lastScheduledEndTime = assignment.endTime;

          // Track interviewer capacity
          interviewerDailyCounts[assignment.dateKey] =
            (interviewerDailyCounts[assignment.dateKey] || 0) + 1;

          // Reserve slots
          occupiedSlots.push(
            {
              ownerType: "candidate",
              ownerId: assignment.candidateId,
              startTime: assignment.startTime,
              endTime: assignment.endTime,
            },
            {
              ownerType: "interviewer",
              ownerId: assignment.interviewerId,
              startTime: assignment.startTime,
              endTime: assignment.endTime,
            },
            {
              ownerType: "room",
              ownerId: assignment.roomId,
              startTime: assignment.startTime,
              endTime: assignment.endTime,
            }
          );
        }
      }
    }

    // Update drive status to scheduled if currently draft or configured
    if (["draft", "configured"].includes(drive.status)) {
      drive.status = "scheduled";
      await drive.save();
    }

    return res.status(201).json(
      new ApiResponse(
        201,
        {
          scheduleVersion: draftVersion,
          totalInterviewsScheduled: createdInterviews.length,
          totalCandidates: candidateParticipants.length,
          totalRounds: rounds.length,
        },
        "Draft schedule generated successfully with constraint matching"
      )
    );
  } catch (error) {
    if (draftVersion?._id) {
      await Interview.deleteMany({ scheduleVersion: draftVersion._id });
      await ScheduleVersion.findByIdAndDelete(draftVersion._id);
    }
    throw error;
  }
});

// Candidate Self-Booking: Search open slots for a round (PS Foundational Scope)
export const getAvailableSlotsForRound = asyncHandler(async (req, res) => {
  const { driveId, roundId } = req.params;

  if (!mongoose.isValidObjectId(driveId) || !mongoose.isValidObjectId(roundId)) {
    throw new ApiError(400, "Invalid drive or round ID");
  }

  const [round, drive, rooms, interviewerParticipants, availabilities, scheduledInterviews] =
    await Promise.all([
      Round.findOne({ _id: roundId, driveId }),
      Drive.findById(driveId),
      Room.find({ drive: driveId, isActive: true }),
      DriveParticipant.find({
        driveId,
        role: "interviewer",
        status: "active",
      }).populate("userId", "name email role"),
      Availability.find({ drive: driveId, ownerType: "interviewer" }),
      Interview.find({ drive: driveId, status: "scheduled" }),
    ]);

  if (!round || !drive) {
    throw new ApiError(404, "Drive or round not found");
  }

  const durationMs = (round.durationMinutes || 30) * 60 * 1000;
  const STEP_MS = 30 * 60 * 1000;
  const availableSlots = [];

  for (const part of interviewerParticipants) {
    const interviewer = part.userId;
    if (!interviewer?._id) continue;

    const interviewerSkills = part.metadata?.skills || [];
    if (
      round.requiredSkills?.length > 0 &&
      !matchesSkills(interviewerSkills, round.requiredSkills)
    ) {
      continue;
    }

    const intAvails = availabilities.filter(
      (a) => a.ownerId.toString() === interviewer._id.toString()
    );

    for (const a of intAvails) {
      const startMs = new Date(a.startTime).getTime();
      const endMs = new Date(a.endTime).getTime();

      for (let cur = startMs; cur + durationMs <= endMs; cur += STEP_MS) {
        const slotStart = new Date(cur);
        const slotEnd = new Date(cur + durationMs);

        // Check if interviewer has collision
        const interviewerBusy = scheduledInterviews.some(
          (i) =>
            i.interviewer.toString() === interviewer._id.toString() &&
            slotStart < new Date(i.endTime) &&
            slotEnd > new Date(i.startTime)
        );

        if (interviewerBusy) continue;

        // Check interviewer daily capacity constraint
        const slotDateKey = slotStart.toISOString().split("T")[0];
        const maxDaily = part.metadata?.maxDailyInterviews || 4;
        const interviewerDayCount = scheduledInterviews.filter(
          (i) =>
            i.interviewer.toString() === interviewer._id.toString() &&
            new Date(i.startTime).toISOString().split("T")[0] === slotDateKey
        ).length;

        if (interviewerDayCount >= maxDaily) continue;

        // Check room
        const freeRoom = rooms.find((r) => {
          if (r.isVirtual) return true;
          return !scheduledInterviews.some(
            (i) =>
              Boolean(i.room) &&
              i.room.toString() === r._id.toString() &&
              slotStart < new Date(i.endTime) &&
              slotEnd > new Date(i.startTime)
          );
        });

        if (!freeRoom) continue;

        availableSlots.push({
          startTime: slotStart,
          endTime: slotEnd,
          interviewerId: interviewer._id,
          interviewerName: interviewer.name,
          roomId: freeRoom._id,
          roomName: freeRoom.name,
          isVirtual: freeRoom.isVirtual,
          meetingLink: freeRoom.meetingLink,
        });
      }
    }
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        roundName: round.name,
        durationMinutes: round.durationMinutes,
        totalSlots: availableSlots.length,
        availableSlots,
      },
      "Available self-booking slots fetched successfully"
    )
  );
});

// Candidate Self-Booking: Book a chosen slot (PS Foundational Scope)
export const selfBookSlot = asyncHandler(async (req, res) => {
  const { driveId, roundId } = req.params;
  const { startTime, endTime, interviewerId, roomId } = req.body;

  if (!req.user?._id) {
    throw new ApiError(401, "Authentication required");
  }

  if (!mongoose.isValidObjectId(driveId) || !mongoose.isValidObjectId(roundId)) {
    throw new ApiError(400, "Invalid drive or round ID");
  }

  if (!interviewerId || !mongoose.isValidObjectId(interviewerId)) {
    throw new ApiError(400, "Valid interviewer ID is required");
  }

  if (!roomId || !mongoose.isValidObjectId(roomId)) {
    throw new ApiError(400, "Valid room ID is required");
  }

  // Verify candidate is an active participant in this drive and eligible for this round
  const participant = await DriveParticipant.findOne({
    driveId,
    userId: req.user._id,
    role: "candidate",
    status: "active",
  });

  if (!participant) {
    throw new ApiError(403, "You are not registered as an active candidate in this drive");
  }

  if (
    participant.eligibleRoundIds &&
    participant.eligibleRoundIds.length > 0 &&
    !participant.eligibleRoundIds.some((id) => id.toString() === roundId.toString())
  ) {
    throw new ApiError(403, "You are not currently eligible to book a slot for this round");
  }

  const slotStart = new Date(startTime);
  const slotEnd = new Date(endTime);

  if (Number.isNaN(slotStart.getTime()) || Number.isNaN(slotEnd.getTime()) || slotEnd <= slotStart) {
    throw new ApiError(400, "Invalid start or end time");
  }

  // Get active schedule version for the drive (prioritizing published schedule)
  let scheduleVersion = await ScheduleVersion.findOne({
    drive: driveId,
    status: "published",
  }).sort({ versionNumber: -1 });

  if (!scheduleVersion) {
    scheduleVersion = await ScheduleVersion.findOne({
      drive: driveId,
      status: "draft",
    }).sort({ versionNumber: -1 });
  }

  if (!scheduleVersion) {
    throw new ApiError(400, "No active schedule version found for this drive");
  }

  // Check collision for candidate, interviewer, room
  const collision = await Interview.findOne({
    drive: driveId,
    status: "scheduled",
    $or: [
      { candidate: req.user._id, startTime: { $lt: slotEnd }, endTime: { $gt: slotStart } },
      { interviewer: interviewerId, startTime: { $lt: slotEnd }, endTime: { $gt: slotStart } },
      { room: roomId, startTime: { $lt: slotEnd }, endTime: { $gt: slotStart } },
    ],
  });

  if (collision) {
    throw new ApiError(409, "The selected slot is no longer available. Please select another slot.");
  }

  const interview = await Interview.create({
    drive: driveId,
    scheduleVersion: scheduleVersion._id,
    round: roundId,
    candidate: req.user._id,
    interviewer: interviewerId,
    room: roomId,
    startTime: slotStart,
    endTime: slotEnd,
    status: "scheduled",
  });

  return res.status(201).json(
    new ApiResponse(201, interview, "Interview booked successfully via self-booking portal")
  );
});

// Automated Reschedule Engine (PS Victory Tier): Ripple-effect reassigning when interviewer cancels
export const rescheduleInterview = asyncHandler(async (req, res) => {
  const { interviewId } = req.params;
  const { reason } = req.body;

  const interview = await Interview.findById(interviewId)
    .populate("round")
    .populate("candidate", "name email");

  if (!interview) {
    throw new ApiError(404, "Interview not found");
  }

  // Ensure only assigned interviewer or staff (coordinator/admin) can reschedule
  const isAssignedInterviewer =
    interview.interviewer.toString() === req.user?._id?.toString();
  const isStaff = ["admin", "coordinator"].includes(req.user?.role);

  if (!isAssignedInterviewer && !isStaff) {
    throw new ApiError(
      403,
      "You are not authorized to reschedule this interview"
    );
  }

  const driveId = interview.drive;
  const round = interview.round;

  // Find another interviewer with matching skills who is available at the same time slot
  const interviewerParticipants = await DriveParticipant.find({
    driveId,
    role: "interviewer",
    status: "active",
    userId: { $ne: interview.interviewer },
  }).populate("userId", "name email role");

  const [availabilities, busyInterviews] = await Promise.all([
    Availability.find({
      drive: driveId,
      ownerType: "interviewer",
      startTime: { $lte: interview.startTime },
      endTime: { $gte: interview.endTime },
    }),
    Interview.find({
      drive: driveId,
      status: "scheduled",
      _id: { $ne: interview._id },
      startTime: { $lt: interview.endTime },
      endTime: { $gt: interview.startTime },
    }),
  ]);

  let replacementInterviewerId = null;

  const slotDateStart = new Date(interview.startTime);
  slotDateStart.setHours(0, 0, 0, 0);
  const slotDateEnd = new Date(interview.startTime);
  slotDateEnd.setHours(23, 59, 59, 999);

  for (const part of interviewerParticipants) {
    const altInterviewerUser = part.userId;
    if (!altInterviewerUser?._id) continue;

    // Check skills from metadata
    const altInterviewerSkills = part.metadata?.skills || [];
    if (
      round.requiredSkills?.length > 0 &&
      !matchesSkills(altInterviewerSkills, round.requiredSkills)
    ) {
      continue;
    }

    // Check daily interview capacity constraint
    const maxDaily = part.metadata?.maxDailyInterviews || 4;
    const dailyCount = await Interview.countDocuments({
      drive: driveId,
      interviewer: altInterviewerUser._id,
      status: "scheduled",
      startTime: { $gte: slotDateStart, $lte: slotDateEnd },
    });

    if (dailyCount >= maxDaily) continue;

    // Check availability covering the slot
    const hasAvail = availabilities.some(
      (a) => a.ownerId.toString() === altInterviewerUser._id.toString()
    );
    if (!hasAvail) continue;

    // Check not busy
    const isBusy = busyInterviews.some(
      (i) => i.interviewer.toString() === altInterviewerUser._id.toString()
    );
    if (isBusy) continue;

    replacementInterviewerId = altInterviewerUser._id;
    break;
  }

  if (!replacementInterviewerId) {
    // If no instant replacement at current slot, mark as rescheduled with reason
    interview.status = "rescheduled";
    interview.unassignedReason = reason || "Interviewer cancelled, pending slot reassignment";
    await interview.save();

    return res.status(200).json(
      new ApiResponse(
        200,
        interview,
        "No immediate alternate interviewer found. Interview marked for rescheduling."
      )
    );
  }

  // Reassign to replacement interviewer
  interview.interviewer = replacementInterviewerId;
  interview.status = "scheduled";
  interview.unassignedReason = "";
  await interview.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      interview,
      "Interview dynamically rescheduled to alternate qualified interviewer"
    )
  );
});

// Calendar Integration: Generate RFC-5545 .ics Calendar File (PS Foundational Scope)
export const downloadInterviewIcs = asyncHandler(async (req, res) => {
  const { interviewId } = req.params;

  if (!mongoose.isValidObjectId(interviewId)) {
    throw new ApiError(400, "Invalid interview ID");
  }

  const interview = await Interview.findById(interviewId)
    .populate("candidate", "name email")
    .populate("interviewer", "name email")
    .populate("round", "name description")
    .populate("room", "name location meetingLink isVirtual")
    .populate("drive", "name companyName");

  if (!interview) {
    throw new ApiError(404, "Interview not found");
  }

  // Access control: only candidate, interviewer, or staff (coordinator/admin)
  const isCandidate = interview.candidate?._id.toString() === req.user?._id?.toString();
  const isInterviewer = interview.interviewer?._id.toString() === req.user?._id?.toString();
  const isStaff = ["admin", "coordinator"].includes(req.user?.role);

  if (!isCandidate && !isInterviewer && !isStaff) {
    throw new ApiError(403, "You are not authorized to download the calendar file for this interview");
  }

  // Format UTC dates to iCalendar standard format YYYYMMDDTHHMMSSZ
  const formatIcsDate = (date) => {
    return new Date(date).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const dtStart = formatIcsDate(interview.startTime);
  const dtEnd = formatIcsDate(interview.endTime);
  const dtStamp = formatIcsDate(new Date());
  const uid = `interview-${interview._id}@antigravity-recruitment.com`;
  const summary = `${interview.drive?.name || "Placement Drive"} - ${interview.round?.name || "Interview"}`;
  const location = interview.room?.isVirtual
    ? interview.room?.meetingLink || "Virtual Meeting"
    : interview.room?.location || interview.room?.name || "On-site";
  const description = `Candidate: ${interview.candidate?.name} (${interview.candidate?.email})\\nInterviewer: ${interview.interviewer?.name} (${interview.interviewer?.email})\\nCompany: ${interview.drive?.companyName || "N/A"}`;

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Recruitment Scheduler//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="interview-${interview._id}.ics"`
  );
  return res.status(200).send(icsContent);
});

// Publish a draft schedule version
export const publishSchedule = asyncHandler(async (req, res) => {
  const { driveId, versionId } = req.params;

  if (
    !mongoose.isValidObjectId(driveId) ||
    !mongoose.isValidObjectId(versionId)
  ) {
    throw new ApiError(400, "Invalid drive ID or schedule version ID");
  }

  const targetVersion = await ScheduleVersion.findOne({
    _id: versionId,
    drive: driveId,
  });

  if (!targetVersion) {
    throw new ApiError(404, "Schedule version not found");
  }

  if (targetVersion.status !== "draft") {
    throw new ApiError(
      400,
      "Only draft schedule versions can be published"
    );
  }

  const interviewCount = await Interview.countDocuments({
    scheduleVersion: targetVersion._id,
    status: "scheduled",
  });

  if (interviewCount === 0) {
    throw new ApiError(
      400,
      "Cannot publish a schedule with no scheduled interviews"
    );
  }

  // Supersede the currently published version
  await ScheduleVersion.updateMany(
    {
      drive: driveId,
      status: "published",
    },
    {
      $set: { status: "superseded" },
    }
  );

  targetVersion.status = "published";
  targetVersion.publishedAt = new Date();
  await targetVersion.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      targetVersion,
      "Schedule version published successfully"
    )
  );
});

// Get all schedule versions for a drive
export const getScheduleVersions = asyncHandler(async (req, res) => {
  const { driveId } = req.params;

  if (!mongoose.isValidObjectId(driveId)) {
    throw new ApiError(400, "Invalid drive ID");
  }

  const driveExists = await Drive.exists({ _id: driveId });
  if (!driveExists) {
    throw new ApiError(404, "Drive not found");
  }

  const versions = await ScheduleVersion.find({
    drive: driveId,
  }).sort({ versionNumber: -1 });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        count: versions.length,
        versions,
      },
      "Schedule versions fetched successfully"
    )
  );
});

// Get interviews for a specific schedule version
export const getInterviewsByVersion = asyncHandler(async (req, res) => {
  const { versionId } = req.params;

  if (!mongoose.isValidObjectId(versionId)) {
    throw new ApiError(400, "Invalid schedule version ID");
  }

  const versionExists = await ScheduleVersion.exists({ _id: versionId });
  if (!versionExists) {
    throw new ApiError(404, "Schedule version not found");
  }

  const interviews = await Interview.find({ scheduleVersion: versionId })
    .populate("candidate", "name email")
    .populate("interviewer", "name email")
    .populate("round", "name sequence durationMinutes requiredSkills")
    .populate("room", "name location meetingLink isVirtual")
    .sort({ startTime: 1 });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        count: interviews.length,
        interviews,
      },
      "Schedule interviews fetched successfully"
    )
  );
});

// Discard a draft schedule version and its interviews
export const discardDraftSchedule = asyncHandler(async (req, res) => {
  const { driveId, versionId } = req.params;

  if (
    !mongoose.isValidObjectId(driveId) ||
    !mongoose.isValidObjectId(versionId)
  ) {
    throw new ApiError(400, "Invalid drive ID or schedule version ID");
  }

  const version = await ScheduleVersion.findOne({
    _id: versionId,
    drive: driveId,
  });

  if (!version) {
    throw new ApiError(404, "Schedule version not found");
  }

  if (version.status !== "draft") {
    throw new ApiError(
      400,
      "Only draft schedule versions can be discarded"
    );
  }

  await Interview.deleteMany({ scheduleVersion: versionId });
  await ScheduleVersion.findByIdAndDelete(versionId);

  return res.status(200).json(
    new ApiResponse(200, {}, "Draft schedule discarded successfully")
  );
});

// Get interviews for the authenticated user (candidate or interviewer)
export const getMyInterviews = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Authentication required");
  }

  const userId = req.user._id;
  const { driveId, status } = req.query;

  const query = {
    $or: [{ candidate: userId }, { interviewer: userId }],
  };

  if (driveId) {
    if (!mongoose.isValidObjectId(driveId)) {
      throw new ApiError(400, "Invalid drive ID");
    }
    query.drive = driveId;
  }

  if (status) {
    const validStatuses = ["scheduled", "rescheduled", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      throw new ApiError(
        400,
        `Status must be one of: ${validStatuses.join(", ")}`
      );
    }
    query.status = status;
  }

  const interviews = await Interview.find(query)
    .populate("drive", "name status companyName")
    .populate("candidate", "name email")
    .populate("interviewer", "name email")
    .populate("round", "name sequence durationMinutes isRequired")
    .populate("room", "name location meetingLink isVirtual")
    .sort({ startTime: 1 });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        count: interviews.length,
        interviews,
      },
      "My interviews fetched successfully"
    )
  );
});
