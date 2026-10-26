// controllers/emailLogController.js — Email log viewer
const EmailLog = require('../models/EmailLog');
const asyncHandler = require('../utils/asyncHandler');

exports.getEmailLogs = asyncHandler(async (req, res) => {
  const { internId, type, status, page = 1, limit = 30 } = req.query;
  const filter = {};
  if (internId) filter.relatedIntern = internId;
  if (type) filter.type = type;
  if (status) filter.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [logs, total] = await Promise.all([
    EmailLog.find(filter)
      .populate('relatedIntern', 'name email')
      .populate('relatedTask', 'title taskId')
      .populate('relatedMeeting', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    EmailLog.countDocuments(filter),
  ]);

  res.json({ success: true, data: logs, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
});

exports.getEmailLog = asyncHandler(async (req, res) => {
  const log = await EmailLog.findById(req.params.id).populate('relatedIntern', 'name email');
  if (!log) return res.status(404).json({ success: false, message: 'Email log not found.' });
  res.json({ success: true, data: log });
});
