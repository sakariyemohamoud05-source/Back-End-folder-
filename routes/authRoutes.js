import express from 'express'
import { registerUser, loginUser, getProfile, getAllUsers, resetPassword, updateUserRole, updateUser, deleteUser } from '../controllers/authController.js'
import { protect } from '../middleware/authMiddleware.js'
import { authorizeRoles } from '../middleware/roleMiddleware.js'

const router = express.Router()

router.post('/register', registerUser)
router.post('/login', loginUser)
router.post('/reset-password', resetPassword)
router.get('/me', protect, getProfile)
router.get('/users', protect, authorizeRoles('admin'), getAllUsers)
router.put('/users/:id/role', protect, authorizeRoles('admin'), updateUserRole)
router.put('/users/:id', protect, authorizeRoles('admin'), updateUser)
router.delete('/users/:id', protect, authorizeRoles('admin'), deleteUser)

export default router;