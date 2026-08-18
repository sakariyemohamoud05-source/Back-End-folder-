
import express from 'express';
import { protect } from '../middleware/authMiddleware.js'
import { authorizeRoles } from '../middleware/roleMiddleware.js'
import { getDashboardStats } from '../controllers/DashboardController.js';

const router = express.Router()

router.get('/', protect, authorizeRoles('admin', 'hospital'), getDashboardStats)

export default router
