// This checks if someone has a valid admin token before letting them in
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  // Look for the token in the request header
  const authHeader = req.headers.authorization;

  // No token = not allowed in
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'You need to be logged in to do this' });
  }

  const token = authHeader.split(' ')[1];

  // Verify the token is real and not expired
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    req.admin = decoded;
    next(); // Token is valid, let them through
  } catch (err) {
    return res.status(401).json({ error: 'Your session expired. Please log in again.' });
  }
}

module.exports = { requireAuth };