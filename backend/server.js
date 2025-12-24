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

// CORS configuration - allow frontend from port 8001
const corsOptions = {
  origin: [
    'http://localhost:8001',
    'http://localhost:8080',
    'http://127.0.0.1:8001',
    'http://127.0.0.1:8080'
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
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📚 API Documentation:`);
  console.log(`   POST /api/auth/signup - Register new user`);
  console.log(`   POST /api/auth/login - Login user`);
  console.log(`   GET  /api/auth/profile - Get user profile (protected)`);
  console.log(`   POST /api/auth/send-otp - Send OTP to mobile`);
  console.log(`   GET  /api/events - List all events`);
  console.log(`   POST /api/events - Create event (organizer)`);
  console.log(`   GET  /api/events/:id - Get event details`);
  console.log(`   PUT  /api/events/:id - Update event (organizer)`);
  console.log(`   DELETE /api/events/:id - Delete event (organizer)`);
  console.log(`   POST /api/bookings - Create booking`);
  console.log(`   GET  /api/bookings - Get user bookings`);
  console.log(`   GET  /api/bookings/:id - Get booking details`);
  console.log(`   PUT  /api/bookings/:id/cancel - Cancel booking`);
  console.log(`   POST /api/bookings/:id/checkin - Check in to event`);
  console.log(`   GET  /api/bookings/:id/checkins - Get check-ins for booking`);
  console.log(`   POST /api/payments - Record payment`);
  console.log(`   GET  /api/payments - Get payment history`);
  console.log(`   POST /api/payments/organizer/details - Set organizer bank details`);
  console.log(`   GET  /api/payments/organizer/details - Get organizer bank details`);
});


