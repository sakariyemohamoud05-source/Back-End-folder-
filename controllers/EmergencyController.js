import EmergencyRequest from "../models/EmergencyRequest.js";
import Notification from "../models/Notification.js";
import Donor from "../models/Donor.js";
import Hospital from "../models/Hospital.js";
import User from "../models/User.js";
import { sendEmail } from "../utils/sendEmail.js";

const getHospitalIdString = (hospital) => {
  if (!hospital) return null
  if (hospital._id) return hospital._id.toString()
  return hospital.toString()
}

/**
 * Create a new emergency request
 * @route POST /api/emergency
 * @access Protected - Hospital/Admin only
 */
export const createEmergencyRequest = async (req, res) => {
  try {
    const requestedHospital = req.user?.role === 'hospital' ? req.user.id : req.body.hospital
    const { bloodType, unitsRequired, urgency, location, contactPerson, phone } = req.body;

    // Validate required fields
    if (!requestedHospital || !bloodType || !unitsRequired) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields: hospital, bloodType, unitsRequired",
      });
    }

    let hospitalDocument = await Hospital.findById(requestedHospital);
    let userHospital = null

    if (!hospitalDocument) {
      userHospital = await User.findById(requestedHospital).select('username email role');
      if (!userHospital || userHospital.role !== 'hospital') {
        return res.status(404).json({
          success: false,
          message: "Selected hospital not found",
        });
      }

      hospitalDocument = {
        _id: userHospital._id,
        name: userHospital.username || userHospital.email,
        district: undefined,
      };
    }

    const requestLocation = location || hospitalDocument.district;
    if (!requestLocation) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid district location for the emergency request",
      });
    }

    const normalizedPhone = phone ? String(phone).trim().replace(/\s|[-()\.]/g, '') : undefined

    let emergencyRequest = await EmergencyRequest.create({
      hospital: requestedHospital,
      hospitalModel: userHospital ? 'User' : 'Hospital',
      bloodType: bloodType.toUpperCase(),
      unitsRequired,
      urgency: urgency || "Medium",
      location: requestLocation,
      contactPerson,
      phone: normalizedPhone,
      status: "Pending",
      matchedDonors: [],
    });

    const matchFilter = {
      bloodGroup: emergencyRequest.bloodType,
      eligibilityStatus: true,
    };
    if (emergencyRequest.location !== 'All Districts') {
      matchFilter.district = emergencyRequest.location;
    }

    const matchedDonors = await Donor.find(matchFilter).select("fullName email bloodGroup district eligibilityStatus");

    const donorIds = matchedDonors.map((donor) => donor._id);
    const updatedStatus = donorIds.length > 0 ? "Matched" : "Searching";

    if (donorIds.length > 0) {
      const notificationPromises = donorIds.map((donorId) =>
        Notification.create({
          recipient: donorId,
          sender: emergencyRequest.hospital,
          title: "Emergency Blood Request",
          message: `Emergency blood request for ${emergencyRequest.bloodType}. Urgency: ${emergencyRequest.urgency}. Please respond if available.`,
          type: "Emergency",
          relatedEmergency: emergencyRequest._id,
        })
      );
      await Promise.all(notificationPromises);

      // Send emails to all matched donors
      const hospitalName = hospitalDocument.name || "a hospital";
      const hospitalLocation = [hospitalDocument.district, hospitalDocument.address].filter(Boolean).join(', ') || 'Unknown Location';
      const emailPromises = matchedDonors.map((donor) => {
        if (donor.email) {
          return sendEmail({
            email: donor.email,
            subject: `LifeLink Hub: Emergency Blood Request - ${emergencyRequest.bloodType}`,
            message: `Hello ${donor.fullName},\n\nYou have been matched to an Emergency Blood Request from ${hospitalName}.\n\nBlood Type Needed: ${emergencyRequest.bloodType}\nUrgency: ${emergencyRequest.urgency}\nHospital Location: ${hospitalLocation}\n\nPlease log in to your LifeLink Hub account and respond as soon as possible.\n\nThank you for being a hero!\nLifeLink Hub Team`,
          });
        }
      });
      await Promise.all(emailPromises);
    }

    // System Notification for Admin and Hospital
    const hospitalNameStr = hospitalDocument.name || "a hospital";
    await Notification.create({
      recipient: null, // System-wide notification (for Admins)
      sender: emergencyRequest.hospital,
      title: "New Emergency Request Created",
      message: `${hospitalNameStr} created an emergency request for ${unitsRequired} units of ${emergencyRequest.bloodType} (${urgency} urgency).`,
      type: "System",
      relatedEmergency: emergencyRequest._id,
    });

    emergencyRequest = await EmergencyRequest.findByIdAndUpdate(
      emergencyRequest._id,
      {
        matchedDonors: donorIds,
        status: updatedStatus,
      },
      { new: true }
    )
      .populate("hospital")
      .populate("matchedDonors", "fullName email bloodGroup district eligibilityStatus")
      .populate("donorResponses.donor", "fullName email bloodGroup district");

    return res.status(201).json({
      success: true,
      message: donorIds.length > 0
        ? `Emergency request created and ${donorIds.length} matching donors notified`
        : "Emergency request created; no eligible donors found yet",
      data: emergencyRequest,
    });
  } catch (error) {
    console.error("Error creating emergency request:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while creating emergency request",
    });
  }
};

/**
 * Get all emergency requests
 * @route GET /api/emergency
 * @access Public
 */
export const getAllEmergencyRequests = async (req, res) => {
  try {
    const { status, urgency, bloodType } = req.query;

    // Build filter object
    let filter = {};
    if (status) filter.status = status;
    if (urgency) filter.urgency = urgency;
    if (bloodType) filter.bloodType = bloodType.toUpperCase();
    if (req.user?.role === 'hospital') filter.hospital = req.user.id;

    const emergencies = await EmergencyRequest.find(filter)
      .populate("hospital")
      .populate("matchedDonors", "fullName email bloodGroup district eligibilityStatus")
      .populate("donorResponses.donor", "fullName email bloodGroup district")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Emergency requests retrieved successfully",
      count: emergencies.length,
      data: emergencies,
    });
  } catch (error) {
    console.error("Error fetching emergency requests:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching emergency requests",
    });
  }
};

/**
 * Get emergency request by ID
 * @route GET /api/emergency/:id
 * @access Public
 */
export const getEmergencyById = async (req, res) => {
  try {
    const { id } = req.params;

    const emergency = await EmergencyRequest.findById(id)
      .populate("hospital")
      .populate("matchedDonors", "fullName email bloodGroup district eligibilityStatus")
      .populate("donorResponses.donor", "fullName email bloodGroup district");

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: "Emergency request not found",
      });
    }

    const emergencyHospitalId = getHospitalIdString(emergency.hospital)
    if (req.user?.role === 'hospital' && emergencyHospitalId !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    return res.status(200).json({
      success: true,
      message: "Emergency request retrieved successfully",
      data: emergency,
    });
  } catch (error) {
    console.error("Error fetching emergency request:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching emergency request",
    });
  }
};

/**
 * Update emergency request
 * @route PUT /api/emergency/:id
 * @access Protected - Hospital/Admin only
 */
export const updateEmergency = async (req, res) => {
  try {
    const { id } = req.params;
    const { bloodType, unitsRequired, urgency, location, contactPerson, phone } = req.body;

    const existingEmergency = await EmergencyRequest.findById(id)
    if (!existingEmergency) {
      return res.status(404).json({ success: false, message: 'Emergency request not found' })
    }

    if (req.user?.role === 'hospital' && existingEmergency.hospital.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    const emergency = await EmergencyRequest.findByIdAndUpdate(
      id,
      {
        bloodType: bloodType ? bloodType.toUpperCase() : undefined,
        unitsRequired,
        urgency,
        location,
        contactPerson,
        phone,
      },
      { new: true, runValidators: true }
    )
      .populate("hospital")
      .populate("matchedDonors", "fullName email bloodGroup district eligibilityStatus");

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: "Emergency request not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Emergency request updated successfully",
      data: emergency,
    });
  } catch (error) {
    console.error("Error updating emergency request:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while updating emergency request",
    });
  }
};

/**
 * Delete emergency request
 * @route DELETE /api/emergency/:id
 * @access Protected - Hospital/Admin only
 */
export const deleteEmergency = async (req, res) => {
  try {
    const { id } = req.params;

    const emergency = await EmergencyRequest.findById(id);
    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: "Emergency request not found",
      });
    }

    const emergencyHospitalId = getHospitalIdString(emergency.hospital)
    if (req.user?.role === 'hospital' && emergencyHospitalId !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    await emergency.deleteOne();

    // Delete associated notifications
    await Notification.deleteMany({ relatedEmergency: id });

    return res.status(200).json({
      success: true,
      message: "Emergency request deleted successfully",
      data: emergency,
    });
  } catch (error) {
    console.error("Error deleting emergency request:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting emergency request",
    });
  }
};

/**
 * Update emergency status
 * @route PATCH /api/emergency/:id/status
 * @access Protected - Hospital/Admin only
 */
export const updateEmergencyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ["Pending", "Searching", "Matched", "Completed", "Cancelled"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${validStatuses.join(", ")}`,
      });
    }

    const existingEmergency = await EmergencyRequest.findById(id)
    if (!existingEmergency) {
      return res.status(404).json({ success: false, message: 'Emergency request not found' })
    }



    const emergency = await EmergencyRequest.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    )
      .populate("hospital")
      .populate("matchedDonors", "fullName email bloodGroup district eligibilityStatus")
      .populate("donorResponses.donor", "fullName email bloodGroup district");

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: "Emergency request not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Emergency status updated to ${status}`,
      data: emergency,
    });
  } catch (error) {
    console.error("Error updating emergency status:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating emergency status",
    });
  }
};

/**
 * Smart matching - Find and match compatible donors
 * @route GET /api/emergency/:id/match
 * @access Protected - Hospital/Admin only
 * Matching rules:
 * 1. Blood type matches emergency bloodType
 * 2. Donor available status
 * 3. Valid donation interval
 * 4. Location proximity
 */
export const respondToEmergency = async (req, res) => {
  try {
    const { id } = req.params
    const { response } = req.body

    const validResponses = ['Accepted', 'Rejected']
    if (!response || !validResponses.includes(response)) {
      return res.status(400).json({ success: false, message: `Response must be one of: ${validResponses.join(', ')}` })
    }

    if (req.user?.role !== 'donor') {
      return res.status(403).json({ success: false, message: 'Only donors can respond to emergency requests' })
    }

    const donorRecord = await Donor.findOne({ user: req.user.id })
    if (!donorRecord) {
      return res.status(404).json({ success: false, message: 'Donor profile not found' })
    }

    const emergency = await EmergencyRequest.findById(id)
    if (!emergency) {
      return res.status(404).json({ success: false, message: 'Emergency request not found' })
    }

    const isMatched = emergency.matchedDonors.some((matched) => matched.toString() === donorRecord._id.toString())
    if (!isMatched) {
      return res.status(403).json({ success: false, message: 'You are not matched to this emergency request' })
    }

    const existingResponse = emergency.donorResponses.find((item) => item.donor.toString() === donorRecord._id.toString())
    if (existingResponse) {
      existingResponse.status = response
      existingResponse.respondedAt = new Date()
    } else {
      emergency.donorResponses.push({
        donor: donorRecord._id,
        status: response,
        respondedAt: new Date(),
      })
    }

    await emergency.save()

    const populatedEmergency = await EmergencyRequest.findById(id)
      .populate('hospital')
      .populate('matchedDonors', 'fullName email bloodGroup district eligibilityStatus')
      .populate('donorResponses.donor', 'fullName email bloodGroup district')

    return res.status(200).json({
      success: true,
      message: `Emergency request ${response.toLowerCase()} successfully`,
      data: populatedEmergency,
    })
  } catch (error) {
    console.error('Error responding to emergency:', error)
    return res.status(500).json({ success: false, message: 'Server error while responding to emergency request' })
  }
}

export const smartMatching = async (req, res) => {
  try {
    const { id } = req.params;

    // Find emergency request
    const emergency = await EmergencyRequest.findById(id);

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: "Emergency request not found",
      });
    }

    const emergencyHospitalId = getHospitalIdString(emergency.hospital)
    if (req.user?.role === 'hospital' && emergencyHospitalId !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    const matchFilter = {
      bloodGroup: emergency.bloodType,
      eligibilityStatus: true,
    };
    if (emergency.location !== 'All Districts') {
      matchFilter.district = emergency.location;
    }

    const matchedDonors = await Donor.find(matchFilter).select("fullName email bloodGroup district eligibilityStatus");

    if (matchedDonors.length === 0) {
      const updatedEmergency = await EmergencyRequest.findByIdAndUpdate(
        id,
        { status: "Searching" },
        { new: true }
      ).populate("hospital");

      return res.status(200).json({
        success: true,
        message: "No matching eligible donors found for this district and blood type",
        data: updatedEmergency,
      });
    }

    const donorIds = matchedDonors.map((donor) => donor._id);

    const updatedEmergency = await EmergencyRequest.findByIdAndUpdate(
      id,
      {
        matchedDonors: donorIds,
        status: "Matched",
      },
      { new: true }
    )
      .populate("hospital")
      .populate("matchedDonors", "fullName email bloodGroup district eligibilityStatus")
      .populate("donorResponses.donor", "fullName email bloodGroup district");

    const notificationPromises = donorIds.map((donorId) =>
      Notification.create({
        recipient: donorId,
        title: "Emergency Blood Request",
        message: `Emergency blood request for ${emergency.bloodType}. Urgency: ${emergency.urgency}. Please respond if available.`,
        type: "Emergency",
        relatedEmergency: id,
      })
    );

    await Promise.all(notificationPromises);

    // Send emails to all matched donors
    const hospitalName = updatedEmergency.hospital?.name || updatedEmergency.hospital?.username || "a hospital";
    const hospitalLocation = [updatedEmergency.hospital?.district, updatedEmergency.hospital?.address].filter(Boolean).join(', ') || 'Unknown Location';
    const emailPromises = matchedDonors.map((donor) => {
      if (donor.email) {
        return sendEmail({
          email: donor.email,
          subject: `LifeLink Hub: Emergency Blood Request - ${emergency.bloodType}`,
          message: `Hello ${donor.fullName},\n\nYou have been matched to an Emergency Blood Request from ${hospitalName}.\n\nBlood Type Needed: ${emergency.bloodType}\nUrgency: ${emergency.urgency}\nHospital Location: ${hospitalLocation}\n\nPlease log in to your LifeLink Hub account and respond as soon as possible.\n\nThank you for being a hero!\nLifeLink Hub Team`,
        });
      }
    });
    await Promise.all(emailPromises);

    return res.status(200).json({
      success: true,
      message: `${donorIds.length} matching donors found and notified`,
      data: updatedEmergency,
    });
  } catch (error) {
    console.error("Error in smart matching:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while performing smart matching",
    });
  }
};

/**
 * Get all active emergency requests for today (Public)
 * @route GET /api/emergency/public/today
 * @access Public
 */
export const getPublicEmergencyRequestsToday = async (req, res) => {
  try {
    // Fetch all active emergency requests (Pending, Searching, Matched)
    const emergencies = await EmergencyRequest.find({
      status: { $nin: ['Completed', 'Cancelled'] }
    })
      .populate("hospital", "name username district email phone address")
      .select("-matchedDonors -donorResponses") // Exclude sensitive donor information
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Public active emergency requests retrieved successfully",
      count: emergencies.length,
      data: emergencies,
    });
  } catch (error) {
    console.error("Error fetching public emergency requests:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching public emergency requests",
    });
  }
};
