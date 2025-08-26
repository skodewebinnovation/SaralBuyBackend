import User from '../schemas/user.schema.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Register a new user
export const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword
    });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

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
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Edit user profile (firstName, lastName, email, phone)
export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, phone } = req.body;
    // Only allow these fields to be updated
    const updates = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (email) updates.email = email;
    if (phone) updates.phone = phone;

    // Prevent duplicate email or phone
    if (email) {
      const existingEmail = await User.findOne({ email, _id: { $ne: req.user.userId } });
      if (existingEmail) return res.status(409).json({ message: 'Email already in use' });
    }
    if (phone) {
      const existingPhone = await User.findOne({ phone, _id: { $ne: req.user.userId } });
      if (existingPhone) return res.status(409).json({ message: 'Phone already in use' });
    }

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