import express from 'express';
import { protect } from '../middleware/authMiddleware.js'
import { authorizeRoles } from '../middleware/roleMiddleware.js'
import { generateSystemReport } from '../controllers/ReportController.js';

const router = express.Router();
router.get('/', protect, authorizeRoles('admin', 'hospital'), generateSystemReport);

export default router;