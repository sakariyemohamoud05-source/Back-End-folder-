import bcrypt from 'bcrypt'
import Hospital from '../models/Hospital.js'
import User from '../models/User.js'

export const createHospital = async (req, res) => {
  try {
    const { name, address, district, phone, email, password } = req.body

    if (!name || !address || !district || !phone || !email || !password) {
      return res.status(400).json({
        message: 'Please provide name, address, district, phone, email, and password for the hospital',
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const hospital = await Hospital.create({
      ...req.body,
      password: hashedPassword,
    })

    res.status(201).json({
      message: 'Hospital created successfully',
      hospital
    })
  } catch (error) {
    res.status(500).json({
      message: error.message
    })
  }
}

export const getHospitals = async (req, res) => {
  try {
    const hospitals = await Hospital.find()
    const hospitalUsers = await User.find({ role: 'hospital' }).select('username email _id')
    const fallbackHospitals = hospitalUsers.map((user) => ({
      _id: user._id,
      name: user.username || user.email,
      email: user.email,
    }))

    res.json([...hospitals, ...fallbackHospitals])
  } catch (error) {
    res.status(500).json({
      message: error.message
    })
  }
}

export const getHospitalById = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id)

    if (hospital) {
      return res.json(hospital)
    }

    const userHospital = await User.findById(req.params.id).select('-password')
    if (userHospital && userHospital.role === 'hospital') {
      const fallbackHospital = {
        _id: userHospital._id,
        name: userHospital.username || userHospital.email,
        email: userHospital.email,
        role: 'hospital',
      }
      return res.json(fallbackHospital)
    }

    return res.status(404).json({
      message: 'Hospital not found'
    })
  } catch (error) {
    res.status(500).json({
      message: error.message
    })
  }
}

export const updateHospital = async (req, res) => {
  try {
    const { name, address, district, phone, email, password } = req.body

    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (address !== undefined) updateData.address = address
    if (district !== undefined) updateData.district = district
    if (phone !== undefined) updateData.phone = phone
    if (email !== undefined) updateData.email = email
    if (password !== undefined) updateData.password = password

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid fields provided for update' })
    }

    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    let hospital = await Hospital.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })

    if (!hospital) {
      const userHospital = await User.findById(req.params.id)
      if (userHospital && userHospital.role === 'hospital') {
        const userUpdateData = {}
        if (name !== undefined) userUpdateData.username = name
        if (email !== undefined) userUpdateData.email = email
        if (password !== undefined) userUpdateData.password = updateData.password

        const updatedUserHospital = await User.findByIdAndUpdate(req.params.id, userUpdateData, {
          new: true,
          runValidators: true,
        }).select('-password')

        if (!updatedUserHospital) {
          return res.status(404).json({ message: 'Hospital not found' })
        }

        return res.json({
          message: 'Hospital updated',
          hospital: updatedUserHospital,
        })
      }

      return res.status(404).json({ message: 'Hospital not found' })
    }

    res.json({
      message: 'Hospital updated',
      hospital,
    })
  } catch (error) {
    res.status(500).json({
      message: error.message,
    })
  }
}

export const deleteHospital = async (req, res) => {
  try {
    await Hospital.findByIdAndDelete(req.params.id)

    res.json({
      message: 'Hospital deleted'
    })
  } catch (error) {
    res.status(500).json({
      message: error.message
    })
  }
}
