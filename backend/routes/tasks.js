// routes/tasks.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/taskController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

// Templates
router.get('/templates', c.getTemplates);
router.post('/templates', requireRole('admin', 'mentor'), c.createTemplate);
router.patch('/templates/:id', requireRole('admin', 'mentor'), c.updateTemplate);
router.delete('/templates/:id', requireRole('admin'), c.deleteTemplate);

// Assignments
router.get('/assignments', c.getAssignments);
router.get('/assignments/:id', c.getAssignment);
router.post('/assignments', requireRole('admin', 'mentor'), c.assignTask);
router.patch('/assignments/:id/status', requireRole('admin', 'mentor'), c.updateAssignmentStatus);
router.get('/assignments/:id/explanation', c.getTaskExplanation);

// AI recommendations
router.post('/assignments/recommend', requireRole('admin', 'mentor'), c.recommendTasks);

module.exports = router;
