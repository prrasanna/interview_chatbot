// models/Meeting.js — Review meeting between mentor and intern
const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    agenda: { type: String },
    intern: { type: mongoose.Schema.Types.ObjectId, ref: 'Intern', required: true },
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor', required: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'TaskAssignment' },
    module: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' },
    // Schedule
    scheduledAt: { type: Date, required: true },
    duration: { type: Number, default: 60 }, // minutes
    timezone: { type: String, default: 'Asia/Kolkata' },
    // Location
    meetingLink: { type: String },
    location: { type: String },
    // Status
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show'],
      default: 'scheduled',
    },
    // Cancellation / reschedule reason
    rescheduleReason: { type: String },
    cancelReason: { type: String },
    // Google Calendar
    googleCalendarEventId: { type: String },
    // Notifications
    inviteSent: { type: Boolean, default: false },
    reminderSent24h: { type: Boolean, default: false },
    // Created by
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

meetingSchema.index({ scheduledAt: 1 });
meetingSchema.index({ intern: 1 });

module.exports = mongoose.model('Meeting', meetingSchema);
