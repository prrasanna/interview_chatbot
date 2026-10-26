// services/geminiService.js — Google Gemini AI service (secure backend proxy)
// API key is NEVER sent to the frontend. All Gemini calls go through this service.

let genAI = null;

const getGenAI = () => {
  if (genAI) return genAI;
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI;
};

const MOCK_RESPONSES = {
  taskExplanation: (task, intern) =>
    `Hi ${intern.name}! I'm your AI Intern Coordinator. You've been assigned: "${task.title}".\n\nThis task is part of your ${task.moduleName} module. Here's what you need to know:\n\n📌 What to build: ${task.description}\n\n🛠 Technologies: ${(task.techStack || []).join(', ') || 'See task description'}\n\n📋 Deliverables:\n${(task.deliverables || []).map((d, i) => `${i + 1}. ${d}`).join('\n')}\n\n⏰ Deadline: ${new Date(task.deadline).toLocaleDateString('en-IN', { dateStyle: 'full' })}\n\nTake it one step at a time and don't hesitate to ask me questions! You've got this! 💪\n\n[NOTE: This is a MOCK AI response — GEMINI_API_KEY not configured]`,

  chatResponse: (question) =>
    `[MOCK AI] You asked: "${question}". In production, I will query your real task data and answer using Google Gemini. Please configure your GEMINI_API_KEY in the .env file.`,

  feedbackNarration: (feedback) =>
    `[MOCK AI] Here is the feedback from your mentor: ${feedback.strengths ? 'Strengths: ' + feedback.strengths + '. ' : ''}${feedback.improvements ? 'Areas to improve: ' + feedback.improvements : ''}\n\n[NOTE: MOCK response — configure GEMINI_API_KEY for real narration]`,
};

/**
 * Generate a personalized task explanation for an intern.
 */
exports.generateTaskExplanation = async ({ task, intern, meeting }) => {
  if (process.env.MOCK_GEMINI === 'true' || !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.log('[GEMINI MOCK] generateTaskExplanation — returning mock response');
    return MOCK_RESPONSES.taskExplanation(task, intern);
  }

  try {
    const model = getGenAI().getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });

    const skillLabel = intern.skillLevel || 'beginner';
    const meetingInfo = meeting
      ? `The review meeting is scheduled for ${new Date(meeting.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}.`
      : 'The review meeting details will be shared shortly.';

    const prompt = `You are a friendly, professional AI internship coordinator. You are speaking directly to ${intern.name}, a ${skillLabel}-level intern.

Generate a warm, personal, encouraging task explanation in natural conversational English. Speak as if you are a helpful senior mentor personally guiding them. Do NOT use bullet points or markdown — write in flowing, natural paragraphs that can be read aloud comfortably.

Intern name: ${intern.name}
Skill level: ${skillLabel}
Current module: ${task.moduleName}
Task title: ${task.title}
Task description: ${task.description}
Technologies involved: ${(task.techStack || []).join(', ') || 'Not specified'}
Expected deliverables: ${(task.deliverables || []).join('; ') || 'Not specified'}
Step-by-step guidance: ${(task.stepByStep || []).join(' → ') || 'Follow best practices for this module'}
Task deadline: ${new Date(task.deadline).toLocaleDateString('en-IN', { dateStyle: 'full' })}
${meetingInfo}

Cover all of these naturally in your explanation:
1. Greet the intern warmly by name
2. What this task is and why it matters for their growth
3. What they are expected to build or accomplish
4. The technologies and module involved
5. A step-by-step approach (beginner-friendly for beginners, technical for advanced)
6. The expected deliverables
7. The deadline and review schedule
8. How the task will be evaluated
9. An encouraging closing message

Keep the tone friendly, professional, and motivating. Adjust technical depth based on skill level.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return text;
  } catch (err) {
    console.error('[GEMINI ERROR] generateTaskExplanation:', err.message);
    return MOCK_RESPONSES.taskExplanation(task, intern);
  }
};

/**
 * Conversational AI response for intern voice/text questions.
 * context: { intern, activeTask, upcomingMeeting, latestReview }
 */
exports.chatWithAssistant = async ({ question, context }) => {
  if (process.env.MOCK_GEMINI === 'true' || !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.log('[GEMINI MOCK] chatWithAssistant — returning mock response');
    return { text: MOCK_RESPONSES.chatResponse(question), isMock: true };
  }

  try {
    const model = getGenAI().getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });

    const { intern, activeTask, upcomingMeeting, latestReview } = context;

    const contextStr = `
Intern name: ${intern.name}
Skill level: ${intern.skillLevel}
Current module: ${activeTask?.moduleName || 'Not assigned'}
Active task: ${activeTask ? `"${activeTask.title}" — deadline ${new Date(activeTask.deadline).toLocaleDateString('en-IN')}` : 'No active task'}
Upcoming review meeting: ${upcomingMeeting ? new Date(upcomingMeeting.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Not scheduled'}
Latest feedback: ${latestReview ? (latestReview.finalFeedback || latestReview.aiGeneratedFeedback || 'No feedback shared yet') : 'No review completed yet'}
`.trim();

    const prompt = `You are a friendly AI internship coordinator assistant. Use ONLY the provided context to answer the intern's question. Do NOT invent deadlines, dates, tasks, or feedback that are not in the context.

If the information is not available in the context, politely say you don't have that information yet and suggest they contact their mentor or admin.

Context about ${intern.name}:
${contextStr}

Intern's question: "${question}"

Respond in a warm, natural, conversational tone — 2 to 4 sentences max, suitable for being read aloud. Use the intern's name once.`;

    const result = await model.generateContent(prompt);
    return { text: result.response.text(), isMock: false };
  } catch (err) {
    console.error('[GEMINI ERROR] chatWithAssistant:', err.message);
    return { text: `I'm having trouble connecting to my AI service right now. Please try again shortly.`, isMock: false, error: err.message };
  }
};

/**
 * Generate AI-polished feedback narration from mentor notes.
 */
exports.generateFeedbackNarration = async ({ review, intern }) => {
  if (process.env.MOCK_GEMINI === 'true' || !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.log('[GEMINI MOCK] generateFeedbackNarration — returning mock response');
    return MOCK_RESPONSES.feedbackNarration(review);
  }

  try {
    const model = getGenAI().getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });

    const prompt = `You are a compassionate AI internship coordinator. Transform the mentor's raw review notes into clear, constructive, personalized feedback for ${intern.name}. Speak directly to the intern in a warm but professional tone. Write in natural paragraphs suitable to be read aloud.

Mentor's raw notes:
Completion status: ${review.completionStatus}
Technical accuracy (out of 10): ${review.technicalAccuracy}
Code quality (out of 10): ${review.codeQuality}
Strengths: ${review.strengths || 'Not specified'}
Mistakes: ${review.mistakes || 'None noted'}
Required improvements: ${review.improvements || 'Not specified'}
Task outcome: ${review.taskOutcome}
Next steps: ${review.nextSteps || 'Not specified'}
Learning resources: ${(review.learningResources || []).join(', ') || 'None recommended'}

Generate personalized, actionable, encouraging feedback for ${intern.name}. Cover all the points naturally. End with a motivating message.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error('[GEMINI ERROR] generateFeedbackNarration:', err.message);
    return MOCK_RESPONSES.feedbackNarration(review);
  }
};

/**
 * AI task recommendations for an intern based on their profile and history.
 */
exports.recommendTasks = async ({ intern, availableTasks, completedTaskTitles }) => {
  if (process.env.MOCK_GEMINI === 'true' || !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    const topThree = availableTasks.slice(0, 3).map((t) => ({ id: t._id, title: t.title, reason: 'Mock recommendation — configure GEMINI_API_KEY for real AI matching' }));
    return topThree;
  }

  try {
    const model = getGenAI().getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });

    const taskList = availableTasks.map((t, i) => `${i + 1}. [ID:${t._id}] ${t.title} (${t.difficulty}, module: ${t.moduleName})`).join('\n');

    const prompt = `You are an AI internship task allocator. Based on the intern profile and their completed tasks, recommend the TOP 3 most suitable tasks from the list. Return ONLY a valid JSON array with objects: { "id": "<task ObjectId>", "title": "<task title>", "reason": "<one-sentence explanation>" }.

Intern profile:
- Name: ${intern.name}
- Skill level: ${intern.skillLevel}
- Current module: ${intern.moduleName}
- Completed tasks: ${completedTaskTitles.join(', ') || 'None yet'}

Available tasks:
${taskList}

Return ONLY the JSON array. No extra text.`;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text().trim();
    // Extract JSON from response
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found in Gemini response');
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('[GEMINI ERROR] recommendTasks:', err.message);
    return availableTasks.slice(0, 3).map((t) => ({ id: t._id, title: t.title, reason: 'Fallback recommendation due to AI error' }));
  }
};
