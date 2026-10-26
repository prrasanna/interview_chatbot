// models/Notification.js — In-app notification queue for interns/mentors
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['task_assigned', 'task_due', 'task_overdue', 'meeting_scheduled', 'meeting_reminder', 'feedback_ready', 'module_changed', 'general'],
      default: 'general',
    },
    relatedTask: { type: mongoose.Schema.Types.ObjectId, ref: 'TaskAssignment' },
    relatedMeeting: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
