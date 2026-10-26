// controllers/taskController.js — Task templates + assignments + AI recommendations
const TaskTemplate = require('../models/TaskTemplate');
const TaskAssignment = require('../models/TaskAssignment');
const Intern = require('../models/Intern');
const Module = require('../models/Module');
const Meeting = require('../models/Meeting');
const emailService = require('../services/emailService');
const geminiService = require('../services/geminiService');
const taskAssignmentEmail = require('../templates/taskAssignmentEmail');
const asyncHandler = require('../utils/asyncHandler');
const { v4: uuidv4 } = require('uuid');

// ─── Task Templates ──────────────────────────────────────────────────────────

// GET /api/tasks/templates
exports.getTemplates = asyncHandler(async (req, res) => {
  const { module: moduleId, difficulty, search, page = 1, limit = 20 } = req.query;
  const filter = { isActive: true };
  if (moduleId) filter.module = moduleId;
  if (difficulty) filter.difficulty = difficulty;
  if (search) filter.$text = { $search: search };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [templates, total] = await Promise.all([
    TaskTemplate.find(filter).populate('module', 'name').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    TaskTemplate.countDocuments(filter),
  ]);

  res.json({ success: true, data: templates, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
});

// POST /api/tasks/templates
exports.createTemplate = asyncHandler(async (req, res) => {
  const { title, description, moduleId, difficulty, priority, estimatedDays, techStack, deliverables, stepByStep, learningResources, tags } = req.body;
  if (!title || !description || !moduleId) {
    return res.status(400).json({ success: false, message: 'title, description, and moduleId are required.' });
  }
  const module = await Module.findById(moduleId);
  if (!module) return res.status(400).json({ success: false, message: 'Module not found.' });

  const template = await TaskTemplate.create({
    title, description, module: moduleId, difficulty, priority, estimatedDays,
    techStack: techStack || [], deliverables: deliverables || [],
    stepByStep: stepByStep || [], learningResources: learningResources || [],
    tags: tags || [], createdBy: req.user._id,
  });

  await template.populate('module', 'name');
  res.status(201).json({ success: true, message: 'Task template created.', data: template });
});

// PATCH /api/tasks/templates/:id
exports.updateTemplate = asyncHandler(async (req, res) => {
  const template = await TaskTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('module', 'name');
  if (!template) return res.status(404).json({ success: false, message: 'Template not found.' });
  res.json({ success: true, data: template });
});

// DELETE /api/tasks/templates/:id (soft delete)
exports.deleteTemplate = asyncHandler(async (req, res) => {
  await TaskTemplate.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true, message: 'Template deactivated.' });
});

// ─── Task Assignments ─────────────────────────────────────────────────────────

// GET /api/tasks/assignments — list assignments (filtered by intern for intern role)
exports.getAssignments = asyncHandler(async (req, res) => {
  const { internId, status, module: moduleId, page = 1, limit = 20 } = req.query;
  const filter = {};

  if (req.user.role === 'intern') {
    const intern = await Intern.findOne({ user: req.user._id });
    if (!intern) return res.status(404).json({ success: false, message: 'Intern profile not found.' });
    filter.intern = intern._id;
  } else if (internId) {
    filter.intern = internId;
  }

  if (status) filter.status = status;
  if (moduleId) filter.module = moduleId;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [assignments, total] = await Promise.all([
    TaskAssignment.find(filter)
      .populate('module', 'name')
      .populate('intern', 'name email')
      .populate('mentor', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    TaskAssignment.countDocuments(filter),
  ]);

  res.json({ success: true, data: assignments, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
});

// GET /api/tasks/assignments/:id
exports.getAssignment = asyncHandler(async (req, res) => {
  const task = await TaskAssignment.findById(req.params.id)
    .populate('module', 'name techStack')
    .populate('intern', 'name email skillLevel')
    .populate('mentor', 'name email phone');

  if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

  // Interns can only view their own tasks
  if (req.user.role === 'intern') {
    const intern = await Intern.findOne({ user: req.user._id });
    if (!intern || intern._id.toString() !== task.intern._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
  }

  res.json({ success: true, data: task });
});

// POST /api/tasks/assignments — assign task to intern(s)
exports.assignTask = asyncHandler(async (req, res) => {
  const {
    internIds,        // array — can be single or bulk
    templateId,       // optional — use existing template
    title, description, moduleId, difficulty, priority,
    techStack, deliverables, stepByStep, learningResources,
    startDate, deadline, reviewDate, mentorId,
    sendEmail = true,
  } = req.body;

  if (!internIds || !internIds.length) {
    return res.status(400).json({ success: false, message: 'At least one internId is required.' });
  }
  if (!deadline) return res.status(400).json({ success: false, message: 'deadline is required.' });
  if (!startDate) return res.status(400).json({ success: false, message: 'startDate is required.' });

  const module = await Module.findById(moduleId);
  if (!module) return res.status(400).json({ success: false, message: 'Module not found.' });

  const bulkBatchId = internIds.length > 1 ? `BULK-${uuidv4().slice(0, 8).toUpperCase()}` : undefined;

  const results = { created: [], errors: [] };

  for (const internId of internIds) {
    try {
      const intern = await Intern.findById(internId).populate('assignedMentor', 'name email');
      if (!intern) { results.errors.push(`Intern ${internId}: not found`); continue; }

      // Get task data from template or direct input
      let taskData = { title, description, moduleId: module._id, difficulty, priority, techStack, deliverables, stepByStep, learningResources };
      if (templateId) {
        const tmpl = await TaskTemplate.findById(templateId);
        if (tmpl) {
          taskData = {
            title: tmpl.title, description: tmpl.description,
            moduleId: tmpl.module, difficulty: tmpl.difficulty,
            priority: tmpl.priority, techStack: tmpl.techStack,
            deliverables: tmpl.deliverables, stepByStep: tmpl.stepByStep,
            learningResources: tmpl.learningResources,
          };
        }
      }

      const assignment = await TaskAssignment.create({
        intern: intern._id,
        template: templateId || undefined,
        title: taskData.title,
        description: taskData.description,
        module: taskData.moduleId,
        difficulty: taskData.difficulty || 'medium',
        priority: taskData.priority || 'medium',
        techStack: taskData.techStack || [],
        deliverables: taskData.deliverables || [],
        stepByStep: taskData.stepByStep || [],
        learningResources: taskData.learningResources || [],
        startDate: new Date(startDate),
        deadline: new Date(deadline),
        reviewDate: reviewDate ? new Date(reviewDate) : undefined,
        assignedBy: req.user._id,
        mentor: mentorId || intern.assignedMentor?._id,
        bulkBatchId,
      });

      await assignment.populate('module', 'name');
      // Update intern task count
      await Intern.findByIdAndUpdate(intern._id, { $inc: { totalTasksCount: 1 } });

      // Send assignment email
      if (sendEmail) {
        const meeting = reviewDate ? { scheduledAt: reviewDate, title: 'Review Meeting' } : null;
        const mentor = intern.assignedMentor;
        const html = taskAssignmentEmail({
          intern,
          task: { ...assignment.toObject(), moduleName: module.name },
          meeting,
          mentor,
        });
        await emailService.sendEmail({
          to: intern.email,
          toName: intern.name,
          subject: `🚀 New Task Assigned: ${assignment.title}`,
          html,
          type: 'task_assignment',
          relatedIntern: intern._id,
          relatedTask: assignment._id,
        });
      }

      results.created.push({ internId: intern._id, taskId: assignment.taskId, assignmentId: assignment._id });
    } catch (err) {
      results.errors.push(`Intern ${internId}: ${err.message}`);
    }
  }

  res.status(201).json({
    success: true,
    message: `Assigned ${results.created.length} task(s). Errors: ${results.errors.length}.`,
    bulkBatchId,
    results,
  });
});

// PATCH /api/tasks/assignments/:id/status — update task status
exports.updateAssignmentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['assigned', 'in_progress', 'submitted', 'under_review', 'revision_requested', 'approved', 'overdue'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: `Invalid status. Allowed: ${validStatuses.join(', ')}` });
  }

  const task = await TaskAssignment.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

  if (status === 'approved') {
    await Intern.findByIdAndUpdate(task.intern, { $inc: { completedTasksCount: 1 } });
  }

  res.json({ success: true, message: 'Task status updated.', data: task });
});

// POST /api/tasks/assignments/recommend — AI task recommendations
exports.recommendTasks = asyncHandler(async (req, res) => {
  const { internId } = req.body;
  if (!internId) return res.status(400).json({ success: false, message: 'internId is required.' });

  const intern = await Intern.findById(internId).populate('currentModule', 'name');
  if (!intern) return res.status(404).json({ success: false, message: 'Intern not found.' });

  // Get available templates for intern's module
  const filter = { isActive: true };
  if (intern.currentModule) filter.module = intern.currentModule._id;
  const templates = await TaskTemplate.find(filter).populate('module', 'name').limit(20);

  // Get intern's completed task titles
  const completedAssignments = await TaskAssignment.find({ intern: intern._id, status: 'approved' }).select('title');
  const completedTitles = completedAssignments.map((a) => a.title);

  const recommendations = await geminiService.recommendTasks({
    intern: { ...intern.toObject(), moduleName: intern.currentModule?.name },
    availableTasks: templates.map((t) => ({ ...t.toObject(), moduleName: t.module?.name })),
    completedTaskTitles: completedTitles,
  });

  res.json({
    success: true,
    message: 'AI recommendations generated. Review and approve before assigning.',
    data: recommendations,
    note: 'These are AI suggestions. Admin must approve and confirm each assignment.',
  });
});

// GET /api/tasks/assignments/:id/explanation — generate/retrieve AI explanation
exports.getTaskExplanation = asyncHandler(async (req, res) => {
  const task = await TaskAssignment.findById(req.params.id).populate('module', 'name techStack').populate('intern', 'name skillLevel');
  if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

  // Interns can only get their own task explanation
  if (req.user.role === 'intern') {
    const intern = await Intern.findOne({ user: req.user._id });
    if (!intern || intern._id.toString() !== task.intern._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
  }

  // Use cached explanation if exists
  if (task.aiExplanationGenerated && task.aiExplanationText) {
    return res.json({ success: true, data: { explanation: task.aiExplanationText, cached: true } });
  }

  // Find upcoming meeting for this task
  const meeting = await Meeting.findOne({ task: task._id, status: 'scheduled' }).sort({ scheduledAt: 1 });

  const explanation = await geminiService.generateTaskExplanation({
    task: { ...task.toObject(), moduleName: task.module?.name },
    intern: task.intern,
    meeting,
  });

  // Cache the explanation
  await TaskAssignment.findByIdAndUpdate(task._id, {
    aiExplanationGenerated: true,
    aiExplanationText: explanation,
  });

  res.json({ success: true, data: { explanation, cached: false } });
});
