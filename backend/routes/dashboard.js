// routes/dashboard.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/dashboardController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);
router.get('/admin', requireRole('admin'), c.getAdminDashboard);
router.get('/intern', requireRole('intern'), c.getInternDashboard);
router.get('/mentor', requireRole('mentor'), c.getMentorDashboard);

module.exports = router;
