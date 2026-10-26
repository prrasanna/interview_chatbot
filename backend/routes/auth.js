// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/register', requireAuth, authController.register); // admin-only user creation
router.get('/me', requireAuth, authController.getMe);
router.patch('/change-password', requireAuth, authController.changePassword);

module.exports = router;
