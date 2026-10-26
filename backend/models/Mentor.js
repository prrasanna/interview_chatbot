// models/Mentor.js — Mentor / Technical Reviewer profile
const mongoose = require('mongoose');

const mentorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String },
    designation: { type: String }, // e.g. "Senior Developer"
    expertise: [{ type: String }], // modules they specialise in
    assignedInterns: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Intern' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Mentor', mentorSchema);
