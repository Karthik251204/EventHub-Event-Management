const path = require('path');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory:', uploadsDir);
}

// Import routes
const { router: authRouter } = require('./routes/auth');
const eventsRouter = require('./routes/events');
const bookingsRouter = require('./routes/bookings');
const paymentsRouter = require('./routes/payments');

// CORS configuration - allow frontend from port 8080
const corsOptions = {
  origin: [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:8001',
    'http://127.0.0.1:8001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== IMPORTANT =====
// Backend (port 3000) is API-ONLY
// All frontend pages are served from port 8001 (Live Server)
// This backend does NOT serve HTML pages

// ===== API ROUTES =====

// Authentication routes
app.use('/api/auth', authRouter);

// Events routes
app.use('/api/events', eventsRouter);

// Bookings routes
app.use('/api/bookings', bookingsRouter);

// Payments routes
app.use('/api/payments', paymentsRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`✅ Backend API Server running at http://localhost:${PORT}`);
  console.log(`🌐 Frontend should run at http://localhost:8080`);
  console.log(`📚 API Endpoints:`);
  console.log(`   POST /api/auth/signup - Register new user`);
  console.log(`   POST /api/auth/login - Login user`);
  console.log(`   GET  /api/auth/profile - Get user profile`);
  console.log(`   GET  /api/events - List all events`);
  console.log(`   POST /api/events - Create event`);
  console.log(`   POST /api/bookings - Create booking`);
  console.log(`   GET  /api/bookings - Get user bookings`);
});


