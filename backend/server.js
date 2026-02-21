const path = require('path');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./Swagger");
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. PRE-REQUISITE SETUP
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory:', uploadsDir);
}

// 2. GLOBAL MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 3. DATABASE INITIALIZATION FUNCTION
async function initializeDatabase() {
  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    console.error('❌ Unable to connect to PostgreSQL:', err.message || err);
    return false;
  }

  try {
    console.log('📊 Initializing database schema...');
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        mobile VARCHAR(10) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) CHECK (role IN ('organizer', 'explorer')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        organizer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(50),
        location VARCHAR(255),
        event_date TIMESTAMP,
        ticket_price DECIMAL(10,2),
        total_seats INTEGER,
        available_seats INTEGER,
        image_url VARCHAR(255),
        images TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // --- SCHEMA MIGRATION: Ensure columns exist if table was created by older version ---
    await client.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS ticket_price DECIMAL(10,2)`);
    await client.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS available_seats INTEGER`);
    await client.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url VARCHAR(255)`);
    await client.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS images TEXT[]`);
    
    // Create bookings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
        seats_booked INTEGER,
        total_price DECIMAL(10,2),
        booking_status VARCHAR(20) DEFAULT 'confirmed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create payments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
        amount DECIMAL(10,2),
        payment_method VARCHAR(50),
        payment_status VARCHAR(20),
        transaction_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create check_ins table
    await client.query(`
      CREATE TABLE IF NOT EXISTS check_ins (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
        checked_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Database initialization complete!');
    return true;
  } catch (error) {
    if (error.code !== '42P07') {
      console.error('⚠️ Database initialization warning:', error.message || error);
    } else {
      console.log('✅ Database tables already exist');
    }
    return true;
  } finally {
    if (client) client.release();
  }
}

// 4. SERVER STARTUP & ROUTE MOUNTING
const startServer = async () => {
  const dbReady = await initializeDatabase();

  // Mount Routes based on DB availability
  if (dbReady) {
    try {
      // Import routers
      const authRouter = require('./routes/auth');
      const eventsRouter = require('./routes/events');
      const bookingsRouter = require('./routes/bookings');
      const paymentsRouter = require('./routes/payments');

      // Mount routers to specific paths
      // This enables /api/auth/signup, /api/auth/profile, /api/auth/update-profile etc.
      app.use('/api/auth', authRouter);
      app.use('/api/events', eventsRouter);
      app.use('/api/bookings', bookingsRouter);
      app.use('/api/payments', paymentsRouter);
      
      console.log('✅ Mounted real API routes (PostgreSQL)');
    } catch (err) {
      console.error('❌ Failed to mount real routes:', err.message);
    }
  } else {
    try {
      const devAuth = require('./routes/devAuth');
      app.use('/api/auth', devAuth);
      console.log('⚠️ PostgreSQL unavailable — mounted development auth routes');
    } catch (err) {
      console.error('❌ Failed to mount development auth router:', err.message);
    }
  }

  // Swagger Documentation Route
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // 5. ERROR HANDLING MIDDLEWARE (Must be after routes)
  app.use((err, req, res, next) => {
    console.error('🔥 Error:', err.stack || err);
    res.status(500).json({ 
      error: 'Internal server error',
      message: err.message 
    });
  });

  // Start Listening
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`👤 Profile Endpoint: http://localhost:${PORT}/api/auth/profile`);
    console.log(`pencil Update Endpoint: http://localhost:${PORT}/api/auth/update-profile`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`⚠️ Port ${PORT} is already in use.`);
      process.exit(1);
    }
    console.error('Server error:', err);
  });
};

startServer();