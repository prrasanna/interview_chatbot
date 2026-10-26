// templates/feedbackEmail.js — Post-review feedback email to intern
const feedbackEmail = ({ intern, review, task, nextTask, nextMeeting }) => {
  const outcomeColor = review.taskOutcome === 'approved' ? '#00b894' : review.taskOutcome === 'revision_required' ? '#fdcb6e' : '#e17055';
  const outcomeLabel = { approved: '✅ Task Approved!', revision_required: '🔄 Revision Required', reassigned: '↗️ New Task Assigned' }[review.taskOutcome] || review.taskOutcome;
  const ratingBar = (val) => val ? `${'⭐'.repeat(Math.round(val / 2))} (${val}/10)` : 'Not rated';

  const nextTaskSection = nextTask
    ? `<div style="background:#f0f4ff;border-radius:8px;padding:20px;margin:20px 0;">
        <strong style="color:#667eea;">🚀 Your Next Task</strong>
        <p style="margin:8px 0;"><strong>${nextTask.title}</strong></p>
        <p style="margin:0;color:#666;font-size:14px;">${nextTask.moduleName} · Deadline: ${new Date(nextTask.deadline).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
       </div>`
    : '';

  const nextMeetingSection = nextMeeting
    ? `<p><strong>Next Review Meeting:</strong> ${new Date(nextMeeting.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' })}</p>`
    : review.nextReviewDate
    ? `<p><strong>Next Review Date:</strong> ${new Date(review.nextReviewDate).toLocaleDateString('en-IN', { dateStyle: 'full' })}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Review Feedback — ${task.title}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6fb; margin: 0; padding: 20px; }
  .container { max-width: 640px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #2d3436 0%, #636e72 100%); padding: 32px; color: white; text-align: center; }
  .header h1 { margin: 0 0 8px; font-size: 22px; }
  .outcome-badge { display: inline-block; background: ${outcomeColor}; border-radius: 20px; padding: 6px 20px; font-size: 14px; font-weight: 700; margin-top: 8px; }
  .body { padding: 32px; color: #333; line-height: 1.7; }
  .section-title { font-size: 15px; font-weight: 700; color: #4a4a8a; margin: 24px 0 10px; border-left: 4px solid #667eea; padding-left: 10px; }
  .feedback-text { background: #f8f9fa; border-radius: 8px; padding: 20px; font-size: 15px; line-height: 1.8; white-space: pre-line; }
  .ratings { display: flex; gap: 20px; margin: 12px 0; flex-wrap: wrap; }
  .rating-item { background: #f0f4ff; border-radius: 8px; padding: 12px 16px; flex: 1; min-width: 120px; }
  .rating-label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
  .rating-value { font-size: 16px; font-weight: 700; color: #333; margin-top: 4px; }
  .cta { text-align: center; margin: 28px 0; }
  .btn { display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; }
  .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #999; font-size: 12px; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>📋 Review Feedback</h1>
    <p style="margin:4px 0;opacity:0.8;">${task.title}</p>
    <span class="outcome-badge">${outcomeLabel}</span>
  </div>
  <div class="body">
    <p>Hi <strong>${intern.name}</strong>,</p>
    <p>Your mentor has completed the review of your task. Here is your personalized feedback:</p>

    <div class="ratings">
      <div class="rating-item">
        <div class="rating-label">Technical Accuracy</div>
        <div class="rating-value">${ratingBar(review.technicalAccuracy)}</div>
      </div>
      <div class="rating-item">
        <div class="rating-label">Code Quality</div>
        <div class="rating-value">${ratingBar(review.codeQuality)}</div>
      </div>
    </div>

    <div class="section-title">Mentor Feedback</div>
    <div class="feedback-text">${review.finalFeedback || review.aiGeneratedFeedback || 'No feedback text provided.'}</div>

    ${review.strengths ? `<div class="section-title">✅ Strengths</div><p>${review.strengths}</p>` : ''}
    ${review.improvements ? `<div class="section-title">🔧 Areas for Improvement</div><p>${review.improvements}</p>` : ''}
    ${review.nextSteps ? `<div class="section-title">📌 Next Steps</div><p>${review.nextSteps}</p>` : ''}
    ${review.learningResources?.length ? `<div class="section-title">📚 Learning Resources</div><ul>${review.learningResources.map(r => `<li><a href="${r}" style="color:#667eea;">${r}</a></li>`).join('')}</ul>` : ''}
    ${review.revisedDeadline ? `<p><strong>Revised Deadline:</strong> ${new Date(review.revisedDeadline).toLocaleDateString('en-IN', { dateStyle: 'full' })}</p>` : ''}
    ${nextMeetingSection}
    ${nextTaskSection}

    <div class="cta">
      <a href="${process.env.FRONTEND_URL}/intern/dashboard" class="btn">View on Dashboard →</a>
    </div>
  </div>
  <div class="footer"><p>AI Intern Coordinator · ${process.env.EMAIL_FROM_NAME}</p><p>This is an automated notification.</p></div>
</div>
</body></html>`;
};

module.exports = feedbackEmail;
