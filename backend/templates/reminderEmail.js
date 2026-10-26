// templates/reminderEmail.js — Reminder emails: deadline, overdue, meeting
const reminderEmail = ({ type, intern, task, meeting }) => {
  const isOverdue = type === 'task_overdue';
  const isMeetingReminder = type === 'meeting_reminder';
  const headerColor = isOverdue ? '#d63031' : isMeetingReminder ? '#00b894' : '#fdcb6e';
  const emoji = isOverdue ? '🚨' : isMeetingReminder ? '📅' : '⏰';
  let subject = '';
  let headline = '';
  let body = '';

  if (type === 'task_due') {
    subject = `Reminder: "${task.title}" deadline in 24 hours`;
    headline = 'Deadline Reminder';
    const deadline = new Date(task.deadline).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' });
    body = `<p>Hi ${intern.name},</p>
<p>This is a friendly reminder that your task <strong>"${task.title}"</strong> is due in less than 24 hours.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;width:40%;">Task</td><td style="padding:8px;border-bottom:1px solid #eee;">${task.title}</td></tr>
  <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;">Task ID</td><td style="padding:8px;border-bottom:1px solid #eee;"><code>${task.taskId}</code></td></tr>
  <tr><td style="padding:8px;font-weight:600;color:#d63031;">Deadline</td><td style="padding:8px;color:#d63031;font-weight:600;">${deadline} (IST)</td></tr>
</table>
<p>Please make sure to submit your work on the intern dashboard before the deadline.</p>`;
  } else if (type === 'task_overdue') {
    subject = `Action Required: "${task.title}" is overdue`;
    headline = 'Task Overdue';
    const deadline = new Date(task.deadline).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' });
    body = `<p>Hi ${intern.name},</p>
<p>Your task <strong>"${task.title}"</strong> was due on ${deadline} and has not been submitted yet.</p>
<p>Please contact your mentor or submit your work immediately. Late submissions may affect your evaluation.</p>`;
  } else if (type === 'meeting_reminder') {
    subject = `Upcoming Review Meeting: ${new Date(meeting.scheduledAt).toLocaleDateString('en-IN')}`;
    headline = 'Review Meeting Tomorrow';
    const meetingTime = new Date(meeting.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' });
    body = `<p>Hi ${intern.name},</p>
<p>Your review meeting <strong>"${meeting.title}"</strong> is scheduled for tomorrow.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;width:40%;">Meeting</td><td style="padding:8px;border-bottom:1px solid #eee;">${meeting.title}</td></tr>
  <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;">Date & Time</td><td style="padding:8px;border-bottom:1px solid #eee;">${meetingTime} (IST)</td></tr>
  <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;">Duration</td><td style="padding:8px;border-bottom:1px solid #eee;">${meeting.duration || 60} minutes</td></tr>
  ${meeting.meetingLink ? `<tr><td style="padding:8px;font-weight:600;">Meeting Link</td><td style="padding:8px;"><a href="${meeting.meetingLink}" style="color:#667eea;">Join Meeting</a></td></tr>` : ''}
  ${meeting.location && !meeting.meetingLink ? `<tr><td style="padding:8px;font-weight:600;">Location</td><td style="padding:8px;">${meeting.location}</td></tr>` : ''}
</table>
<p>Please ensure your submission is ready and review the task deliverables before the meeting.</p>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${subject}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6fb; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { background: ${headerColor}; padding: 28px; color: white; text-align: center; }
  .header h1 { margin: 0; font-size: 22px; }
  .body { padding: 28px 32px; color: #333; line-height: 1.7; }
  .cta { text-align: center; margin: 24px 0; }
  .btn { display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; }
  .footer { background: #f8f9fa; padding: 16px; text-align: center; color: #999; font-size: 12px; }
</style>
</head>
<body>
<div class="container">
  <div class="header"><h1>${emoji} ${headline}</h1></div>
  <div class="body">${body}
    <div class="cta">
      <a href="${process.env.FRONTEND_URL}/intern/dashboard" class="btn">Go to Dashboard →</a>
    </div>
  </div>
  <div class="footer"><p>AI Intern Coordinator · Automated Reminder · Do not reply to this email.</p></div>
</div>
</body></html>`;
};

module.exports = reminderEmail;
