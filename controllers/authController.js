import User from '../models/User.js'
import Hospital from '../models/Hospital.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const getToken = (user, userType = 'User') => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      userType,
    },
    process.env.JWT_SECRET || 'blood-bank-secret',
    { expiresIn: '1h' }
  )
}

// register a new user
export const registerUser = async (req, res) => {
  try {
    const { username, email, password, role } = req.body

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const normalizedRole = role === 'admin' ? 'admin' : role === 'hospital' ? 'hospital' : 'donor'

    const user = new User({
      username,
      email,
      password: hashedPassword,
      role: normalizedRole
    })

    await user.save()
    res.status(201).json({ message: 'User registered successfully' })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

// login a user
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body

    let user = await Hospital.findOne({ email })
    let userType = 'Hospital'

    if (!user) {
      user = await User.findOne({ email })
      userType = 'User'
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid username or password' })
    }

    const token = getToken(user, userType)
    const profile = {
      id: user._id,
      email: user.email,
      role: user.role,
      userType,
    }

    // if this is a donor user, attach donorId when possible
    if (user.role === 'donor') {
      const donorRecord = await User.db.model('Donor').findOne({ user: user._id }).select('_id')
      if (donorRecord) profile.donorId = donorRecord._id
    }

    if (userType === 'Hospital') {
      profile.name = user.name
      profile.role = 'hospital'
    } else {
      profile.username = user.username
    }

    res.json({ token, user: profile })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

export const getProfile = async (req, res) => {
  try {
    const Model = req.user.userType === 'Hospital' ? Hospital : User
    const user = await Model.findById(req.user.id).select('-password')

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const profile = { ...user.toObject(), id: user._id, userType: req.user.userType || (user.role === 'hospital' ? 'Hospital' : 'User') }
    if (req.user.userType === 'Hospital') {
      profile.role = 'hospital'
    }
    if (user.role === 'donor') {
      const donorRecord = await User.db.model('Donor').findOne({ user: user._id }).select('_id')
      if (donorRecord) profile.donorId = donorRecord._id
    }

    if (profile._id) {
      delete profile._id
    }

    res.json({ user: profile })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password')
    res.json({ users })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required' })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    user.password = hashedPassword
    await user.save()

    res.json({ message: 'Password reset successfully' })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params
    const { role } = req.body

    if (!['admin', 'hospital', 'donor'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' })
    }

    const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-password')
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ message: 'User role updated successfully', user })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params
    const { username, email, role, password } = req.body

    if (role && !['admin', 'hospital', 'donor'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' })
    }

    const update = {}
    if (username !== undefined) update.username = username
    if (email !== undefined) update.email = email
    if (role !== undefined) update.role = role
    if (password) update.password = await bcrypt.hash(password, 10)

    const user = await User.findByIdAndUpdate(id, update, { new: true, runValidators: true }).select('-password')
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ message: 'User updated successfully', user })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findByIdAndDelete(id)

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}
