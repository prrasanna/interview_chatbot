// models/VoiceLog.js — Anonymised voice interaction logs (consent-gated)
const mongoose = require('mongoose');

const voiceLogSchema = new mongoose.Schema(
  {
    intern: { type: mongoose.Schema.Types.ObjectId, ref: 'Intern', required: true },
    sessionId: { type: String, required: true }, // UUID per conversation session
    // We store only the question text + response text, NOT the raw audio
    questionText: { type: String },
    responseText: { type: String },
    responseType: { type: String, enum: ['task_info', 'deadline', 'module', 'feedback', 'general', 'error'] },
    tokensUsed: { type: Number }, // Gemini token usage for cost tracking
    processingMs: { type: Number }, // latency
    // Consent confirmed at time of interaction
    consentConfirmed: { type: Boolean, default: false },
    // Auto-delete after retention period (e.g. 90 days)
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      index: { expireAfterSeconds: 0 }, // MongoDB TTL index
    },
  },
  { timestamps: true }
);

voiceLogSchema.index({ intern: 1 });

module.exports = mongoose.model('VoiceLog', voiceLogSchema);
