import mongoose from 'mongoose'
import validator from 'validator'
import { DISTRICTS } from '../config/districts.js'


const donationHistorySchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    location: { type: String, trim: true },
    status: {
      type: String,
      enum: ['Completed', 'Scheduled', 'Cancelled', 'Pending'],
      default: 'Pending'
    }
  }
)

const donorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    fullName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (value) => validator.isEmail(value),
        message: 'Please provide a valid email address'
      }
    },
    phone: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 18, max: 65 },
    bloodGroup: {
      type: String,
      required: true,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    district: {
      type: String,
      required: [true, 'Donor district is required'],
      enum: DISTRICTS,
      trim: true
    },
    lastDonationDate: { type: Date },
    eligibilityStatus: { type: Boolean, default: true },
    donationHistory: [donationHistorySchema],
    medicalNotes: { type: String, trim: true }
  },
  { collection: 'donors', timestamps: true }
)

const calculateEligibility = (donor) => {
  if (!donor.age || donor.age < 18 || donor.age > 65) {
    return false
  }

  if (!donor.lastDonationDate) {
    return true
  }

  const lastDonation = new Date(donor.lastDonationDate)
  const monthsSinceLastDonation = (Date.now() - lastDonation.getTime()) / (1000 * 60 * 60 * 24 * 30)
  return monthsSinceLastDonation >= 3
}

donorSchema.pre('save', function (next) {
  this.eligibilityStatus = calculateEligibility(this)
  next()
})

const Donor = mongoose.model('Donor', donorSchema)
export default Donor
