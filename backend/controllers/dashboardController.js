// controllers/dashboardController.js — Admin and Mentor dashboard stats
const Intern = require('../models/Intern');
const TaskAssignment = require('../models/TaskAssignment');
const Meeting = require('../models/Meeting');
const Review = require('../models/Review');
const EmailLog = require('../models/EmailLog');
const Mentor = require('../models/Mentor');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/dashboard/admin
exports.getAdminDashboard = asyncHandler(async (req, res) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const next7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalInterns, activeInterns, completedInterns,
    totalTasks, pendingTasks, overdueTasks, completedTasks,
    todayMeetings, upcomingMeetings,
    pendingApprovalReviews,
    emailsSentToday, emailsFailed,
    recentFeedback, recentModuleChanges,
  ] = await Promise.all([
    Intern.countDocuments(),
    Intern.countDocuments({ status: 'active' }),
    Intern.countDocuments({ status: 'completed' }),
    TaskAssignment.countDocuments(),
    TaskAssignment.countDocuments({ status: { $in: ['assigned', 'in_progress'] } }),
    TaskAssignment.countDocuments({ status: 'overdue' }),
    TaskAssignment.countDocuments({ status: 'approved' }),
    Meeting.find({ scheduledAt: { $gte: todayStart, $lt: todayEnd }, status: 'scheduled' })
      .populate('intern', 'name').populate('mentor', 'name').sort({ scheduledAt: 1 }).limit(10),
    Meeting.countDocuments({ scheduledAt: { $gte: now, $lte: next7days }, status: 'scheduled' }),
    Review.countDocuments({ aiApprovedByMentor: false, sharedWithIntern: false }),
    EmailLog.countDocuments({ sentAt: { $gte: todayStart }, status: { $in: ['sent', 'mock'] } }),
    EmailLog.countDocuments({ status: 'failed' }),
    Review.find({ sharedWithIntern: true }).sort({ sharedAt: -1 }).limit(5).populate('intern', 'name').populate('task', 'title'),
    [],
  ]);

  // Top 5 interns by progress
  const topInterns = await Intern.find({ status: 'active' })
    .populate('currentModule', 'name')
    .sort({ completedTasksCount: -1 })
    .limit(5)
    .select('name email completedTasksCount totalTasksCount currentModule');

  res.json({
    success: true,
    data: {
      interns: { total: totalInterns, active: activeInterns, completed: completedInterns },
      tasks: { total: totalTasks, pending: pendingTasks, overdue: overdueTasks, completed: completedTasks },
      meetings: { today: todayMeetings, upcomingCount: upcomingMeetings },
      reviews: { pendingApproval: pendingApprovalReviews },
      emails: { sentToday: emailsSentToday, failed: emailsFailed },
      recentFeedback,
      topInterns,
    },
  });
});

// GET /api/dashboard/intern
exports.getInternDashboard = asyncHandler(async (req, res) => {
  const intern = await Intern.findOne({ user: req.user._id })
    .populate('currentModule', 'name techStack')
    .populate('assignedMentor', 'name email phone');
  if (!intern) return res.status(404).json({ success: false, message: 'Intern profile not found.' });

  const now = new Date();

  const [activeTask, upcomingMeeting, recentReviews, taskHistory, unreadNotificationsCount] = await Promise.all([
    TaskAssignment.findOne({ intern: intern._id, status: { $in: ['assigned', 'in_progress', 'revision_requested'] } })
      .populate('module', 'name')
      .sort({ createdAt: -1 }),
    Meeting.findOne({ intern: intern._id, status: 'scheduled', scheduledAt: { $gte: now } })
      .populate('mentor', 'name')
      .sort({ scheduledAt: 1 }),
    Review.find({ intern: intern._id, sharedWithIntern: true })
      .populate('task', 'title')
      .populate('mentor', 'name')
      .sort({ createdAt: -1 })
      .limit(3),
    TaskAssignment.find({ intern: intern._id }).populate('module', 'name').sort({ createdAt: -1 }).limit(10).select('title status deadline module taskId'),
    0, // placeholder — notifications counted client-side
  ]);

  res.json({
    success: true,
    data: {
      intern,
      activeTask,
      upcomingMeeting,
      recentReviews,
      taskHistory,
      progress: {
        completed: intern.completedTasksCount,
        total: intern.totalTasksCount,
        percent: intern.progressPercent,
      },
    },
  });
});

// GET /api/dashboard/mentor
exports.getMentorDashboard = asyncHandler(async (req, res) => {
  const mentor = await Mentor.findOne({ user: req.user._id });
  if (!mentor) return res.status(404).json({ success: false, message: 'Mentor profile not found.' });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const [
    assignedInterns,
    pendingReviews,
    todayMeetings,
    pendingFeedback,
  ] = await Promise.all([
    Intern.find({ assignedMentor: mentor._id, status: 'active' })
      .populate('currentModule', 'name')
      .select('name email completedTasksCount totalTasksCount currentModule status'),
    TaskAssignment.find({ mentor: mentor._id, status: 'submitted' })
      .populate('intern', 'name email')
      .populate('module', 'name')
      .sort({ updatedAt: -1 }),
    Meeting.find({ mentor: mentor._id, scheduledAt: { $gte: todayStart, $lt: todayEnd }, status: 'scheduled' })
      .populate('intern', 'name email')
      .sort({ scheduledAt: 1 }),
    Review.find({ mentor: mentor._id, sharedWithIntern: false })
      .populate('intern', 'name')
      .populate('task', 'title')
      .sort({ createdAt: -1 })
      .limit(5),
  ]);

  res.json({
    success: true,
    data: {
      mentor,
      assignedInterns,
      pendingReviews,
      todayMeetings,
      pendingFeedback,
    },
  });
});
