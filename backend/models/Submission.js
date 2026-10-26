// models/Submission.js — Intern's work submission for a task
const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'TaskAssignment', required: true },
    intern: { type: mongoose.Schema.Types.ObjectId, ref: 'Intern', required: true },
    // Deliverables
    githubLink: { type: String, trim: true },
    projectUrl: { type: String, trim: true },
    notes: { type: String },
    attachments: [
      {
        filename: String,
        originalName: String,
        mimetype: String,
        size: Number,
        path: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    // Status
    submittedAt: { type: Date, default: Date.now },
    isRevision: { type: Boolean, default: false },
    revisionNumber: { type: Number, default: 1 },
  },
  { timestamps: true }
);

submissionSchema.index({ task: 1, intern: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
