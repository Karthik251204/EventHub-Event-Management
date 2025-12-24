const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

// Helper: Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// Helper: Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// SIGNUP - Register new user
router.post('/signup', async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, mobile, role, email, password } = req.body;

    // Validation
    if (!name || !mobile || !role || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (mobile.length !== 10) {
      return res.status(400).json({ error: 'Invalid mobile number' });
    }

    if (!['organizer', 'explorer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user exists
    const checkUser = await client.query(
      'SELECT id FROM users WHERE mobile = $1 OR email = $2',
      [mobile, email || null]
    );

    if (checkUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user
    const result = await client.query(
      `INSERT INTO users (name, mobile, role, email, password_hash) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, name, mobile, role, email`,
      [name, mobile, role, email || null, passwordHash]
    );

    const user = result.rows[0];
    const token = generateToken(user.id, user.role);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        role: user.role,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  } finally {
    client.release();
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await client.query(
      'SELECT id, name, mobile, role, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.role);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        role: user.role,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  } finally {
    client.release();
  }
});

// GET PROFILE (protected)
router.get('/profile', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id, name, mobile, role, email, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  } finally {
    client.release();
  }
});

// UPDATE PROFILE (protected)
router.put('/profile', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, email, password, mobile } = req.body;
    const userId = req.user.userId;

    let passwordHash;
    if (password) {
      const saltRounds = 10;
      passwordHash = await bcrypt.hash(password, saltRounds);
    }

    const result = await client.query(
      `UPDATE users 
       SET 
         name = COALESCE($1, name), 
         email = COALESCE($2, email), 
         password_hash = COALESCE($3, password_hash),
         mobile = COALESCE($4, mobile)
       WHERE id = $5 
       RETURNING id, name, mobile, role, email`,
      [name, email, passwordHash, mobile, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  } finally {
    client.release();
  }
});

module.exports = { router, verifyToken };
