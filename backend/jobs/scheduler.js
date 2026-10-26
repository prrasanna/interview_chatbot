// jobs/scheduler.js — Background cron jobs for automated reminders
// Uses node-cron. Runs inside the Node.js process — does NOT require the browser to be open.
const cron = require('node-cron');
const TaskAssignment = require('../models/TaskAssignment');
const Meeting = require('../models/Meeting');
const Intern = require('../models/Intern');
const emailService = require('../services/emailService');
const reminderEmail = require('../templates/reminderEmail');

// ─── Job 1: Task deadline reminders (runs every hour) ────────────────────────
const taskDeadlineReminders = async () => {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Tasks due within the next 24 hours that haven't sent a reminder yet
    const tasks = await TaskAssignment.find({
      status: { $in: ['assigned', 'in_progress'] },
      deadline: { $gt: now, $lte: in24h },
      reminderSent24h: false,
    }).populate({ path: 'intern', populate: { path: 'user' } });

    for (const task of tasks) {
      const intern = task.intern;
      if (!intern || !intern.email) continue;

      const html = reminderEmail({ type: 'task_due', intern, task });
      await emailService.sendEmail({
        to: intern.email,
        toName: intern.name,
        subject: `⏰ Reminder: "${task.title}" is due tomorrow`,
        html,
        type: 'task_reminder',
        relatedIntern: intern._id,
        relatedTask: task._id,
      });

      await TaskAssignment.findByIdAndUpdate(task._id, { reminderSent24h: true });
      console.log(`[SCHEDULER] Deadline reminder sent to ${intern.email} for task ${task.taskId}`);
    }
  } catch (err) {
    console.error('[SCHEDULER] taskDeadlineReminders error:', err.message);
  }
};

// ─── Job 2: Overdue task notifications (runs every 6 hours) ──────────────────
const overdueTaskNotifications = async () => {
  try {
    const now = new Date();
    const tasks = await TaskAssignment.find({
      status: { $in: ['assigned', 'in_progress'] },
      deadline: { $lt: now },
      overdueNotified: false,
    }).populate({ path: 'intern', populate: { path: 'user' } });

    for (const task of tasks) {
      const intern = task.intern;
      if (!intern || !intern.email) continue;

      const html = reminderEmail({ type: 'task_overdue', intern, task });
      await emailService.sendEmail({
        to: intern.email,
        toName: intern.name,
        subject: `🚨 Action Required: "${task.title}" is overdue`,
        html,
        type: 'task_overdue',
        relatedIntern: intern._id,
        relatedTask: task._id,
      });

      await TaskAssignment.findByIdAndUpdate(task._id, {
        status: 'overdue',
        overdueNotified: true,
      });
      console.log(`[SCHEDULER] Overdue notice sent to ${intern.email} for task ${task.taskId}`);
    }
  } catch (err) {
    console.error('[SCHEDULER] overdueTaskNotifications error:', err.message);
  }
};

// ─── Job 3: Meeting reminders (runs every hour) ───────────────────────────────
const meetingReminders = async () => {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const meetings = await Meeting.find({
      status: 'scheduled',
      scheduledAt: { $gt: now, $lte: in24h },
      reminderSent24h: false,
    }).populate({ path: 'intern', populate: { path: 'user' } });

    for (const meeting of meetings) {
      const intern = meeting.intern;
      if (!intern || !intern.email) continue;

      const html = reminderEmail({ type: 'meeting_reminder', intern, meeting });
      await emailService.sendEmail({
        to: intern.email,
        toName: intern.name,
        subject: `📅 Upcoming Review Meeting Tomorrow: ${meeting.title}`,
        html,
        type: 'meeting_reminder',
        relatedIntern: intern._id,
        relatedMeeting: meeting._id,
      });

      await Meeting.findByIdAndUpdate(meeting._id, { reminderSent24h: true });
      console.log(`[SCHEDULER] Meeting reminder sent to ${intern.email} for meeting ${meeting._id}`);
    }
  } catch (err) {
    console.error('[SCHEDULER] meetingReminders error:', err.message);
  }
};

// ─── Start all cron jobs ─────────────────────────────────────────────────────
exports.startScheduler = () => {
  // Every hour at :00
  cron.schedule('0 * * * *', taskDeadlineReminders, { timezone: 'Asia/Kolkata' });
  cron.schedule('0 * * * *', meetingReminders, { timezone: 'Asia/Kolkata' });
  // Every 6 hours at :00
  cron.schedule('0 */6 * * *', overdueTaskNotifications, { timezone: 'Asia/Kolkata' });

  console.log('✅ Background scheduler started (deadline/meeting reminders, overdue alerts)');
};
