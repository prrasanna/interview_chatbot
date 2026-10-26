// models/Intern.js — Intern profile linked to a User account
const mongoose = require('mongoose');

const internSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    // Personal info
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String },
    college: { type: String },
    // Internship info
    joiningDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    duration: { type: Number }, // in weeks, computed
    currentModule: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' },
    assignedMentor: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor' },
    // Status
    status: {
      type: String,
      enum: ['active', 'completed', 'on_hold', 'deactivated'],
      default: 'active',
    },
    skillLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    // Progress
    completedTasksCount: { type: Number, default: 0 },
    totalTasksCount: { type: Number, default: 0 },
    // Consent
    voiceDataConsent: { type: Boolean, default: false },
    // CSV import
    importBatch: { type: String }, // batch ID for bulk imports
  },
  { timestamps: true }
);

internSchema.virtual('progressPercent').get(function () {
  if (!this.totalTasksCount) return 0;
  return Math.round((this.completedTasksCount / this.totalTasksCount) * 100);
});

internSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Intern', internSchema);
