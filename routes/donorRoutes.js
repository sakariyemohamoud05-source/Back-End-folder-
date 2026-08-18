import express from 'express'
import {
  createDonor,
  updateDonor,
  deleteDonor,
  searchDonors,
  getDonorById,
  getDonorEligibility,
  addDonationRecord,
  updateDonationRecord,
  deleteDonationRecord,
  getDonationHistory,
} from '../controllers/DonorController.js'
import { protect } from '../middleware/authMiddleware.js'
import { authorizeRoles } from '../middleware/roleMiddleware.js'

const router = express.Router()

router.post('/', protect, authorizeRoles('admin', 'hospital'), createDonor)
router.put('/:id', protect, authorizeRoles('admin', 'hospital', 'donor'), updateDonor)
router.delete('/:id', protect, authorizeRoles('admin', 'hospital'), deleteDonor)
router.get('/', protect, authorizeRoles('admin', 'hospital', 'donor'), searchDonors)
router.get('/search', protect, authorizeRoles('admin', 'hospital', 'donor'), searchDonors)
router.get('/:id', protect, authorizeRoles('admin', 'hospital', 'donor'), getDonorById)
router.get('/:id/eligibility', protect, authorizeRoles('admin', 'hospital', 'donor'), getDonorEligibility)
router.post('/:id/donations', protect, authorizeRoles('admin', 'hospital'), addDonationRecord)
router.put('/:id/donations/:donationId', protect, authorizeRoles('admin', 'hospital'), updateDonationRecord)
router.delete('/:id/donations/:donationId', protect, authorizeRoles('admin', 'hospital'), deleteDonationRecord)
router.get('/:id/history', protect, authorizeRoles('admin', 'hospital', 'donor'), getDonationHistory)

export default router
