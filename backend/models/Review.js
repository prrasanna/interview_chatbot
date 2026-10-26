// models/Review.js — Mentor feedback after a review meeting
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    meeting: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'TaskAssignment', required: true },
    intern: { type: mongoose.Schema.Types.ObjectId, ref: 'Intern', required: true },
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor', required: true },
    // Feedback content
    completionStatus: {
      type: String,
      enum: ['fully_completed', 'partially_completed', 'not_completed'],
      required: true,
    },
    technicalAccuracy: { type: Number, min: 1, max: 10 }, // rating out of 10
    codeQuality: { type: Number, min: 1, max: 10 },
    strengths: { type: String },
    mistakes: { type: String },
    improvements: { type: String },
    learningResources: [{ type: String }],
    taskOutcome: {
      type: String,
      enum: ['approved', 'revision_required', 'reassigned'],
      required: true,
    },
    nextSteps: { type: String },
    // AI-generated feedback
    rawMentorNotes: { type: String }, // mentor's original raw notes
    aiGeneratedFeedback: { type: String }, // AI-polished version
    aiApprovedByMentor: { type: Boolean, default: false },
    finalFeedback: { type: String }, // the version shared with intern
    // Shared with intern
    sharedWithIntern: { type: Boolean, default: false },
    sharedAt: { type: Date },
    // Next assignment
    nextTaskRecommendation: { type: String },
    nextReviewDate: { type: Date },
    revisedDeadline: { type: Date },
  },
  { timestamps: true }
);

reviewSchema.index({ intern: 1 });
reviewSchema.index({ task: 1 });

module.exports = mongoose.model('Review', reviewSchema);
