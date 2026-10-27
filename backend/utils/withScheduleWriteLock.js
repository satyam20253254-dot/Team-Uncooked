import { randomUUID } from "node:crypto";
import { ScheduleMutex } from "../models/ScheduleMutex.model.js";
import { ApiError } from "./ApiError.js";

const LOCK_LEASE_MS = 10 * 60 * 1000;

// A renewable per-drive lease serializes generation, booking, and rescheduling.
export async function withDriveScheduleLock(driveId, operation) {
  try {
    await ScheduleMutex.updateOne(
      { _id: driveId },
      { $setOnInsert: { revision: 0 } },
      { upsert: true }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
  }

  const token = randomUUID();
  const now = new Date();
  const acquired = await ScheduleMutex.updateOne(
    {
      _id: driveId,
      $or: [
        { lockedUntil: null },
        { lockedUntil: { $lte: now } },
      ],
    },
    {
      $set: {
        lockedBy: token,
        lockedUntil: new Date(now.getTime() + LOCK_LEASE_MS),
      },
      $inc: { revision: 1 },
    }
  );

  if (acquired.modifiedCount !== 1) {
    throw new ApiError(409, "This drive schedule is being updated. Please retry in a moment.");
  }

  const heartbeat = setInterval(() => {
    ScheduleMutex.updateOne(
      { _id: driveId, lockedBy: token },
      { $set: { lockedUntil: new Date(Date.now() + LOCK_LEASE_MS) } }
    ).catch((error) => console.error("Could not renew schedule lock:", error));
  }, LOCK_LEASE_MS / 3);
  heartbeat.unref?.();

  try {
    return await operation();
  } finally {
    clearInterval(heartbeat);
    await ScheduleMutex.updateOne(
      { _id: driveId, lockedBy: token },
      { $set: { lockedBy: null, lockedUntil: null } }
    );
  }
}
