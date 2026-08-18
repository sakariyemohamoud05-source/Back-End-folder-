import mongoose from 'mongoose'
import validator from 'validator'
 

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      validate: {
        validator: (value) => validator.isEmail(value),
        message: 'Please enter a valid email'
      },
    },
    password: {
      type: String,
      required: true,
      validate: [validator.isStrongPassword, 'please enter a strong password']
    },
    role: {
      type: String,
      enum: ['admin', 'hospital', 'donor'],
      default: 'donor',
      required: true
    }
  },
  {
    collection: 'users',
    timestamps: true
  }
)
const User = mongoose.model('User', userSchema)
export default User
