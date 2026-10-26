// controllers/internController.js — Full CRUD + CSV import for interns
const Intern = require('../models/Intern');
const User = require('../models/User');
const Mentor = require('../models/Mentor');
const Module = require('../models/Module');
const ModuleChangeHistory = require('../models/ModuleChangeHistory');
const emailService = require('../services/emailService');
const { parseInternCsv } = require('../utils/csvParser');
const asyncHandler = require('../utils/asyncHandler');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// GET /api/interns — list with search, filter, pagination
exports.getInterns = asyncHandler(async (req, res) => {
  const { search, status, module: moduleId, mentor: mentorId, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (moduleId) filter.currentModule = moduleId;
  if (mentorId) filter.assignedMentor = mentorId;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { college: { $regex: search, $options: 'i' } },
    ];
  }

  // Role-based access: mentors only see their interns
  if (req.user.role === 'mentor') {
    const mentor = await Mentor.findOne({ user: req.user._id });
    if (mentor) filter.assignedMentor = mentor._id;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [interns, total] = await Promise.all([
    Intern.find(filter)
      .populate('currentModule', 'name')
      .populate('assignedMentor', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Intern.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: interns,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
  });
});

// GET /api/interns/:id
exports.getIntern = asyncHandler(async (req, res) => {
  const intern = await Intern.findById(req.params.id)
    .populate('currentModule')
    .populate('assignedMentor')
    .populate('user', 'name email isActive');

  if (!intern) return res.status(404).json({ success: false, message: 'Intern not found.' });

  // Interns can only view their own profile
  if (req.user.role === 'intern') {
    const selfIntern = await Intern.findOne({ user: req.user._id });
    if (!selfIntern || selfIntern._id.toString() !== intern._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
  }

  res.json({ success: true, data: intern });
});

// POST /api/interns — create single intern (admin)
exports.createIntern = asyncHandler(async (req, res) => {
  const { name, email, password = 'Intern@123', phone, college, joiningDate, endDate, moduleId, mentorId, skillLevel = 'beginner' } = req.body;

  if (!name || !email || !joiningDate || !endDate) {
    return res.status(400).json({ success: false, message: 'name, email, joiningDate, and endDate are required.' });
  }

  // Check duplicate
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(400).json({ success: false, message: `An account already exists for email: ${email}` });
  }

  // Create user account
  const user = await User.create({ name, email, password, role: 'intern' });

  // Resolve module
  let moduleDoc = null;
  if (moduleId) {
    moduleDoc = await Module.findById(moduleId);
    if (!moduleDoc) return res.status(400).json({ success: false, message: 'Module not found.' });
  }

  // Resolve mentor
  let mentorDoc = null;
  if (mentorId) {
    mentorDoc = await Mentor.findById(mentorId);
    if (!mentorDoc) return res.status(400).json({ success: false, message: 'Mentor not found.' });
    await Mentor.findByIdAndUpdate(mentorId, { $addToSet: { assignedInterns: user._id } });
  }

  const joining = new Date(joiningDate);
  const end = new Date(endDate);
  const durationWeeks = Math.round((end - joining) / (7 * 24 * 60 * 60 * 1000));

  const intern = await Intern.create({
    user: user._id,
    name,
    email: email.toLowerCase(),
    phone,
    college,
    joiningDate: joining,
    endDate: end,
    duration: durationWeeks,
    currentModule: moduleDoc?._id,
    assignedMentor: mentorDoc?._id,
    skillLevel,
  });

  // Send welcome email
  await emailService.sendEmail({
    to: email,
    toName: name,
    subject: '🎉 Welcome to the Internship Program!',
    html: `<p>Hi ${name}, welcome! Your login: email = ${email}, password = ${password}. Please change your password on first login. <a href="${process.env.FRONTEND_URL}">Click here to login.</a></p>`,
    type: 'welcome',
    relatedIntern: intern._id,
  });

  res.status(201).json({ success: true, message: 'Intern created successfully.', data: intern });
});

// PATCH /api/interns/:id — update intern
exports.updateIntern = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'phone', 'college', 'endDate', 'skillLevel', 'status', 'voiceDataConsent'];
  const updates = {};
  allowedFields.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  // Module change — requires special handling
  if (req.body.moduleId && req.body.moduleId !== undefined) {
    const intern = await Intern.findById(req.params.id);
    if (!intern) return res.status(404).json({ success: false, message: 'Intern not found.' });
    const newModule = await Module.findById(req.body.moduleId);
    if (!newModule) return res.status(400).json({ success: false, message: 'Module not found.' });

    if (intern.currentModule?.toString() !== req.body.moduleId) {
      // Log the module change
      await ModuleChangeHistory.create({
        intern: intern._id,
        previousModule: intern.currentModule,
        newModule: newModule._id,
        reason: req.body.changeReason || 'Module updated by admin',
        approvedBy: req.user._id,
        tasksCompletedInPreviousModule: intern.completedTasksCount,
      });
    }
    updates.currentModule = newModule._id;
  }

  // Mentor reassignment
  if (req.body.mentorId !== undefined) {
    const intern = await Intern.findById(req.params.id);
    if (intern?.assignedMentor) {
      await Mentor.findByIdAndUpdate(intern.assignedMentor, { $pull: { assignedInterns: intern.user } });
    }
    if (req.body.mentorId) {
      await Mentor.findByIdAndUpdate(req.body.mentorId, { $addToSet: { assignedInterns: intern?.user } });
      updates.assignedMentor = req.body.mentorId;
    } else {
      updates.assignedMentor = null;
    }
  }

  const intern = await Intern.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
    .populate('currentModule', 'name')
    .populate('assignedMentor', 'name email');

  if (!intern) return res.status(404).json({ success: false, message: 'Intern not found.' });

  res.json({ success: true, message: 'Intern updated successfully.', data: intern });
});

// DELETE /api/interns/:id — deactivate (soft delete)
exports.deactivateIntern = asyncHandler(async (req, res) => {
  const intern = await Intern.findByIdAndUpdate(req.params.id, { status: 'deactivated' }, { new: true });
  if (!intern) return res.status(404).json({ success: false, message: 'Intern not found.' });
  await User.findByIdAndUpdate(intern.user, { isActive: false });
  res.json({ success: true, message: 'Intern deactivated successfully.' });
});

// POST /api/interns/import — bulk CSV import
exports.importInterns = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Please upload a CSV file.' });

  let rows;
  try {
    rows = parseInternCsv(req.file.path);
  } catch (err) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ success: false, message: err.message });
  }
  fs.unlinkSync(req.file.path); // clean up temp file

  const batchId = `BATCH-${uuidv4().slice(0, 8).toUpperCase()}`;
  const results = { created: 0, skipped: 0, errors: [] };

  // Resolve modules by name
  const modules = await Module.find();
  const moduleMap = {};
  modules.forEach((m) => { moduleMap[m.name.toLowerCase()] = m._id; });

  for (const row of rows) {
    try {
      const existingUser = await User.findOne({ email: row.email });
      if (existingUser) { results.skipped++; continue; }

      const user = await User.create({ name: row.name, email: row.email, password: 'Intern@123', role: 'intern' });

      const moduleId = moduleMap[row.moduleName?.toLowerCase()] || null;
      const joining = new Date(row.joiningDate);
      const end = new Date(row.endDate);
      const durationWeeks = Math.round((end - joining) / (7 * 24 * 60 * 60 * 1000));

      await Intern.create({
        user: user._id,
        name: row.name,
        email: row.email,
        phone: row.phone || '',
        college: row.college || '',
        joiningDate: joining,
        endDate: end,
        duration: durationWeeks,
        currentModule: moduleId,
        skillLevel: row.skillLevel || 'beginner',
        importBatch: batchId,
      });

      results.created++;
    } catch (err) {
      results.errors.push(`Row ${row._rowIndex} (${row.email}): ${err.message}`);
    }
  }

  res.status(201).json({
    success: true,
    message: `Import complete. Created: ${results.created}, Skipped (duplicates): ${results.skipped}, Errors: ${results.errors.length}`,
    batchId,
    results,
  });
});

// GET /api/interns/:id/module-history
exports.getModuleHistory = asyncHandler(async (req, res) => {
  const history = await ModuleChangeHistory.find({ intern: req.params.id })
    .populate('previousModule', 'name')
    .populate('newModule', 'name')
    .populate('approvedBy', 'name')
    .sort({ changedAt: -1 });
  res.json({ success: true, data: history });
});
