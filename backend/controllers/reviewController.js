// controllers/reviewController.js — Post-meeting feedback workflow
const Review = require('../models/Review');
const Meeting = require('../models/Meeting');
const TaskAssignment = require('../models/TaskAssignment');
const Intern = require('../models/Intern');
const Mentor = require('../models/Mentor');
const emailService = require('../services/emailService');
const geminiService = require('../services/geminiService');
const feedbackEmail = require('../templates/feedbackEmail');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/reviews — list reviews
exports.getReviews = asyncHandler(async (req, res) => {
  const { internId, taskId, page = 1, limit = 20 } = req.query;
  const filter = {};

  if (req.user.role === 'intern') {
    const intern = await Intern.findOne({ user: req.user._id });
    if (intern) filter.intern = intern._id;
  } else if (req.user.role === 'mentor') {
    const mentor = await Mentor.findOne({ user: req.user._id });
    if (mentor) filter.mentor = mentor._id;
  }

  if (internId && req.user.role === 'admin') filter.intern = internId;
  if (taskId) filter.task = taskId;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate('intern', 'name email')
      .populate('mentor', 'name')
      .populate('task', 'title taskId')
      .populate('meeting', 'title scheduledAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Review.countDocuments(filter),
  ]);

  res.json({ success: true, data: reviews, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
});

// GET /api/reviews/:id
exports.getReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id)
    .populate('intern', 'name email skillLevel')
    .populate('mentor', 'name email')
    .populate('task', 'title taskId description module')
    .populate('meeting', 'title scheduledAt meetingLink');
  if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });

  // Interns only see reviews shared with them
  if (req.user.role === 'intern' && !review.sharedWithIntern) {
    return res.status(403).json({ success: false, message: 'This feedback has not been shared with you yet.' });
  }

  res.json({ success: true, data: review });
});

// POST /api/reviews — create review after a meeting
exports.createReview = asyncHandler(async (req, res) => {
  const {
    meetingId, taskId,
    completionStatus, technicalAccuracy, codeQuality,
    strengths, mistakes, improvements, learningResources,
    taskOutcome, nextSteps, nextReviewDate, revisedDeadline,
    rawMentorNotes, generateAiFeedback = true,
  } = req.body;

  if (!meetingId || !taskId || !completionStatus || !taskOutcome) {
    return res.status(400).json({ success: false, message: 'meetingId, taskId, completionStatus, and taskOutcome are required.' });
  }

  const meeting = await Meeting.findById(meetingId).populate('intern mentor');
  if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found.' });

  const task = await TaskAssignment.findById(taskId);
  if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

  const mentor = await Mentor.findOne({ user: req.user._id });

  const reviewData = {
    meeting: meeting._id,
    task: task._id,
    intern: meeting.intern._id,
    mentor: mentor ? mentor._id : meeting.mentor,
    completionStatus, technicalAccuracy, codeQuality,
    strengths, mistakes, improvements,
    learningResources: learningResources || [],
    taskOutcome, nextSteps,
    nextReviewDate: nextReviewDate ? new Date(nextReviewDate) : undefined,
    revisedDeadline: revisedDeadline ? new Date(revisedDeadline) : undefined,
    rawMentorNotes,
  };

  // Generate AI-polished feedback
  if (generateAiFeedback && rawMentorNotes) {
    const intern = meeting.intern;
    const aiText = await geminiService.generateFeedbackNarration({ review: reviewData, intern });
    reviewData.aiGeneratedFeedback = aiText;
    // Default finalFeedback to AI version (mentor can edit before sharing)
    reviewData.finalFeedback = aiText;
  } else {
    reviewData.finalFeedback = rawMentorNotes || `Completion: ${completionStatus}. Outcome: ${taskOutcome}. ${strengths ? 'Strengths: ' + strengths + '. ' : ''}${improvements ? 'Improvements: ' + improvements : ''}`;
  }

  const review = await Review.create(reviewData);

  // Update meeting status
  await Meeting.findByIdAndUpdate(meetingId, { status: 'completed' });

  // Update task status
  const newTaskStatus = taskOutcome === 'approved' ? 'approved' : 'revision_requested';
  await TaskAssignment.findByIdAndUpdate(taskId, { status: newTaskStatus });
  if (taskOutcome === 'approved') {
    await Intern.findByIdAndUpdate(meeting.intern._id, { $inc: { completedTasksCount: 1 } });
  }

  res.status(201).json({
    success: true,
    message: 'Review created. AI feedback generated. Please review, edit if needed, then share with intern.',
    data: review,
  });
});

// PATCH /api/reviews/:id — mentor edits and approves AI feedback
exports.updateReview = asyncHandler(async (req, res) => {
  const { finalFeedback, aiApprovedByMentor, nextSteps, revisedDeadline, nextReviewDate, nextTaskRecommendation } = req.body;
  const updates = {};
  if (finalFeedback !== undefined) updates.finalFeedback = finalFeedback;
  if (aiApprovedByMentor !== undefined) updates.aiApprovedByMentor = aiApprovedByMentor;
  if (nextSteps) updates.nextSteps = nextSteps;
  if (revisedDeadline) updates.revisedDeadline = new Date(revisedDeadline);
  if (nextReviewDate) updates.nextReviewDate = new Date(nextReviewDate);
  if (nextTaskRecommendation) updates.nextTaskRecommendation = nextTaskRecommendation;

  const review = await Review.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });

  res.json({ success: true, message: 'Review updated.', data: review });
});

// POST /api/reviews/:id/share — share approved feedback with intern (email + in-app)
exports.shareReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id)
    .populate('intern', 'name email')
    .populate('task', 'title taskId module deadline');
  if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });
  if (review.sharedWithIntern) {
    return res.status(400).json({ success: false, message: 'Feedback already shared with this intern.' });
  }

  const intern = review.intern;
  const task = review.task;

  const html = feedbackEmail({ intern, review, task });
  await emailService.sendEmail({
    to: intern.email,
    toName: intern.name,
    subject: `📋 Your Review Feedback: ${task.title}`,
    html,
    type: 'feedback',
    relatedIntern: intern._id,
    relatedTask: task._id,
  });

  await Review.findByIdAndUpdate(review._id, { sharedWithIntern: true, sharedAt: new Date() });

  res.json({ success: true, message: 'Feedback shared with intern via email and dashboard.' });
});

// GET /api/reviews/intern/:internId/latest — get latest review for intern's active task
exports.getLatestReview = asyncHandler(async (req, res) => {
  if (req.user.role === 'intern') {
    const selfIntern = await Intern.findOne({ user: req.user._id });
    if (!selfIntern || selfIntern._id.toString() !== req.params.internId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
  }

  const review = await Review.findOne({ intern: req.params.internId, sharedWithIntern: true })
    .sort({ createdAt: -1 })
    .populate('task', 'title taskId')
    .populate('mentor', 'name');

  res.json({ success: true, data: review });
});
