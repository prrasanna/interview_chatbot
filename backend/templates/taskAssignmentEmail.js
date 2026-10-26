// templates/taskAssignmentEmail.js — HTML email for new task assignment
const taskAssignmentEmail = ({ intern, task, meeting, mentor }) => {
  const deadline = new Date(task.deadline).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'short',
  });
  const startDate = new Date(task.startDate).toLocaleDateString('en-IN', { dateStyle: 'long' });
  const meetingInfo = meeting
    ? `<tr><td><strong>Review Meeting</strong></td><td>${new Date(meeting.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' })}${meeting.meetingLink ? ` — <a href="${meeting.meetingLink}">Join Meeting</a>` : meeting.location ? ` @ ${meeting.location}` : ''}</td></tr>`
    : '';
  const mentorInfo = mentor
    ? `<tr><td><strong>Your Mentor</strong></td><td>${mentor.name} — ${mentor.email}</td></tr>`
    : '';
  const deliverables = (task.deliverables || []).map((d) => `<li>${d}</li>`).join('');
  const steps = (task.stepByStep || []).map((s, i) => `<li>${i + 1}. ${s}</li>`).join('');
  const techStack = (task.techStack || []).join(', ') || 'See task description';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>New Task Assignment - ${task.title}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6fb; margin: 0; padding: 20px; }
  .container { max-width: 640px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; color: white; text-align: center; }
  .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
  .header p { margin: 8px 0 0; opacity: 0.9; }
  .badge { display: inline-block; background: rgba(255,255,255,0.2); border-radius: 20px; padding: 4px 16px; font-size: 13px; margin-top: 8px; }
  .body { padding: 32px; }
  .greeting { font-size: 18px; color: #1a1a2e; margin-bottom: 8px; }
  .intro { color: #555; line-height: 1.6; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; color: #333; font-size: 14px; vertical-align: top; }
  td:first-child { font-weight: 600; color: #555; width: 36%; white-space: nowrap; }
  .section-title { font-size: 16px; font-weight: 700; color: #4a4a8a; margin: 24px 0 8px; border-left: 4px solid #667eea; padding-left: 10px; }
  ul { margin: 0; padding-left: 20px; color: #444; line-height: 1.8; }
  .deadline-box { background: linear-gradient(135deg, #ff6b6b15, #ff6b6b05); border: 1px solid #ff6b6b40; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center; }
  .deadline-box .label { color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
  .deadline-box .date { color: #d63031; font-size: 18px; font-weight: 700; margin-top: 4px; }
  .cta { text-align: center; margin: 28px 0; }
  .btn { display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; }
  .footer { background: #f8f9fa; padding: 20px 32px; text-align: center; color: #888; font-size: 12px; }
  .task-id { color: #999; font-size: 12px; margin-top: 4px; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>🚀 New Task Assigned!</h1>
    <p>${task.title}</p>
    <span class="badge">${task.moduleName} · ${task.difficulty || 'Medium'}</span>
  </div>
  <div class="body">
    <p class="greeting">Hi ${intern.name}! 👋</p>
    <p class="intro">A new task has been assigned to you as part of your internship program. Please review the details below and get started when you're ready.</p>
    
    <div class="section-title">Task Details</div>
    <table>
      <tr><td>Task ID</td><td><code>${task.taskId}</code></td></tr>
      <tr><td>Module</td><td>${task.moduleName}</td></tr>
      <tr><td>Tech Stack</td><td>${techStack}</td></tr>
      <tr><td>Priority</td><td>${task.priority || 'Medium'}</td></tr>
      <tr><td>Start Date</td><td>${startDate}</td></tr>
      ${meetingInfo}
      ${mentorInfo}
    </table>

    <div class="section-title">Task Description</div>
    <p style="color:#444; line-height:1.7;">${task.description}</p>

    ${deliverables ? `<div class="section-title">Expected Deliverables</div><ul>${deliverables}</ul>` : ''}
    ${steps ? `<div class="section-title">Step-by-Step Guide</div><ul>${steps}</ul>` : ''}

    <div class="deadline-box">
      <div class="label">⏰ Submission Deadline</div>
      <div class="date">${deadline} (IST)</div>
    </div>

    <div class="cta">
      <a href="${process.env.FRONTEND_URL}/intern/dashboard" class="btn">View on Dashboard →</a>
    </div>
  </div>
  <div class="footer">
    <p>AI Intern Coordinator · ${process.env.EMAIL_FROM_NAME}</p>
    <p class="task-id">Task ID: ${task.taskId} · This is an automated notification.</p>
  </div>
</div>
</body></html>`;
};

module.exports = taskAssignmentEmail;
