// This file handles admin login
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database');

const router = express.Router();

// When someone tries to log in to the admin panel
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Check they sent both username and password
  if (!username || !password) {
    return res.status(400).json({ error: 'Please enter username and password' });
  }

  // Look up the admin in the database
  const db = getDb();
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);

  // Check if username exists and password matches
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Wrong username or password' });
  }

  // Create a token (like a temporary key card) that expires in 24 hours
  const token = jwt.sign(
    { id: admin.id, username: admin.username },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '24h' }
  );

  res.json({ token, username: admin.username });
});

module.exports = router;