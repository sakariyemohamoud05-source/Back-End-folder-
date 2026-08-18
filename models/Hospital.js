import mongoose from "mongoose";
import validator from "validator";
import { DISTRICTS } from '../config/districts.js'

const hospitalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    district: {
      type: String,
      required: [true, 'Hospital district is required'],
      enum: DISTRICTS,
      trim: true
    },
    phone: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['Active', 'Pending', 'Inactive'],
      default: 'Active',
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: (value) => validator.isEmail(value),
        message: "Invalid email format"
      }
    },
    password: {
      type: String,
      required: true,
      validate: {
        validator: (value) => typeof value === 'string' && value.length >= 8,
        message: "Password must be at least 8 characters long"
      }
    }
  },
  {
    collection: "hospitals",
    timestamps: true
  }
);

export default mongoose.model("Hospital", hospitalSchema);