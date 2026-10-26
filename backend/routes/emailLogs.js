// routes/emailLogs.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/emailLogController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth, requireRole('admin'));
router.get('/', c.getEmailLogs);
router.get('/:id', c.getEmailLog);

module.exports = router;
