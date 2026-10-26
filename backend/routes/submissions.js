// routes/submissions.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/submissionController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { uploadSubmission } = require('../middleware/upload');

router.use(requireAuth);
router.get('/', c.getSubmissions);
router.get('/:id', c.getSubmission);
router.post('/', requireRole('intern'), uploadSubmission, c.createSubmission);

module.exports = router;
