import express from "express";
import {
  sendNotification,
  getUserNotifications,
  getHospitalSentNotifications,
  markAsRead,
  markAllAsRead,
  markAllHospitalSentRead,
  deleteNotification,
} from "../controllers/NotificationController.js";
import { protect } from '../middleware/authMiddleware.js'
import { authorizeRoles } from '../middleware/roleMiddleware.js'

const router = express.Router();

/**
 * Notification Routes
 * Base URL: /api/notification
 */

// POST /api/notification - Send notification
// Protected: Admin/Hospital only
// Body: { recipient, title, message, type?, relatedEmergency? }
router.post("/", protect, authorizeRoles('admin', 'hospital'), sendNotification);

// GET /api/notification/user/:userId - Get all notifications for user
// Protected: Admin/Donor
// Query params: isRead (optional)
router.get("/user/:userId", protect, authorizeRoles('admin', 'donor'), getUserNotifications);

// GET /api/notification/sent - Get notifications sent by the authenticated hospital
// Protected: Hospital
// Query params: isRead (optional)
router.get("/sent", protect, authorizeRoles('hospital'), getHospitalSentNotifications);

// PATCH /api/notification/:id/read - Mark notification as read
// Protected: Admin/Hospital/Donor
router.patch("/:id/read", protect, authorizeRoles('admin', 'hospital', 'donor'), markAsRead);

// PATCH /api/notification/read-all/:userId - Mark all user notifications as read
// Protected: Admin/Donor
router.patch("/read-all/:userId", protect, authorizeRoles('admin', 'donor'), markAllAsRead);

// PATCH /api/notification/read-all/sent - Mark all hospital-sent notifications as read
// Protected: Hospital
router.patch("/read-all/sent", protect, authorizeRoles('hospital'), markAllHospitalSentRead);

// DELETE /api/notification/:id - Delete notification
// Protected: Admin, Hospital, Donor
router.delete("/:id", protect, authorizeRoles('admin', 'hospital', 'donor'), deleteNotification);

export default router;
