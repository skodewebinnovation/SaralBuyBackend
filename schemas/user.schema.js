import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  addressLine: { type: String, required: true },
  city:        { type: String, required: true },
  state:       { type: String, required: true },
  pincode:     { type: String, required: true },
  country:     { type: String, required: true }
}, { _id: false });

const userSchema = new mongoose.Schema({
  firstName:      { type: String, required: true },
  lastName:       { type: String, required: true },
  email:          { type: String, required: true, unique: true },
  phone:          { type: String, required: true, unique: true },
  password:       { type: String, required: true },
  addresses:      { type: [addressSchema], default: [] },
  aadhaarNumber:  { type: String },
  aadhaarImage:   { type: String }, // file path or URL
  isAadhaarVerified: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('User', userSchema);