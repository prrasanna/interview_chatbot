// controllers/assistantController.js — AI voice assistant backend proxy
// SECURITY: Gemini API key is NEVER exposed to the frontend
const geminiService = require('../services/geminiService');
const Intern = require('../models/Intern');
const TaskAssignment = require('../models/TaskAssignment');
const Meeting = require('../models/Meeting');
const Review = require('../models/Review');
const VoiceLog = require('../models/VoiceLog');
const asyncHandler = require('../utils/asyncHandler');
const { v4: uuidv4 } = require('uuid');

// POST /api/assistant/chat — Conversational Q&A for intern
exports.chat = asyncHandler(async (req, res) => {
  const { question, sessionId } = req.body;
  if (!question || !question.trim()) {
    return res.status(400).json({ success: false, message: 'question is required.' });
  }

  // Only interns can use the voice assistant
  const intern = await Intern.findOne({ user: req.user._id })
    .populate('currentModule', 'name')
    .populate('assignedMentor', 'name email');
  if (!intern) {
    return res.status(403).json({ success: false, message: 'Only intern accounts can use the AI assistant.' });
  }

  // Fetch context: active task, upcoming meeting, latest shared review
  const [activeTask, upcomingMeeting, latestReview] = await Promise.all([
    TaskAssignment.findOne({ intern: intern._id, status: { $in: ['assigned', 'in_progress', 'revision_requested'] } })
      .populate('module', 'name')
      .sort({ createdAt: -1 }),
    Meeting.findOne({ intern: intern._id, status: 'scheduled', scheduledAt: { $gte: new Date() } })
      .sort({ scheduledAt: 1 }),
    Review.findOne({ intern: intern._id, sharedWithIntern: true })
      .sort({ createdAt: -1 }),
  ]);

  const start = Date.now();
  const { text, isMock, error } = await geminiService.chatWithAssistant({
    question: question.trim(),
    context: {
      intern: { ...intern.toObject(), moduleName: intern.currentModule?.name },
      activeTask: activeTask ? { ...activeTask.toObject(), moduleName: activeTask.module?.name } : null,
      upcomingMeeting,
      latestReview,
    },
  });
  const processingMs = Date.now() - start;

  // Log the interaction (only text, not audio; consent checked)
  if (intern.voiceDataConsent) {
    await VoiceLog.create({
      intern: intern._id,
      sessionId: sessionId || uuidv4(),
      questionText: question.trim(),
      responseText: text,
      processingMs,
      consentConfirmed: true,
    });
  }

  res.json({
    success: true,
    data: { text, isMock: isMock || false, ...(error ? { warning: error } : {}) },
  });
});

// POST /api/assistant/explain-task/:taskId — Generate/return task explanation
exports.explainTask = asyncHandler(async (req, res) => {
  const intern = await Intern.findOne({ user: req.user._id });
  if (!intern) return res.status(403).json({ success: false, message: 'Intern profile not found.' });

  const task = await TaskAssignment.findById(req.params.taskId).populate('module', 'name techStack').populate('intern', 'name skillLevel');
  if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

  if (task.intern._id.toString() !== intern._id.toString()) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  // Return cached if available
  if (task.aiExplanationGenerated && task.aiExplanationText) {
    await TaskAssignment.findByIdAndUpdate(task._id, { explanationListenedAt: new Date() });
    return res.json({ success: true, data: { explanation: task.aiExplanationText, cached: true } });
  }

  const meeting = await Meeting.findOne({ task: task._id, status: 'scheduled' }).sort({ scheduledAt: 1 });
  const explanation = await geminiService.generateTaskExplanation({
    task: { ...task.toObject(), moduleName: task.module?.name },
    intern: task.intern,
    meeting,
  });

  await TaskAssignment.findByIdAndUpdate(task._id, {
    aiExplanationGenerated: true,
    aiExplanationText: explanation,
    explanationListenedAt: new Date(),
  });

  res.json({ success: true, data: { explanation, cached: false } });
});

// POST /api/assistant/explain-feedback/:reviewId — narrate mentor feedback
exports.explainFeedback = asyncHandler(async (req, res) => {
  const intern = await Intern.findOne({ user: req.user._id });
  if (!intern) return res.status(403).json({ success: false, message: 'Intern profile not found.' });

  const review = await Review.findById(req.params.reviewId);
  if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });
  if (review.intern.toString() !== intern._id.toString()) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  if (!review.sharedWithIntern) {
    return res.status(403).json({ success: false, message: 'This feedback has not been released to you yet.' });
  }

  // Use existing AI text if available, else generate
  const text = review.aiGeneratedFeedback || review.finalFeedback || 'No feedback available.';
  res.json({ success: true, data: { text } });
});
