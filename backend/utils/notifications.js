import mongoose from "mongoose";
import { Drive } from "../models/Drive.model.js";
import { DriveParticipant } from "../models/DriveParticipant.model.js";
import { Notification } from "../models/Notification.model.js";

// Create in-app inbox entries for the drive owner and the users affected by an event.
// Notification failures must not undo a successfully saved interview or schedule.
export async function notifyDriveEvent({
  driveId,
  type,
  title,
  message,
  entityType = "",
  entityId = null,
  userIds = [],
  includeDriveParticipants = false,
}) {
  try {
    const drive = await Drive.findById(driveId).select("createdBy");
    if (!drive) return;

    const recipients = new Set();
    if (drive.createdBy) recipients.add(drive.createdBy.toString());
    for (const userId of userIds) {
      if (userId && mongoose.isValidObjectId(userId)) recipients.add(userId.toString());
    }

    if (includeDriveParticipants) {
      const participants = await DriveParticipant.find({
        driveId,
        status: "active",
      }).select("userId");
      for (const participant of participants) {
        if (participant.userId) recipients.add(participant.userId.toString());
      }
    }

    const documents = [...recipients].map((recipient) => ({
      recipient,
      drive: driveId,
      type,
      title,
      message,
      entityType,
      entityId,
    }));

    if (documents.length > 0) await Notification.insertMany(documents, { ordered: false });
  } catch (error) {
    console.error("Could not save in-app notifications:", error.message);
  }
}
