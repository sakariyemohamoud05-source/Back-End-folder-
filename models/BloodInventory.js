import mongoose from "mongoose";
import validator from "validator";

const bloodInventorySchema = new mongoose.Schema(
  {
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true
    },

    bloodType: {
      type: String,
      required: true,
      enum: ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"],
      uppercase: true
    },

    quantity: {
      type: Number,
      required: true,
      default: 0
    },

    expiryDate: {
      type: Date,
      required: true
    }
  },
  {
    collection: "blood_inventories",
    timestamps: true
  }
);

export default mongoose.model("BloodInventory", bloodInventorySchema);