// models/TaskAssignment.js — A specific task assigned to a specific intern
const mongoose = require('mongoose');

const taskAssignmentSchema = new mongoose.Schema(
  {
    taskId: { type: String, unique: true }, // e.g. TASK-0001
    intern: { type: mongoose.Schema.Types.ObjectId, ref: 'Intern', required: true },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'TaskTemplate' }, // optional template reference
    // Actual task content (copied from template or custom)
    title: { type: String, required: true },
    description: { type: String, required: true },
    module: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    techStack: [{ type: String }],
    deliverables: [{ type: String }],
    stepByStep: [{ type: String }],
    learningResources: [{ type: String }],
    // Dates
    startDate: { type: Date, required: true },
    deadline: { type: Date, required: true },
    reviewDate: { type: Date }, // scheduled review meeting date
    // Status
    status: {
      type: String,
      enum: ['assigned', 'in_progress', 'submitted', 'under_review', 'revision_requested', 'approved', 'overdue'],
      default: 'assigned',
    },
    // Assignment info
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor' },
    // AI explanation
    aiExplanationGenerated: { type: Boolean, default: false },
    aiExplanationText: { type: String }, // cached Gemini explanation
    explanationListenedAt: { type: Date }, // when intern first listened
    // Reminder flags (prevent duplicate jobs)
    reminderSent24h: { type: Boolean, default: false },
    overdueNotified: { type: Boolean, default: false },
    // Bulk assignment batch
    bulkBatchId: { type: String },
  },
  { timestamps: true }
);

// Auto-generate taskId before save
taskAssignmentSchema.pre('save', async function (next) {
  if (!this.taskId) {
    const count = await mongoose.model('TaskAssignment').countDocuments();
    this.taskId = `TASK-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

taskAssignmentSchema.index({ intern: 1, status: 1 });
taskAssignmentSchema.index({ deadline: 1 });

module.exports = mongoose.model('TaskAssignment', taskAssignmentSchema);
