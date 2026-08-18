import Notification from "../models/Notification.js";
import Donor from "../models/Donor.js";
import { sendEmail } from "../utils/sendEmail.js";

/**
 * Send a notification to a user
 * @route POST /api/notification
 * @access Protected - Admin/System
 */
export const sendNotification = async (req, res) => {
  try {
    const { recipient, title, message, type, relatedEmergency } = req.body;

    // Validate required fields
    if (!recipient || !title || !message) {
      return res.status(400).json({
        success: false,
        message: "Please provide recipient, title, and message",
      });
    }

    // Create notification
    const notificationPayload = {
      recipient,
      title,
      message,
      type: type || "System",
      relatedEmergency: relatedEmergency || null,
      isRead: false,
    }

    if (req.user?.role === 'hospital') {
      notificationPayload.sender = req.user.id
    }

    const notification = await Notification.create(notificationPayload)

    // Populate recipient details
    await notification.populate("recipient", "fullName email bloodGroup district eligibilityStatus")
    await notification.populate("sender", "name email district")

    // Send email to the donor
    try {
      const donor = await Donor.findById(recipient).select("email fullName");
      if (donor && donor.email) {
        await sendEmail({
          email: donor.email,
          subject: `LifeLink Hub: ${title}`,
          message: `Hello ${donor.fullName},\n\nYou have a new notification from LifeLink Hub:\n\n${title}\n${message}\n\nPlease log in to your account for more details.\n\nThank you,\nLifeLink Hub Team`,
        });
      }
    } catch (emailErr) {
      console.error("Failed to send notification email:", emailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Notification sent successfully",
      data: notification,
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while sending notification",
    });
  }
};


/**
 * Get all notifications for a specific user
 * @route GET /api/notification/user/:userId
 * @access Protected - User/Admin
 */
export const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isRead } = req.query;

    // For donors: verify they can only access their own notifications
    if (req.user && req.user.role === 'donor') {
      const DonorModel = Notification.db.model('Donor')
      const donor = await DonorModel.findById(userId)
      if (!donor) {
        return res.status(404).json({ success: false, message: 'Donor not found' })
      }
      // Allow if donor._id matches the userId OR donor.user matches the user id
      const isOwner = donor._id.toString() === userId || 
                      (donor.user && donor.user.toString() === req.user.id.toString())
      if (!isOwner) {
        return res.status(403).json({ success: false, message: 'Access denied' })
      }
    }

    const isAdmin = req.user?.role === 'admin'
    // Admin with 'all' gets all notifications including system-wide ones
    const filter = isAdmin && userId === 'all'
      ? {}
      : { recipient: userId }

    if (isRead !== undefined) {
      filter.isRead = isRead === "true";
    }

    const notifications = await Notification.find(filter)
      .populate("recipient", "fullName email bloodGroup district eligibilityStatus")
      .populate({ path: "relatedEmergency", populate: { path: "hospital", select: "name username email district address" } })
      .populate("sender", "name email district username")
      .sort({ createdAt: -1 });

    const unreadCount = await Notification.countDocuments({
      ...(isAdmin && userId === 'all' ? {} : { recipient: userId }),
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      message: "Notifications retrieved successfully",
      count: notifications.length,
      unreadCount,
      data: notifications,
    });
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching notifications",
    });
  }
};

export const getHospitalSentNotifications = async (req, res) => {
  try {
    if (req.user?.role !== 'hospital') {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    const { isRead } = req.query
    const hospitalId = req.user.id || req.user._id

    const filter = {
      $or: [
        { sender: hospitalId },
        { recipient: hospitalId },
      ],
    }

    if (isRead !== undefined) {
      filter.isRead = isRead === 'true'
    }

    const notifications = await Notification.find(filter)
      .populate('recipient', 'fullName email bloodGroup district eligibilityStatus name username')
      .populate('sender', 'name email district username')
      .populate({ path: "relatedEmergency", populate: { path: "hospital", select: "name username email" } })
      .sort({ createdAt: -1 })

    const unreadCount = await Notification.countDocuments({ ...filter, isRead: false })

    return res.status(200).json({
      success: true,
      message: 'Hospital notifications retrieved successfully',
      count: notifications.length,
      unreadCount,
      data: notifications,
    })
  } catch (error) {
    console.error('Error fetching hospital sent notifications:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching notifications',
    })
  }
}

export const markAllHospitalSentRead = async (req, res) => {
  try {
    if (req.user?.role !== 'hospital') {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    const result = await Notification.updateMany(
      { sender: req.user.id, isRead: false },
      { isRead: true }
    )

    const notifications = await Notification.find({ sender: req.user.id })
      .populate('recipient', 'fullName email bloodGroup district eligibilityStatus')
      .populate('sender', 'name email district')
      .populate('relatedEmergency', 'bloodType urgency status location')
      .sort({ createdAt: -1 })

    return res.status(200).json({
      success: true,
      message: `${result.modifiedCount} sent notifications marked as read`,
      modifiedCount: result.modifiedCount,
      data: notifications,
    })
  } catch (error) {
    console.error('Error marking hospital sent notifications as read:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error while marking notifications as read',
    })
  }
}

/**
 * @route PATCH /api/notification/:id/read
 * @access Protected - User/Admin
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    // Update notification
    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    )
      .populate("recipient", "fullName email bloodGroup district eligibilityStatus")
      .populate("relatedEmergency", "bloodType urgency status location");

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while marking notification as read",
    });
  }
};

/**
 * Mark all notifications as read for a user
 * @route PATCH /api/notification/read-all/:userId
 * @access Protected - User/Admin
 */
export const markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;

    // Update all unread notifications
    const result = await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );

    // Fetch updated notifications
    const notifications = await Notification.find({ recipient: userId })
      .populate("recipient", "fullName email bloodGroup district eligibilityStatus")
      .populate("relatedEmergency", "bloodType urgency status location")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      modifiedCount: result.modifiedCount,
      data: notifications,
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while marking notifications as read",
    });
  }
};

/**
 * Delete a notification
 * @route DELETE /api/notification/:id
 * @access Protected - User/Admin
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
      data: notification,
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting notification",
    });
  }
};
