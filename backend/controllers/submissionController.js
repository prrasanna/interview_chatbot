// controllers/submissionController.js — Intern task submissions
const Submission = require('../models/Submission');
const TaskAssignment = require('../models/TaskAssignment');
const Intern = require('../models/Intern');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/submissions?taskId=&internId=
exports.getSubmissions = asyncHandler(async (req, res) => {
  const { taskId, internId } = req.query;
  const filter = {};

  if (req.user.role === 'intern') {
    const intern = await Intern.findOne({ user: req.user._id });
    if (intern) filter.intern = intern._id;
  } else {
    if (internId) filter.intern = internId;
    if (taskId) filter.task = taskId;
  }

  const submissions = await Submission.find(filter)
    .populate('task', 'title taskId')
    .populate('intern', 'name email')
    .sort({ submittedAt: -1 });

  res.json({ success: true, data: submissions });
});

// POST /api/submissions — intern submits work
exports.createSubmission = asyncHandler(async (req, res) => {
  const intern = await Intern.findOne({ user: req.user._id });
  if (!intern) return res.status(403).json({ success: false, message: 'Intern profile not found.' });

  const { taskId, githubLink, projectUrl, notes } = req.body;
  if (!taskId) return res.status(400).json({ success: false, message: 'taskId is required.' });

  const task = await TaskAssignment.findById(taskId);
  if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
  if (task.intern.toString() !== intern._id.toString()) {
    return res.status(403).json({ success: false, message: 'Access denied — this task is not assigned to you.' });
  }

  const existingCount = await Submission.countDocuments({ task: taskId, intern: intern._id });

  const attachments = (req.files || []).map((f) => ({
    filename: f.filename,
    originalName: f.originalname,
    mimetype: f.mimetype,
    size: f.size,
    path: f.path,
  }));

  const submission = await Submission.create({
    task: task._id,
    intern: intern._id,
    githubLink, projectUrl, notes, attachments,
    isRevision: existingCount > 0,
    revisionNumber: existingCount + 1,
  });

  // Update task status to submitted
  await TaskAssignment.findByIdAndUpdate(task._id, { status: 'submitted' });

  res.status(201).json({
    success: true,
    message: `Submission ${existingCount > 0 ? `(revision #${existingCount + 1}) ` : ''}received successfully.`,
    data: submission,
  });
});

// GET /api/submissions/:id
exports.getSubmission = asyncHandler(async (req, res) => {
  const submission = await Submission.findById(req.params.id)
    .populate('task', 'title taskId')
    .populate('intern', 'name email');
  if (!submission) return res.status(404).json({ success: false, message: 'Submission not found.' });
  res.json({ success: true, data: submission });
});
