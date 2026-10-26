// models/Module.js — Technical module / domain
const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: [
        'Frontend Development',
        'Backend Development',
        'Full-Stack Development',
        'Python Programming',
        'AI and Machine Learning',
        'UI/UX Design',
        'Digital Marketing',
        'Software Testing',
        'Cloud Computing',
      ],
    },
    description: { type: String },
    techStack: [{ type: String }], // e.g. ['React', 'CSS', 'HTML']
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Module', moduleSchema);
