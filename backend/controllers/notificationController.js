import mongoose from "mongoose";
import { Notification } from "../models/Notification.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const getMyNotifications = asyncHandler(async (req, res) => {
  const requestedLimit = Number(req.query.limit) || 30;
  const limit = Math.min(Math.max(requestedLimit, 1), 100);
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(limit),
    Notification.countDocuments({ recipient: req.user._id, readAt: null }),
  ]);

  return res.status(200).json(
    new ApiResponse(200, { notifications, unreadCount }, "Notifications fetched successfully")
  );
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  if (!mongoose.isValidObjectId(notificationId)) throw new ApiError(400, "Invalid notification ID");

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: req.user._id, readAt: null },
    { $set: { readAt: new Date() } },
    { new: true }
  );
  if (!notification) {
    const existing = await Notification.exists({ _id: notificationId, recipient: req.user._id });
    if (!existing) throw new ApiError(404, "Notification not found");
    return res.status(200).json(new ApiResponse(200, existing, "Notification was already read"));
  }

  return res.status(200).json(new ApiResponse(200, notification, "Notification marked as read"));
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, readAt: null },
    { $set: { readAt: new Date() } }
  );
  return res.status(200).json(new ApiResponse(200, {}, "All notifications marked as read"));
});
