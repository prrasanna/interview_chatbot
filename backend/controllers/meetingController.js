// controllers/meetingController.js — Review meeting scheduling
const Meeting = require('../models/Meeting');
const Intern = require('../models/Intern');
const Mentor = require('../models/Mentor');
const Module = require('../models/Module');
const TaskAssignment = require('../models/TaskAssignment');
const emailService = require('../services/emailService');
const calendarService = require('../services/calendarService');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/meetings
exports.getMeetings = asyncHandler(async (req, res) => {
  const { internId, mentorId, status, from, to, page = 1, limit = 30 } = req.query;
  const filter = {};

  if (req.user.role === 'intern') {
    const intern = await Intern.findOne({ user: req.user._id });
    if (intern) filter.intern = intern._id;
  } else if (req.user.role === 'mentor') {
    const mentor = await Mentor.findOne({ user: req.user._id });
    if (mentor) filter.mentor = mentor._id;
  }

  if (internId && req.user.role === 'admin') filter.intern = internId;
  if (mentorId && req.user.role === 'admin') filter.mentor = mentorId;
  if (status) filter.status = status;
  if (from || to) {
    filter.scheduledAt = {};
    if (from) filter.scheduledAt.$gte = new Date(from);
    if (to) filter.scheduledAt.$lte = new Date(to);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [meetings, total] = await Promise.all([
    Meeting.find(filter)
      .populate('intern', 'name email')
      .populate('mentor', 'name email')
      .populate('task', 'title taskId')
      .populate('module', 'name')
      .sort({ scheduledAt: 1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Meeting.countDocuments(filter),
  ]);

  res.json({ success: true, data: meetings, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
});

// GET /api/meetings/:id
exports.getMeeting = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findById(req.params.id)
    .populate('intern', 'name email')
    .populate('mentor', 'name email phone')
    .populate('task', 'title taskId description')
    .populate('module', 'name');
  if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found.' });
  res.json({ success: true, data: meeting });
});

// POST /api/meetings — schedule a new review meeting
exports.scheduleMeeting = asyncHandler(async (req, res) => {
  const { internId, mentorId, taskId, moduleId, title, agenda, scheduledAt, duration = 60, timezone = 'Asia/Kolkata', meetingLink, location } = req.body;

  if (!internId || !mentorId || !scheduledAt || !title) {
    return res.status(400).json({ success: false, message: 'internId, mentorId, scheduledAt, and title are required.' });
  }

  const intern = await Intern.findById(internId);
  const mentor = await Mentor.findById(mentorId);
  if (!intern) return res.status(404).json({ success: false, message: 'Intern not found.' });
  if (!mentor) return res.status(404).json({ success: false, message: 'Mentor not found.' });

  const meeting = await Meeting.create({
    title, agenda, intern: intern._id, mentor: mentor._id,
    task: taskId || undefined, module: moduleId || intern.currentModule,
    scheduledAt: new Date(scheduledAt), duration, timezone, meetingLink, location,
    createdBy: req.user._id,
  });

  // Sync with Google Calendar
  const calResult = await calendarService.createMeetingEvent({
    meeting,
    internEmail: intern.email,
    mentorEmail: mentor.email,
  });
  if (calResult.eventId) {
    await Meeting.findByIdAndUpdate(meeting._id, {
      googleCalendarEventId: calResult.eventId,
      meetingLink: calResult.meetLink || meetingLink,
    });
  }

  // Update related task's reviewDate
  if (taskId) {
    await TaskAssignment.findByIdAndUpdate(taskId, { reviewDate: new Date(scheduledAt) });
  }

  // Send invite email to intern
  await emailService.sendEmail({
    to: intern.email,
    toName: intern.name,
    subject: `📅 Review Meeting Scheduled: ${title}`,
    html: `<p>Hi ${intern.name}, your review meeting "<strong>${title}</strong>" has been scheduled for <strong>${new Date(scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' })}</strong>.<br>${meetingLink ? `Join here: <a href="${meetingLink}">${meetingLink}</a>` : location ? `Location: ${location}` : ''}</p><p><a href="${process.env.FRONTEND_URL}/intern/dashboard">View on Dashboard</a></p>`,
    type: 'meeting_invite',
    relatedIntern: intern._id,
    relatedMeeting: meeting._id,
  });

  await Meeting.findByIdAndUpdate(meeting._id, { inviteSent: true });
  await meeting.populate('intern mentor task module');

  res.status(201).json({ success: true, message: 'Meeting scheduled successfully.', data: meeting, calendarSync: calResult });
});

// PATCH /api/meetings/:id — reschedule or update
exports.updateMeeting = asyncHandler(async (req, res) => {
  const { scheduledAt, duration, meetingLink, location, status, rescheduleReason, cancelReason } = req.body;
  const existing = await Meeting.findById(req.params.id).populate('intern mentor');
  if (!existing) return res.status(404).json({ success: false, message: 'Meeting not found.' });

  const isReschedule = scheduledAt && new Date(scheduledAt).toISOString() !== existing.scheduledAt.toISOString();
  const isCancel = status === 'cancelled';

  const updates = { status, rescheduleReason, cancelReason, duration, meetingLink, location };
  if (scheduledAt) {
    updates.scheduledAt = new Date(scheduledAt);
    if (isReschedule) updates.status = 'rescheduled';
    updates.reminderSent24h = false; // reset so reminder fires for new time
  }

  const meeting = await Meeting.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });

  // Notify intern of reschedule or cancel
  if (isReschedule || isCancel) {
    const intern = existing.intern;
    const subject = isCancel ? `❌ Meeting Cancelled: ${existing.title}` : `🔄 Meeting Rescheduled: ${existing.title}`;
    const html = `<p>Hi ${intern.name},<br>Your meeting "<strong>${existing.title}</strong>" has been ${isCancel ? 'cancelled' : 'rescheduled'}.<br>${isReschedule ? `New time: <strong>${new Date(scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' })}</strong>` : ''}<br>${rescheduleReason || cancelReason ? `Reason: ${rescheduleReason || cancelReason}` : ''}</p>`;
    await emailService.sendEmail({
      to: intern.email, toName: intern.name, subject, html,
      type: isCancel ? 'meeting_cancel' : 'meeting_reschedule',
      relatedIntern: intern._id, relatedMeeting: meeting._id,
    });

    // Update Google Calendar
    if (isCancel && existing.googleCalendarEventId) {
      await calendarService.deleteMeetingEvent(existing.googleCalendarEventId);
    }
  }

  res.json({ success: true, message: 'Meeting updated successfully.', data: meeting });
});
