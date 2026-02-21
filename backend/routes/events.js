const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const multer = require('multer');
const path = require('path');

// Import your auth middleware (Adjust path if your file is named differently, e.g., auth.js)
// If you don't have this file yet, you can comment this line out temporarily
const { authenticateToken } = require('../middleware/authmiddleware'); 

// Configure Image Uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Make sure this folder exists in your backend
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// GET /api/events - List events
router.get('/', eventController.getEvents);

// GET /api/events/:id - Get single event details
router.get('/:id', eventController.getEventById);

// POST /api/events - Create event (Protected)
router.post('/', authenticateToken, upload.single('image'), eventController.createEvent);

module.exports = router;