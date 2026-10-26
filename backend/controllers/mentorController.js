// controllers/mentorController.js — Mentor CRUD
const Mentor = require('../models/Mentor');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

exports.getMentors = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const filter = { isActive: true };
  if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [mentors, total] = await Promise.all([
    Mentor.find(filter).sort({ name: 1 }).skip(skip).limit(parseInt(limit)),
    Mentor.countDocuments(filter),
  ]);
  res.json({ success: true, data: mentors, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
});

exports.getMentor = asyncHandler(async (req, res) => {
  const mentor = await Mentor.findById(req.params.id).populate('assignedInterns', 'name email');
  if (!mentor) return res.status(404).json({ success: false, message: 'Mentor not found.' });
  res.json({ success: true, data: mentor });
});

exports.createMentor = asyncHandler(async (req, res) => {
  const { name, email, password = 'Mentor@123', phone, designation, expertise } = req.body;
  if (!name || !email) return res.status(400).json({ success: false, message: 'name and email are required.' });

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(400).json({ success: false, message: 'Account already exists for this email.' });

  const user = await User.create({ name, email, password, role: 'mentor' });
  const mentor = await Mentor.create({ user: user._id, name, email: email.toLowerCase(), phone, designation, expertise: expertise || [] });

  res.status(201).json({ success: true, message: 'Mentor created.', data: mentor });
});

exports.updateMentor = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'designation', 'expertise', 'isActive'];
  const updates = {};
  allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  const mentor = await Mentor.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!mentor) return res.status(404).json({ success: false, message: 'Mentor not found.' });
  res.json({ success: true, data: mentor });
});
