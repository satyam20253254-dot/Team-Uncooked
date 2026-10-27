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
import {
  buildSchedulePlan,
  dedupeScheduledInterviews,
  intervalsOverlap,
  matchesSkills,
} from "../utils/scheduleEngine.js";
import { withDriveScheduleLock } from "../utils/withScheduleWriteLock.js";
import { notifyDriveEvent } from "../utils/notifications.js";

// Generate a conflict-free draft schedule with explicit availability only.
export const generateSchedule = asyncHandler(async (req, res) => {
  const { driveId } = req.params;
  const { changeSummary } = req.body || {};

  if (!mongoose.isValidObjectId(driveId)) throw new ApiError(400, "Invalid drive ID");
  if (!req.user?._id) throw new ApiError(401, "Authentication required");

  return withDriveScheduleLock(driveId, async () => {
    const drive = await Drive.findById(driveId);
    if (!drive) throw new ApiError(404, "Drive not found");

    const [
      rounds,
      rooms,
      candidateParticipants,
      interviewerParticipants,
      availabilities,
      lastVersion,
      publishedVersion,
      completedInterviews,
    ] = await Promise.all([
      Round.find({ driveId }).sort({ sequence: 1 }),
      Room.find({ drive: driveId, isActive: true }),
      DriveParticipant.find({ driveId, role: "candidate", status: "active" })
        .populate("userId", "name email role"),
      DriveParticipant.find({ driveId, role: "interviewer", status: "active" })
        .populate("userId", "name email role"),
      Availability.find({ drive: driveId }).sort({ startTime: 1 }),
      ScheduleVersion.findOne({ drive: driveId }).sort({ versionNumber: -1 }),
      ScheduleVersion.findOne({ drive: driveId, status: "published" })
        .sort({ versionNumber: -1 }),
      Interview.find({ drive: driveId, status: "completed" })
        .select("candidate interviewer round startTime endTime status"),
    ]);

    if (rounds.length === 0) throw new ApiError(400, "No rounds configured for this drive");
    if (rooms.length === 0) throw new ApiError(400, "No active rooms available for this drive");
    if (candidateParticipants.length === 0) throw new ApiError(400, "No active candidates found for this drive");
    if (interviewerParticipants.length === 0) throw new ApiError(400, "No active interviewers found for this drive");

    const now = new Date();
    const hasFutureWindow = (ownerType) => availabilities.some((item) =>
      item.ownerType === ownerType &&
      new Date(item.endTime).getTime() > now.getTime() &&
      new Date(item.startTime).getTime() < new Date(item.endTime).getTime()
    );

    if (!hasFutureWindow("candidate")) {
      throw new ApiError(400, "No future candidate availability found. Add candidate availability for a future date and time.");
    }
    if (!hasFutureWindow("interviewer")) {
      throw new ApiError(400, "No future interviewer availability found. Add interviewer availability for a future date and time.");
    }
    if (!hasFutureWindow("room")) {
      throw new ApiError(400, "No future room availability found. Add a future availability window for an active room.");
    }

    const activeInterviews = publishedVersion
      ? await Interview.find({
          drive: driveId,
          scheduleVersion: publishedVersion._id,
          status: { $in: ["scheduled", "rescheduled"] },
          endTime: { $gt: now },
        })
          .populate("candidate", "name email")
          .populate("interviewer", "name email")
          .populate("room", "name")
          .populate("round", "name")
      : [];

    const { assignments, unassigned } = buildSchedulePlan({
      rounds,
      rooms,
      availabilities,
      candidateParticipants,
      interviewerParticipants,
      activeInterviews,
      completedInterviews,
      now,
    });

    const versionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;
    let draftVersion;

    try {
      draftVersion = await ScheduleVersion.create({
        drive: driveId,
        versionNumber,
        status: "draft",
        createdBy: req.user._id,
        changeSummary:
          (typeof changeSummary === "string" && changeSummary.trim()) ||
          "Automated constraint-satisfaction schedule generation v" + versionNumber,
        unassignedInterviews: unassigned,
      });

      const newInterviews = assignments
        .filter((item) => !item.carriedForward)
        .map((item) => ({
          drive: driveId,
          scheduleVersion: draftVersion._id,
          round: item.roundId,
          candidate: item.candidateId,
          interviewer: item.interviewerId,
          room: item.roomId,
          startTime: item.startTime,
          endTime: item.endTime,
          status: "scheduled",
        }));

      if (newInterviews.length > 0) await Interview.insertMany(newInterviews);
      const carriedForwardInterviews = assignments.filter((item) => item.carriedForward);

      if (carriedForwardInterviews.length > 0) {
        await Interview.insertMany(
          carriedForwardInterviews.map((item) => ({
            drive: driveId,
            scheduleVersion: draftVersion._id,
            round: item.roundId,
            candidate: item.candidateId,
            interviewer: item.interviewerId,
            room: item.roomId || null,
            startTime: item.startTime,
            endTime: item.endTime,
            status: "scheduled",
          }))
        );
      }
    } catch (error) {
      if (draftVersion?._id) {
        await Interview.deleteMany({ scheduleVersion: draftVersion._id });
        await ScheduleVersion.findByIdAndDelete(draftVersion._id);
      }
      throw error;
    }

    return res.status(201).json(
      new ApiResponse(
        201,
        {
          scheduleVersion: draftVersion,
          totalInterviewsScheduled: assignments.length,
          totalCandidates: candidateParticipants.length,
          totalRounds: rounds.length,
          totalUnassigned: unassigned.length,
          unassignedInterviews: unassigned,
        },
        "Draft schedule generated with explicit availability and conflict checks"
      )
    );
  });
});
// Candidate Self-Booking: search only explicit, eligible, conflict-free slots.
export const getAvailableSlotsForRound = asyncHandler(async (req, res) => {
  const { driveId, roundId } = req.params;
  if (!mongoose.isValidObjectId(driveId) || !mongoose.isValidObjectId(roundId)) {
    throw new ApiError(400, "Invalid drive or round ID");
  }

  const participant = await DriveParticipant.findOne({
    driveId,
    userId: req.user._id,
    role: "candidate",
    status: "active",
  });
  if (!participant) throw new ApiError(403, "You must be an active candidate in this drive to book an interview.");

  const [round, drive, rooms, interviewerParticipants, availabilities, latestPublished, latestDraft, completedInterviews] =
    await Promise.all([
      Round.findOne({ _id: roundId, driveId }),
      Drive.findById(driveId),
      Room.find({ drive: driveId, isActive: true }),
      DriveParticipant.find({ driveId, role: "interviewer", status: "active" })
        .populate("userId", "name email role"),
      Availability.find({ drive: driveId, ownerType: { $in: ["interviewer", "room"] } }),
      ScheduleVersion.findOne({ drive: driveId, status: "published" }).sort({ versionNumber: -1 }),
      ScheduleVersion.findOne({ drive: driveId, status: "draft" }).sort({ versionNumber: -1 }),
      Interview.find({ drive: driveId, status: "completed" })
        .select("candidate interviewer round startTime endTime status"),
    ]);

  if (!round || !drive) throw new ApiError(404, "Drive or round not found");
  if (participant.eligibleRoundIds?.length > 0 && !participant.eligibleRoundIds.some((id) => id.toString() === roundId)) {
    throw new ApiError(403, "This interview round is not unlocked for you.");
  }

  const completedRoundIds = new Set(
    completedInterviews
      .filter((item) => item.candidate.toString() === req.user._id.toString())
      .map((item) => item.round.toString())
  );
  if ((round.prerequisiteRound || []).some((id) => !completedRoundIds.has(id.toString()))) {
    throw new ApiError(409, "Complete the prerequisite interview round before booking this one.");
  }

  const activeVersionIds = [latestPublished?._id, latestDraft?._id].filter(Boolean);
  const scheduledInterviews = activeVersionIds.length > 0
    ? await Interview.find({
        drive: driveId,
        scheduleVersion: { $in: activeVersionIds },
        status: { $in: ["scheduled", "rescheduled"] },
      })
    : [];
  const uniqueScheduledInterviews = dedupeScheduledInterviews(scheduledInterviews);
  if (uniqueScheduledInterviews.some((item) =>
    item.candidate.toString() === req.user._id.toString() &&
    item.round.toString() === roundId
  )) {
    throw new ApiError(409, "You already have a scheduled interview for this round.");
  }

  const durationMs = Number(round.durationMinutes) * 60 * 1000;
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new ApiError(400, "The interview round has an invalid duration.");
  }

  const stepMs = 15 * 60 * 1000;
  const now = Date.now();
  const availableSlots = [];

  for (const part of interviewerParticipants) {
    const interviewer = part.userId;
    if (!interviewer?._id || !matchesSkills(part.metadata?.skills || [], round.requiredSkills || [])) continue;
    const interviewerId = interviewer._id.toString();
    const interviewerWindows = availabilities.filter((item) =>
      item.ownerType === "interviewer" && item.ownerId.toString() === interviewerId
    );

    for (const window of interviewerWindows) {
      const windowStart = new Date(window.startTime).getTime();
      const windowEnd = new Date(window.endTime).getTime();
      let startMs = Math.ceil(Math.max(windowStart, now) / stepMs) * stepMs;

      for (; startMs + durationMs <= windowEnd; startMs += stepMs) {
        const slotStart = new Date(startMs);
        const slotEnd = new Date(startMs + durationMs);
        const dayKey = slotStart.toISOString().slice(0, 10);
        const interviewerDayCount =
          uniqueScheduledInterviews.filter((item) =>
            item.interviewer.toString() === interviewerId &&
            new Date(item.startTime).toISOString().slice(0, 10) === dayKey
          ).length +
          completedInterviews.filter((item) =>
            item.interviewer?.toString() === interviewerId &&
            new Date(item.startTime).toISOString().slice(0, 10) === dayKey
          ).length;
        const rawCapacity = part.metadata?.maxDailyInterviews;
        const capacity = Number.isFinite(Number(rawCapacity)) ? Number(rawCapacity) : 4;
        if (interviewerDayCount >= capacity) continue;

        const participantBusy = [...uniqueScheduledInterviews, ...completedInterviews].some((item) =>
          (item.candidate.toString() === req.user._id.toString() ||
            item.interviewer.toString() === interviewerId) &&
          intervalsOverlap(item.startTime, item.endTime, slotStart, slotEnd)
        );
        if (participantBusy) continue;

        const freeRoom = rooms.find((room) => {
          const roomId = room._id.toString();
          const hasRoomWindow = availabilities.some((item) =>
            item.ownerType === "room" &&
            item.ownerId.toString() === roomId &&
            new Date(item.startTime).getTime() <= slotStart.getTime() &&
            new Date(item.endTime).getTime() >= slotEnd.getTime()
          );
          if (!hasRoomWindow) return false;

          return !uniqueScheduledInterviews.some((item) =>
            item.room &&
            item.room.toString() === roomId &&
            intervalsOverlap(item.startTime, item.endTime, slotStart, slotEnd)
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
    new ApiResponse(200, {
      roundName: round.name,
      durationMinutes: round.durationMinutes,
      totalSlots: availableSlots.length,
      availableSlots,
    }, "Available self-booking slots fetched successfully")
  );
});

// Candidate Self-Booking: revalidate the exact slot under a per-drive write lock.
export const selfBookSlot = asyncHandler(async (req, res) => {
  const { driveId, roundId } = req.params;
  const { startTime, endTime, interviewerId, roomId } = req.body || {};

  if (!req.user?._id) throw new ApiError(401, "Authentication required");
  if (!mongoose.isValidObjectId(driveId) || !mongoose.isValidObjectId(roundId)) {
    throw new ApiError(400, "Invalid drive or round ID");
  }
  if (!mongoose.isValidObjectId(interviewerId) || !mongoose.isValidObjectId(roomId)) {
    throw new ApiError(400, "Valid interviewer and room IDs are required");
  }

  return withDriveScheduleLock(driveId, async () => {
    const slotStart = new Date(startTime);
    const slotEnd = new Date(endTime);
    if (
      Number.isNaN(slotStart.getTime()) ||
      Number.isNaN(slotEnd.getTime()) ||
      slotStart <= new Date() ||
      slotEnd <= slotStart
    ) {
      throw new ApiError(400, "Choose a valid interview slot in the future.");
    }

    const [drive, round, participant, interviewerParticipant, room] = await Promise.all([
      Drive.findById(driveId),
      Round.findOne({ _id: roundId, driveId }),
      DriveParticipant.findOne({ driveId, userId: req.user._id, role: "candidate", status: "active" }),
      DriveParticipant.findOne({ driveId, userId: interviewerId, role: "interviewer", status: "active" }),
      Room.findOne({ _id: roomId, drive: driveId, isActive: true }),
    ]);

    if (!drive || !round) throw new ApiError(404, "Drive or round not found");
    if (!participant) throw new ApiError(403, "You must be an active candidate in this drive to book an interview.");
    if (!interviewerParticipant) throw new ApiError(409, "The selected interviewer is no longer active in this drive.");
    if (!room) throw new ApiError(409, "The selected room is no longer active in this drive.");
    if (participant.eligibleRoundIds?.length > 0 && !participant.eligibleRoundIds.some((id) => id.toString() === roundId)) {
      throw new ApiError(403, "This interview round is not unlocked for you.");
    }

    const durationMs = Number(round.durationMinutes) * 60 * 1000;
    if (slotEnd.getTime() - slotStart.getTime() !== durationMs) {
      throw new ApiError(400, "The selected slot does not match the round duration.");
    }
    if (!matchesSkills(interviewerParticipant.metadata?.skills || [], round.requiredSkills || [])) {
      throw new ApiError(409, "The selected interviewer does not meet this round’s required skills.");
    }

    const prerequisites = round.prerequisiteRound || [];
    if (prerequisites.length > 0) {
      const completed = await Interview.find({
        drive: driveId,
        candidate: req.user._id,
        round: { $in: prerequisites },
        status: "completed",
      }).select("round");
      const completedIds = new Set(completed.map((item) => item.round.toString()));
      if (prerequisites.some((id) => !completedIds.has(id.toString()))) {
        throw new ApiError(409, "Complete the prerequisite interview round before booking this one.");
      }
    }

    const [interviewerWindow, roomWindow, latestPublished, latestDraft] = await Promise.all([
      Availability.exists({
        drive: driveId,
        ownerType: "interviewer",
        ownerId: interviewerId,
        startTime: { $lte: slotStart },
        endTime: { $gte: slotEnd },
      }),
      Availability.exists({
        drive: driveId,
        ownerType: "room",
        ownerId: roomId,
        startTime: { $lte: slotStart },
        endTime: { $gte: slotEnd },
      }),
      ScheduleVersion.findOne({ drive: driveId, status: "published" }).sort({ versionNumber: -1 }),
      ScheduleVersion.findOne({ drive: driveId, status: "draft" }).sort({ versionNumber: -1 }),
    ]);
    if (!interviewerWindow || !roomWindow) {
      throw new ApiError(409, "The selected slot is outside the interviewer’s or room’s availability.");
    }

    const activeVersionIds = [latestPublished?._id, latestDraft?._id].filter(Boolean);
    const collisionQuery = {
      drive: driveId,
      status: { $in: ["scheduled", "rescheduled"] },
      scheduleVersion: { $in: activeVersionIds },
      startTime: { $lt: slotEnd },
      endTime: { $gt: slotStart },
      $or: [
        { candidate: req.user._id },
        { interviewer: interviewerId },
        { room: roomId },
      ],
    };
    const [collision, existingSameRound] = activeVersionIds.length > 0
      ? await Promise.all([
          Interview.exists(collisionQuery),
          Interview.exists({
            drive: driveId,
            scheduleVersion: { $in: activeVersionIds },
            candidate: req.user._id,
            round: roundId,
            status: { $in: ["scheduled", "rescheduled"] },
          }),
        ])
      : [null, null];
    if (collision) {
      throw new ApiError(409, "The selected slot was just taken. Choose another available time.");
    }
    if (existingSameRound) {
      throw new ApiError(409, "You already have a scheduled interview for this round.");
    }

    const dayStart = new Date(slotStart);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const [scheduledTodayRows, completedToday] = await Promise.all([
      activeVersionIds.length > 0
        ? Interview.find({
            drive: driveId,
            scheduleVersion: { $in: activeVersionIds },
            interviewer: interviewerId,
            status: { $in: ["scheduled", "rescheduled"] },
            startTime: { $gte: dayStart, $lt: dayEnd },
          }).select("candidate round interviewer startTime endTime")
        : [],
      Interview.countDocuments({
        drive: driveId,
        interviewer: interviewerId,
        status: "completed",
        startTime: { $gte: dayStart, $lt: dayEnd },
      }),
    ]);
    const scheduledToday = dedupeScheduledInterviews(scheduledTodayRows)
      .filter((item) => item.interviewer.toString() === interviewerId.toString()).length;
    const rawCapacity = interviewerParticipant.metadata?.maxDailyInterviews;
    const capacity = Number.isFinite(Number(rawCapacity)) ? Number(rawCapacity) : 4;
    if (scheduledToday + completedToday >= capacity) {
      throw new ApiError(409, "The interviewer’s daily interview capacity has been reached.");
    }

    let scheduleVersion = latestPublished || latestDraft;
    if (!scheduleVersion) {
      const lastVersion = await ScheduleVersion.findOne({ drive: driveId }).sort({ versionNumber: -1 });
      scheduleVersion = await ScheduleVersion.create({
        drive: driveId,
        versionNumber: lastVersion ? lastVersion.versionNumber + 1 : 1,
        status: "published",
        createdBy: req.user._id,
        changeSummary: "Initialized via Self-Booking Portal",
      });
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

    await notifyDriveEvent({
      driveId,
      type: "interview_booked",
      title: "Interview round scheduled",
      message: `Your ${round.name} interview has been booked. Check your dashboard for the time and room.`,
      entityType: "interview",
      entityId: interview._id,
      userIds: [req.user._id, interviewerId],
    });

    return res.status(201).json(
      new ApiResponse(201, interview, "Interview booked successfully via self-booking portal")
    );
  });
});

// Automated rescheduling: only reassign when the replacement is fully eligible and conflict-free.
export const rescheduleInterview = asyncHandler(async (req, res) => {
  const { interviewId } = req.params;
  const { reason } = req.body || {};
  if (!mongoose.isValidObjectId(interviewId)) throw new ApiError(400, "Invalid interview ID");

  const initial = await Interview.findById(interviewId).select("drive");
  if (!initial) throw new ApiError(404, "Interview not found");

  return withDriveScheduleLock(initial.drive, async () => {
    const interview = await Interview.findById(interviewId)
      .populate("round")
      .populate("candidate", "name email");
    if (!interview) throw new ApiError(404, "Interview not found");

    const isAssignedInterviewer = interview.interviewer.toString() === req.user?._id?.toString();
    const isStaff = ["admin", "coordinator"].includes(req.user?.role);
    if (!isAssignedInterviewer && !isStaff) {
      throw new ApiError(403, "You are not authorized to reschedule this interview");
    }
    if (new Date(interview.startTime) <= new Date()) {
      throw new ApiError(400, "Past interviews cannot be rescheduled.");
    }

    const [interviewerParticipants, versions, availability, room] = await Promise.all([
      DriveParticipant.find({
        driveId: interview.drive,
        role: "interviewer",
        status: "active",
        userId: { $ne: interview.interviewer },
      }).populate("userId", "name email role"),
      ScheduleVersion.find({ drive: interview.drive, status: { $in: ["published", "draft"] } })
        .sort({ versionNumber: -1 })
        .select("_id status versionNumber"),
      Availability.find({
        drive: interview.drive,
        ownerType: { $in: ["interviewer", "room"] },
        startTime: { $lte: interview.startTime },
        endTime: { $gte: interview.endTime },
      }),
      Room.findOne({ _id: interview.room, drive: interview.drive, isActive: true }),
    ]);

    const published = versions.find((version) => version.status === "published");
    const draft = versions.find((version) => version.status === "draft");
    const activeVersionIds = [published?._id, draft?._id].filter(Boolean);
    const slotStart = new Date(interview.startTime);
    const slotEnd = new Date(interview.endTime);
    const dayStart = new Date(slotStart);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const [overlappingInterviews, dayInterviews, completedDayInterviews] = activeVersionIds.length > 0
      ? await Promise.all([
          Interview.find({
            drive: interview.drive,
            scheduleVersion: { $in: activeVersionIds },
            status: { $in: ["scheduled", "rescheduled"] },
            _id: { $ne: interview._id },
            startTime: { $lt: slotEnd },
            endTime: { $gt: slotStart },
          }),
          Interview.find({
            drive: interview.drive,
            scheduleVersion: { $in: activeVersionIds },
            status: { $in: ["scheduled", "rescheduled"] },
            startTime: { $gte: dayStart, $lt: dayEnd },
          }).select("interviewer startTime endTime candidate round"),
          Interview.find({
            drive: interview.drive,
            status: "completed",
            startTime: { $gte: dayStart, $lt: dayEnd },
          }).select("interviewer startTime endTime"),
        ])
      : [[], [], await Interview.find({
          drive: interview.drive,
          status: "completed",
          startTime: { $gte: dayStart, $lt: dayEnd },
        }).select("interviewer startTime endTime")];

    const uniqueDayInterviews = dedupeScheduledInterviews(dayInterviews);
    const replacement = room && interviewerParticipants.find((part) => {
      const user = part.userId;
      if (!user?._id || !matchesSkills(part.metadata?.skills || [], interview.round.requiredSkills || [])) return false;

      const capacityValue = part.metadata?.maxDailyInterviews;
      const capacity = Number.isFinite(Number(capacityValue)) ? Number(capacityValue) : 4;
      const dailyCount =
        uniqueDayInterviews.filter((item) => item.interviewer.toString() === user._id.toString()).length +
        completedDayInterviews.filter((item) => item.interviewer?.toString() === user._id.toString()).length;
      if (dailyCount >= capacity) return false;

      const hasInterviewerWindow = availability.some((item) =>
        item.ownerType === "interviewer" &&
        item.ownerId.toString() === user._id.toString() &&
        new Date(item.startTime) <= slotStart &&
        new Date(item.endTime) >= slotEnd
      );
      if (!hasInterviewerWindow) return false;

      const roomHasWindow = availability.some((item) =>
        item.ownerType === "room" &&
        item.ownerId.toString() === interview.room.toString() &&
        new Date(item.startTime) <= slotStart &&
        new Date(item.endTime) >= slotEnd
      );
      if (!roomHasWindow) return false;

      return !overlappingInterviews.some((item) =>
        item.interviewer.toString() === user._id.toString() ||
        item.candidate.toString() === interview.candidate._id.toString() ||
        item.room?.toString() === interview.room.toString()
      );
    });

    if (!replacement) {
      interview.status = "rescheduled";
      interview.unassignedReason = reason || "No conflict-free qualified interviewer is available for this slot.";
      await interview.save();
      await notifyDriveEvent({
        driveId: interview.drive,
        type: "interview_reschedule_needed",
        title: "Interview needs a new interviewer",
        message: `Your ${interview.round.name} round needs a new interviewer. The coordinator is reviewing it.`,
        entityType: "interview",
        entityId: interview._id,
        userIds: [interview.candidate._id, interview.interviewer],
      });
      return res.status(200).json(
        new ApiResponse(200, interview, "No eligible replacement found. Interview marked for rescheduling.")
      );
    }

    const previousInterviewerId = interview.interviewer;
    interview.interviewer = replacement.userId._id;
    interview.status = "scheduled";
    interview.unassignedReason = "";
    await interview.save();
    await notifyDriveEvent({
      driveId: interview.drive,
      type: "interview_rescheduled",
      title: "Interview assignment updated",
      message: `Your ${interview.round.name} interview assignment has changed. Check your dashboard for details.`,
      entityType: "interview",
      entityId: interview._id,
      userIds: [interview.candidate._id, previousInterviewerId, replacement.userId._id],
    });
    return res.status(200).json(
      new ApiResponse(200, interview, "Interview reassigned to a qualified interviewer without conflicts.")
    );
  });
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

// Publish only a future, conflict-free draft schedule.
export const publishSchedule = asyncHandler(async (req, res) => {
  const { driveId, versionId } = req.params;
  if (!mongoose.isValidObjectId(driveId) || !mongoose.isValidObjectId(versionId)) {
    throw new ApiError(400, "Invalid drive ID or schedule version ID");
  }

  return withDriveScheduleLock(driveId, async () => {
    const targetVersion = await ScheduleVersion.findOne({ _id: versionId, drive: driveId });
    if (!targetVersion) throw new ApiError(404, "Schedule version not found");
    if (targetVersion.status !== "draft") {
      throw new ApiError(400, "Only draft schedule versions can be published");
    }

    const [scheduled, latestPublished] = await Promise.all([
      Interview.find({ scheduleVersion: targetVersion._id, status: "scheduled" }).sort({ startTime: 1 }),
      ScheduleVersion.findOne({ drive: driveId, status: "published" }).sort({ versionNumber: -1 }),
    ]);
    if (scheduled.length === 0) {
      throw new ApiError(400, "Cannot publish a schedule with no scheduled interviews");
    }

    if (latestPublished) {
      const currentAppointments = await Interview.find({
        drive: driveId,
        scheduleVersion: latestPublished._id,
        status: { $in: ["scheduled", "rescheduled"] },
        endTime: { $gt: new Date() },
      }).select("candidate interviewer room round startTime endTime createdAt updatedAt");
      const representedRounds = new Set(
        scheduled.map((item) => `${item.candidate.toString()}_${item.round.toString()}`)
      );
      const unassignedRounds = new Set(
        (targetVersion.unassignedInterviews || []).map((item) =>
          `${item.candidateId.toString()}_${item.roundId.toString()}`
        )
      );
      const droppedAppointment = currentAppointments.some((item) => {
        const key = `${item.candidate.toString()}_${item.round.toString()}`;
        const changedAfterDraft = new Date(item.updatedAt || item.createdAt) > targetVersion.createdAt;
        if (changedAfterDraft) {
          return !scheduled.some((draftItem) =>
            draftItem.candidate.toString() === item.candidate.toString() &&
            draftItem.round.toString() === item.round.toString() &&
            draftItem.interviewer.toString() === item.interviewer.toString() &&
            draftItem.room?.toString() === item.room?.toString() &&
            new Date(draftItem.startTime).getTime() === new Date(item.startTime).getTime() &&
            new Date(draftItem.endTime).getTime() === new Date(item.endTime).getTime()
          );
        }
        return !representedRounds.has(key) && !unassignedRounds.has(key);
      });
      if (droppedAppointment) {
        throw new ApiError(409, "This draft no longer includes every current appointment. Generate it again before publishing.");
      }
    }

    const now = Date.now();
    for (let i = 0; i < scheduled.length; i += 1) {
      const current = scheduled[i];
      if (new Date(current.startTime).getTime() <= now || new Date(current.endTime) <= new Date(current.startTime)) {
        throw new ApiError(409, "This draft contains a past or invalid interview time. Generate a new future schedule before publishing.");
      }
      for (let j = i + 1; j < scheduled.length; j += 1) {
        const other = scheduled[j];
        if (!intervalsOverlap(current.startTime, current.endTime, other.startTime, other.endTime)) continue;
        const sharedResource =
          current.candidate.toString() === other.candidate.toString() ||
          current.interviewer.toString() === other.interviewer.toString() ||
          (current.room && other.room && current.room.toString() === other.room.toString());
        if (sharedResource) {
          throw new ApiError(409, "This draft contains overlapping interviews for the same candidate, interviewer, or room.");
        }
      }
    }

    await ScheduleVersion.updateMany(
      { drive: driveId, status: "published" },
      { $set: { status: "superseded" } }
    );
    targetVersion.status = "published";
    targetVersion.publishedAt = new Date();
    await targetVersion.save();
    await Drive.findByIdAndUpdate(driveId, { status: "scheduled" });

    await notifyDriveEvent({
      driveId,
      type: "schedule_published",
      title: "Interview schedule published",
      message: "A new interview schedule is available. Check your dashboard for your round details.",
      entityType: "schedule",
      entityId: targetVersion._id,
      includeDriveParticipants: true,
    });

    return res.status(200).json(
      new ApiResponse(200, targetVersion, "Schedule published after conflict validation.")
    );
  });
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

// Discard a draft and its appointments while holding the drive lock.
export const discardDraftSchedule = asyncHandler(async (req, res) => {
  const { driveId, versionId } = req.params;
  if (!mongoose.isValidObjectId(driveId) || !mongoose.isValidObjectId(versionId)) {
    throw new ApiError(400, "Invalid drive ID or schedule version ID");
  }

  return withDriveScheduleLock(driveId, async () => {
    const version = await ScheduleVersion.findOne({ _id: versionId, drive: driveId });
    if (!version) throw new ApiError(404, "Schedule version not found");
    if (version.status !== "draft") {
      throw new ApiError(400, "Only draft schedule versions can be discarded");
    }

    await Interview.deleteMany({ scheduleVersion: versionId });
    await ScheduleVersion.findByIdAndDelete(versionId);
    return res.status(200).json(new ApiResponse(200, {}, "Draft schedule discarded successfully"));
  });
});

// Get interviews for the authenticated user (candidate, interviewer, or coordinator)
export const getMyInterviews = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Authentication required");
  }

  const userId = req.user._id;
  const { driveId, status } = req.query;
  if (driveId && !mongoose.isValidObjectId(driveId)) {
    throw new ApiError(400, "Invalid drive ID");
  }
  const validStatuses = ["scheduled", "rescheduled", "completed", "cancelled"];
  if (status && !validStatuses.includes(status)) {
    throw new ApiError(400, `Status must be one of: ${validStatuses.join(", ")}`);
  }

  // Coordinators and admins see all scheduled interviews for the drive
  if (["admin", "coordinator"].includes(req.user.role)) {
    const query = {};
    if (driveId) query.drive = driveId;
    if (status) {
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
        "All drive interviews fetched successfully"
      )
    );
  }

  const participantField =
    req.user.role === "candidate"
      ? "candidate"
      : req.user.role === "interviewer"
        ? "interviewer"
        : null;

  if (!participantField) {
    throw new ApiError(403, "Only candidates, interviewers, and coordinators can view interviews");
  }

  const query = { [participantField]: userId };
  if (driveId) query.drive = driveId;

  const publishedVersions = await ScheduleVersion.find({
    ...(driveId ? { drive: driveId } : {}),
    status: "published",
  }).select("_id");
  const publishedVersionIds = publishedVersions.map((version) => version._id);

  if (status === "scheduled" || status === "rescheduled") {
    query.scheduleVersion = { $in: publishedVersionIds };
    query.status = status;
  } else if (status) {
    query.status = status;
  } else {
    query.$or = [
      {
        scheduleVersion: { $in: publishedVersionIds },
        status: { $in: ["scheduled", "rescheduled"] },
      },
      { status: { $in: ["completed", "cancelled"] } },
    ];
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
