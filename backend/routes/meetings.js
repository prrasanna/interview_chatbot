// routes/meetings.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/meetingController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', c.getMeetings);
router.get('/:id', c.getMeeting);
router.post('/', requireRole('admin', 'mentor'), c.scheduleMeeting);
router.patch('/:id', requireRole('admin', 'mentor'), c.updateMeeting);

module.exports = router;
