// routes/mentors.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/mentorController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', c.getMentors);
router.get('/:id', c.getMentor);
router.post('/', requireRole('admin'), c.createMentor);
router.patch('/:id', requireRole('admin'), c.updateMentor);

module.exports = router;
