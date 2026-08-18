import express from "express";
import { protect } from '../middleware/authMiddleware.js'
import { authorizeRoles } from '../middleware/roleMiddleware.js'
import {
  createEmergencyRequest,
  getAllEmergencyRequests,
  getEmergencyById,
  updateEmergency,
  deleteEmergency,
  updateEmergencyStatus,
  respondToEmergency,
  smartMatching,
  getPublicEmergencyRequestsToday,
} from "../controllers/EmergencyController.js";

const router = express.Router();

/**
 * Emergency Request Routes
 * Base URL: /api/emergency
 */

// GET /api/emergency/public/today - Get active emergency requests for today
// Public access
router.get("/public/today", getPublicEmergencyRequestsToday);

// POST /api/emergency - Create emergency request
// Protected: Hospital/Admin only
router.post("/", protect, authorizeRoles('admin', 'hospital'), createEmergencyRequest);

// GET /api/emergency - Get all emergency requests
// Protected: Admin/Hospital/Donor
// Query params: status, urgency, bloodType
router.get("/", protect, authorizeRoles('admin', 'hospital', 'donor'), getAllEmergencyRequests);

// GET /api/emergency/:id - Get emergency request by ID
router.get("/:id", protect, authorizeRoles('admin', 'hospital', 'donor'), getEmergencyById);

// PUT /api/emergency/:id - Update emergency request
// Protected: Hospital/Admin only
router.put("/:id", protect, authorizeRoles('admin', 'hospital'), updateEmergency);

// DELETE /api/emergency/:id - Delete emergency request
// Protected: Hospital/Admin only
router.delete("/:id", protect, authorizeRoles('admin', 'hospital'), deleteEmergency);

// PATCH /api/emergency/:id/status - Update emergency status
// Protected: Hospital/Admin only
// Body: { status: "Pending|Searching|Matched|Completed|Cancelled" }
router.patch("/:id/status", protect, authorizeRoles('admin', 'hospital'), updateEmergencyStatus);

// POST /api/emergency/:id/respond - Donor accepts or rejects an emergency request
// Protected: Donor only
// Body: { response: "Accepted|Rejected" }
router.post("/:id/respond", protect, authorizeRoles('donor'), respondToEmergency);

// GET /api/emergency/:id/match - Smart matching for donors
// Protected: Hospital/Admin only
router.get("/:id/match", protect, authorizeRoles('admin', 'hospital'), smartMatching);

export default router;
