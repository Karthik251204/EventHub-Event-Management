const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  // Look for token in Authorization header (Bearer <token>)
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract token

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    // Verify token
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.user = verified; // Attach user info from token to request
    next(); // Allow request to continue
  } catch (err) {
    console.error('JWT verification failed:', err.message);
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = { authenticateToken };
