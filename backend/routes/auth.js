const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authmiddleware');

// Authentication Routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/send-otp', authController.sendOTP);

// Profile Routes
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/update-profile', authenticateToken, authController.updateProfile); // Added this

module.exports = router;