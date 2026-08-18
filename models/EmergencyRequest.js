import mongoose from "mongoose";
import validator from "validator";
import { DISTRICTS } from '../config/districts.js'

const EmergencyRequestSchema = new mongoose.Schema(
  {
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Hospital is required"],
      refPath: 'hospitalModel',
    },
    hospitalModel: {
      type: String,
      required: [true, 'Hospital model is required'],
      enum: ['Hospital', 'User'],
    },
    bloodType: {
      type: String,
      required: [true, "Blood type is required"],
      enum: ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"],
      uppercase: true,
    },
    unitsRequired: {
      type: Number,
      required: [true, "Units required is required"],
      min: [1, "At least 1 unit required"],
    },
    urgency: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
      required: [true, "Urgency level is required"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      enum: [...DISTRICTS, 'All Districts'],
      trim: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: (value) => {
          if (!value) return true
          const normalized = String(value).trim().replace(/\s|[-()\.]/g, '')
          return validator.isMobilePhone(normalized, 'any') || /^\d{3,}$/.test(normalized)
        },
        message: "Please provide a valid phone number"
      }
    },
    status: {
      type: String,
      enum: ["Pending", "Searching", "Matched", "Completed", "Cancelled"],
      default: "Pending",
    },
    matchedDonors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Donor",
      },
    ],
    donorResponses: [
      {
        donor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Donor',
          required: true,
        },
        status: {
          type: String,
          enum: ['Accepted', 'Rejected'],
          required: true,
        },
        respondedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
EmergencyRequestSchema.index({ status: 1, urgency: 1 });
EmergencyRequestSchema.index({ bloodType: 1, location: 1 });

export default mongoose.model("EmergencyRequest", EmergencyRequestSchema);
