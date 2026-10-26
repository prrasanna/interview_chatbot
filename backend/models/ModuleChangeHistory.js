// models/ModuleChangeHistory.js — Records when an intern switches modules
const mongoose = require('mongoose');

const moduleChangeHistorySchema = new mongoose.Schema(
  {
    intern: { type: mongoose.Schema.Types.ObjectId, ref: 'Intern', required: true },
    previousModule: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' },
    newModule: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
    reason: { type: String },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, default: Date.now },
    // Tasks count at time of change
    tasksCompletedInPreviousModule: { type: Number, default: 0 },
  },
  { timestamps: true }
);

moduleChangeHistorySchema.index({ intern: 1 });

module.exports = mongoose.model('ModuleChangeHistory', moduleChangeHistorySchema);
