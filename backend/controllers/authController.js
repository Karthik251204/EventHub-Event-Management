const pool = require('../db');
const bcrypt = require('bcryptjs'); // Changed from 'bcrypt' to 'bcryptjs'
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

// 1. Signup Logic
exports.signup = async (req, res) => {
  const { name, mobile, email, password, role } = req.body;
  
  console.log('\n📝 === SIGNUP REQUEST ===');
  console.log('User data received:', {
    name,
    mobile,
    email,
    role,
    password_length: password?.length
  });

  try {
    // Check if user exists
    console.log('🔍 Checking if user already exists...');
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR mobile = $2',
      [email, mobile]
    );

    if (existingUser.rows.length > 0) {
      console.error('❌ Signup failed: user already exists with email or mobile', { email, mobile });
      return res.status(409).json({ message: "User already exists with this email or mobile number" });
    }

    console.log('✅ User does not exist, proceeding with registration...');
    
    console.log('🔐 Hashing password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('✅ Password hashed successfully');

    console.log('💾 Inserting user into database...');
    const newUser = await pool.query(
      'INSERT INTO users (name, mobile, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, mobile, role',
      [name, mobile, email, hashedPassword, role || 'explorer']
    );

    if (!newUser.rows[0]) {
      console.error('❌ Signup failed: no user returned from INSERT');
      return res.status(500).json({ message: 'Signup failed. Please try again.' });
    }

    const userData = newUser.rows[0];
    console.log('✅ User inserted successfully:', userData);

    console.log('🎟️ Generating JWT token...');
    const token = jwt.sign({ id: userData.id, role: userData.role }, JWT_SECRET, { expiresIn: '7d' });
    console.log('✅ Token generated successfully');

    console.log('\n✅ === SIGNUP SUCCESSFUL ===');
    console.log('User:', userData);
    console.log('Timestamp:', new Date().toISOString());
    console.log('================\n');

    res.status(201).json({ 
      message: "User registered successfully",
      token,
      user: userData
    });

  } catch (err) {
    console.error('❌ SIGNUP ERROR:', err.message);
    console.error("Stack:", err.stack);
    res.status(500).json({ message: "Signup failed" });
  }
};


// 2. Login Logic
exports.login = async (req, res) => {
  const { email, password } = req.body;
  
  console.log('\n🔐 === LOGIN REQUEST ===');
  console.log('📧 Email:', email);
  console.log('🔑 Password length:', password?.length);

  try {
    console.log('🔍 Querying database for user by email...');
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    console.log('📊 Database query result:', result.rows.length, 'user(s) found');
    
    if (result.rows.length === 0) {
      console.error('❌ Login failed: user not found for email', { email });
      return res.status(400).json({ message: "User not found" });
    }

    const user = result.rows[0];
    console.log('👤 User found in database:', {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role
    });

    console.log('🔐 Comparing password hashes...');
    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log('✓ Password verification:', isMatch ? 'MATCH ✅' : 'NO MATCH ❌');
    
    if (!isMatch) {
      console.error('❌ Login failed: incorrect password for user', { id: user.id, email: user.email });
      return res.status(400).json({ message: "Invalid credentials" });
    }

    console.log('🎟️ Generating JWT token...');
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    console.log('✅ Token generated successfully');
    console.log('⏱️ Token expiry: 7 days');

    console.log('\n✅ === LOGIN SUCCESSFUL ===');
    console.log('User:', {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mobile: user.mobile
    });
    console.log('Timestamp:', new Date().toISOString());
    console.log('================\n');

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email,
        mobile: user.mobile,
        role: user.role 
      } 
    });
  } catch (err) {
    console.error('❌ LOGIN ERROR:', err.message);
    res.status(500).json({ message: "Login error" });
  }
};

// 3. Get Profile Logic
exports.getProfile = async (req, res) => {
  try {
    const user = await pool.query(
      'SELECT name, mobile, email, role FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (user.rows.length === 0) return res.status(404).json({ message: "User not found" });

    const data = user.rows[0];
    res.json({
      username: data.name, 
      mobile: data.mobile,
      email: data.email,
      role: data.role
    });
  } catch (err) {
    console.error("Profile Fetch Error:", err.message);
    res.status(500).json({ message: "Error fetching profile" });
  }
};

// 4. Update Profile Logic
exports.updateProfile = async (req, res) => {
  const { mobile, email } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET mobile = $1, email = $2 WHERE id = $3 RETURNING name, mobile, email',
      [mobile, email, req.user.id]
    );
    res.json({ message: "Profile updated successfully", user: result.rows[0] });
  } catch (err) {
    console.error("Update Error:", err.message);
    res.status(500).json({ message: "Update failed" });
  }
};

// 5. Send OTP (Placeholder)
exports.sendOTP = async (req, res) => {
  res.json({ message: "OTP sent successfully (Mock)" });
};

