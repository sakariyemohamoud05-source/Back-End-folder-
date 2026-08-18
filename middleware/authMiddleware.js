import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import Hospital from '../models/Hospital.js'

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_AUTH === 'true') {
        req.user = {
          id: 'dev-admin',
          email: 'admin@bloodbank.local',
          role: 'admin',
          userType: 'User'
        }
        return next()
      }

      return res.status(401).json({ error: 'Not authorized, token missing' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'blood-bank-secret'
    )

    const Model = decoded.userType === 'Hospital' ? Hospital : User
    const user = await Model.findById(decoded.id).select('-password')

    if (!user) {
      return res.status(401).json({ error: 'Not authorized, user not found' })
    }

    req.user = {
      id: user._id,
      email: user.email,
      role: decoded.userType === 'Hospital' ? 'hospital' : user.role,
      userType: decoded.userType || 'User'
    }

    next()
  } catch (error) {
    if (process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_AUTH === 'true') {
      req.user = {
        id: 'dev-admin',
        email: 'admin@bloodbank.local',
        role: 'admin',
        userType: 'User'
      }
      return next()
    }

    return res.status(401).json({ error: 'Not authorized, invalid token' })
  }
}
