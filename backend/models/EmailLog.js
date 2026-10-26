// models/EmailLog.js — Every email sent or attempted by the system
const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema(
  {
    to: { type: String, required: true },
    toName: { type: String },
    subject: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'task_assignment',
        'task_reminder',
        'task_overdue',
        'meeting_invite',
        'meeting_reminder',
        'meeting_reschedule',
        'meeting_cancel',
        'feedback',
        'next_task',
        'module_change',
        'welcome',
        'other',
      ],
      required: true,
    },
    relatedIntern: { type: mongoose.Schema.Types.ObjectId, ref: 'Intern' },
    relatedTask: { type: mongoose.Schema.Types.ObjectId, ref: 'TaskAssignment' },
    relatedMeeting: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' },
    status: { type: String, enum: ['sent', 'failed', 'mock', 'queued'], default: 'queued' },
    messageId: { type: String }, // SMTP message ID on success
    errorMessage: { type: String },
    isMock: { type: Boolean, default: false }, // true in dev mock mode
    sentAt: { type: Date },
    retryCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

emailLogSchema.index({ relatedIntern: 1 });
emailLogSchema.index({ sentAt: -1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
