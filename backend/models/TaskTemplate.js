// models/TaskTemplate.js — Reusable task blueprints created by admin
const mongoose = require('mongoose');

const taskTemplateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    module: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    estimatedDays: { type: Number, default: 7 },
    techStack: [{ type: String }],
    deliverables: [{ type: String }], // list of expected outputs
    stepByStep: [{ type: String }],   // implementation guidance steps
    learningResources: [{ type: String }], // URLs or titles
    tags: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Full-text search index
taskTemplateSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('TaskTemplate', taskTemplateSchema);
