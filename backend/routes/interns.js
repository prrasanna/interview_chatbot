// routes/interns.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/internController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { uploadCsv } = require('../middleware/upload');

router.use(requireAuth);

router.get('/', requireRole('admin', 'mentor'), c.getInterns);
router.get('/:id', c.getIntern);
router.post('/', requireRole('admin'), c.createIntern);
router.patch('/:id', requireRole('admin', 'mentor'), c.updateIntern);
router.delete('/:id', requireRole('admin'), c.deactivateIntern);
router.post('/import', requireRole('admin'), uploadCsv, c.importInterns);
router.get('/:id/module-history', requireRole('admin', 'mentor'), c.getModuleHistory);

module.exports = router;
