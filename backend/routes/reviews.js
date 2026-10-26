// routes/reviews.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/reviewController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', c.getReviews);
router.get('/intern/:internId/latest', c.getLatestReview);
router.get('/:id', c.getReview);
router.post('/', requireRole('admin', 'mentor'), c.createReview);
router.patch('/:id', requireRole('admin', 'mentor'), c.updateReview);
router.post('/:id/share', requireRole('admin', 'mentor'), c.shareReview);

module.exports = router;
