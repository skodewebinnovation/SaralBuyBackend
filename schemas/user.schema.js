import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  addressLine: { type: String, },
  city:        { type: String, },
  state:       { type: String, },
  pincode:     { type: String, },
  country:     { type: String, }
}, { _id: false });

const userSchema = new mongoose.Schema({
  firstName:      { type: String, },
  lastName:       { type: String, },
  email:          { type: String},
  phone:          { type: String, required: true, unique: true },
  password:       { type: String },
  addresses:      { type: [addressSchema], default: [] },
  aadhaarNumber:  { type: String },
  aadhaarImage:   { type: String }, // file path or URL
  isAadhaarVerified: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('User', userSchema);