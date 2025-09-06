import User from '../schemas/user.schema.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ApiResponse } from '../helper/ApiReponse.js';
import userSchema from '../schemas/user.schema.js';
import twilio from 'twilio'
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const serviceSid = process.env.TWILIO_ACCOUNT_SID; 

const otpStore = new Map(); 
export const sendOtp = async (req, res) => {
  let { pNo } = req.body;
  try {
    pNo = pNo.startsWith('+') ? pNo : `+91${pNo}`;

    // Generate 6-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiry

    // Save in Map
    otpStore.set(pNo, { otp, expiresAt });

    // For testing (later integrate SMS API)
    console.log(`OTP for ${pNo}: ${otp}`);

    return ApiResponse.successResponse(res, 200, "Otp sent successfully");
  } catch (err) {
    console.error("OTP error:", err);
    return ApiResponse.errorResponse(res, 400, err?.message || err);
  }
};

export const verifyOtp = async (req, res) => {
  let { pNo, otp } = req.body;

  try {
    pNo = pNo.startsWith('+') ? pNo : `+91${pNo}`;

    const otpData = otpStore.get(pNo);
    if (!otpData) {
      return ApiResponse.errorResponse(res, 400, "No OTP found for this number");
    }

    // Check expiry
    if (otpData.expiresAt < Date.now()) {
      otpStore.delete(pNo);
      return ApiResponse.errorResponse(res, 400, "OTP expired");
    }

    // Check OTP
    if (otpData.otp !== otp) {
      return ApiResponse.errorResponse(res, 400, "Invalid OTP");
    }

    // ✅ OTP verified
    otpStore.delete(pNo); // cleanup after success

    let user = await userSchema.findOne({ phone: pNo });
    if (!user) {
      user = await userSchema.create({ phone: pNo });
    }

    const payload = { _id: user._id, phone: user.phone };
     const token = jwt.sign(payload,process.env.JWT_SECRET,{expiresIn:'7d'})
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, 
      path: '/',
    });

    return ApiResponse.successResponse(res, 200, "Otp verified successfully", {
      token,
      user: { _id: user._id, phone: user.phone }
    });
  } catch (err) {
    console.error("Verify error:", err);
    return ApiResponse.errorResponse(res, 400, err?.message || err);
  }
};


// export const sendOtp = async (req, res) => {
//   let { pNo } = req.body;
//   console.log(req.body)
//   try {
//     pNo = pNo.startsWith('+') ? pNo : `+91${pNo}`;

//     await client.verify.v2
//       .services(serviceSid)
//       .verifications.create({ to: pNo, channel: 'sms' });

//     return ApiResponse.successResponse(res, 200, 'Otp sent successfully');
//   } catch (err) {
//     console.error('Twilio error:', err);
//     return ApiResponse.errorResponse(res, 400, err?.message || err);
//   }
// };

// export const verifyOtp = async (req, res) => {
//   let { pNo, otp } = req.body;

//   try {

//     pNo = pNo.startsWith('+') ? pNo : `+91${pNo}`;

//     const verificationCheck = await client.verify.v2
//       .services(serviceSid)
//       .verificationChecks.create({ to: pNo, code: otp });

//     if (verificationCheck.status !== 'approved') {
//       return ApiResponse.errorResponse(res, 400, 'Invalid OTP');
//     }

//     // ✅ OTP is correct — find user
//     const last10Digits = pNo.replace(/\D/g, '').slice(-10);
//     const userProfile = await userSchema.findOne({
//       phone: { $regex: `${last10Digits}$` },
//     });

//     if (!userProfile) {
//       return ApiResponse.errorResponse(res, 400, 'User not found');
//     }

//     return ApiResponse.successResponse(res, 200, 'Otp verified successfully');
//   } catch (err) {
//     console.error('Verify error:', err);
//     return ApiResponse.errorResponse(res, 400, err?.message || err);
//   }
// };

// Login user
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.status(200).json({ token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Logout user (client should just delete token, but endpoint for completeness)
export const logoutUser = (req, res) => {
  res.status(200).json({ message: 'Logged out successfully' });
};

// Get user profile
export const getProfile = async (req, res) => {
  try {
    const user = await userSchema.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(user);
  } catch (err) {
    console.log(err)
    res.status(400).json({ message: err.message });
  }
};

// Edit user profile (firstName, lastName, email, phone)
export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, phone,aadhaarNumber ,address} = req.body;
    console.log(req.body)

    const documentFile = req.files?.document?.[0];
    const documentUrl = documentFile?.path || null;  
    // Prevent duplicate email or phone
    if (email) {
      const existingEmail = await userSchema.findOne({ email, _id: { $ne: req.user.userId } });
      if (existingEmail) return res.status(409).json({ message: 'Email already in use' });
    }
    if (phone) {
      const existingPhone = await userSchema.findOne({ phone, _id: { $ne: req.user.userId } });
      if (existingPhone) return res.status(409).json({ message: 'Phone already in use' });
    }
    const updates = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (email) updates.email = email;
    if (phone) updates.phone = phone.startsWith('+') ? phone : `+91${phone}`;;
    if(documentUrl) updates.aadhaarImage = documentUrl;
    if(address) updates.address = address;
    if(aadhaarNumber) updates.aadhaarNumber=aadhaarNumber

    const user = await User.findByIdAndUpdate(req.user.userId, updates, { new: true }).select('-password');
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add new address
export const addAddress = async (req, res) => {
  try {
    const { addressLine, city, state, pincode, country } = req.body;
    if (!addressLine || !city || !state || !pincode || !country) {
      return res.status(400).json({ message: 'All address fields are required' });
    }
    const user = await User.findById(req.user.userId);
    user.addresses.push({ addressLine, city, state, pincode, country });
    await user.save();
    res.status(200).json({ addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Aadhaar verification (number + image upload)
export const verifyAadhaar = async (req, res) => {
  try {
    const { aadhaarNumber } = req.body;
    let aadhaarImage = null;
    if (req.file) {
      aadhaarImage = req.file.path;
    }
    if (!aadhaarNumber || !aadhaarImage) {
      return res.status(400).json({ message: 'Aadhaar number and image required' });
    }
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { aadhaarNumber, aadhaarImage, isAadhaarVerified: true },
      { new: true }
    ).select('-password');
    res.status(200).json({ message: 'Aadhaar verified', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};