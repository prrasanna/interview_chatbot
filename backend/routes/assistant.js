// routes/assistant.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/assistantController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);
router.post('/chat', requireRole('intern'), c.chat);
router.post('/explain-task/:taskId', requireRole('intern'), c.explainTask);
router.post('/explain-feedback/:reviewId', requireRole('intern'), c.explainFeedback);

module.exports = router;
