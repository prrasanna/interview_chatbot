// controllers/authController.js — Login, register, profile
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Intern = require('../models/Intern');
const Mentor = require('../models/Mentor');
const asyncHandler = require('../utils/asyncHandler');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }
  if (!user.isActive) {
    return res.status(401).json({ success: false, message: 'Your account has been deactivated. Contact your administrator.' });
  }

  await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

  // Fetch role-specific profile
  let profile = null;
  if (user.role === 'intern') {
    profile = await Intern.findOne({ user: user._id }).populate('currentModule').populate('assignedMentor');
  } else if (user.role === 'mentor') {
    profile = await Mentor.findOne({ user: user._id });
  }

  const token = signToken(user._id);
  res.json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile,
    },
  });
});

// POST /api/auth/register (admin creates users — not public self-registration)
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ success: false, message: 'Name, email, password, and role are required.' });
  }
  if (!['admin', 'mentor', 'intern'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role. Must be admin, mentor, or intern.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
  }

  const user = await User.create({ name, email, password, role });
  const token = signToken(user._id);

  res.status(201).json({
    success: true,
    message: 'User account created successfully.',
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

// GET /api/auth/me
exports.getMe = asyncHandler(async (req, res) => {
  const user = req.user;
  let profile = null;
  if (user.role === 'intern') {
    profile = await Intern.findOne({ user: user._id }).populate('currentModule').populate('assignedMentor');
  } else if (user.role === 'mentor') {
    profile = await Mentor.findOne({ user: user._id });
  }

  res.json({
    success: true,
    user: { id: user._id, name: user.name, email: user.email, role: user.role, profile },
  });
});

// PATCH /api/auth/change-password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Current and new passwords are required.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
  }

  user.password = newPassword;
  user.passwordChangedAt = new Date();
  await user.save();

  res.json({ success: true, message: 'Password changed successfully. Please log in again.' });
});
