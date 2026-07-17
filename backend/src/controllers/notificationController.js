import Notification from '../models/notification.js';
import { sendSuccess } from '../utils/response.js';

// GET /api/notifications — get user's notifications
export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      isRead: false
    });

    return sendSuccess(res, 200, 'Notifications fetched', {
      notifications,
      unreadCount
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/notifications/read-all — mark all as read
export const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true }
    );
    return sendSuccess(res, 200, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/notifications/:id/read — mark single as read
export const markRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true }
    );
    return sendSuccess(res, 200, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/notifications/:id — delete one notification
export const deleteNotification = async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    return sendSuccess(res, 200, 'Notification deleted');
  } catch (err) {
    next(err);
  }
};

// Utility: create a notification (used internally by order controller)
export const createNotification = async ({ userId, title, message, type = 'system', icon = '🔔', link = '' }) => {
  try {
    await Notification.create({ user: userId, title, message, type, icon, link });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
};
