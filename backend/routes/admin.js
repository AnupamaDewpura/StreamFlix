// This file handles all admin panel actions (adding, editing, deleting)
const express = require('express');
const { getDb } = require('../database');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// Every route in this file requires you to be logged in
router.use(requireAuth);

// ==================== STREAMS ====================

// Get all streams (admin sees even offline ones)
router.get('/streams', (req, res) => {
  const db = getDb();
  const streams = db.prepare(`
    SELECT s.*, c.name as category_name
    FROM streams s LEFT JOIN categories c ON s.category_id = c.id
    ORDER BY s.sort_order
  `).all();
  res.json(streams);
});

// Add a new stream
router.post('/streams', (req, res) => {
  const { title, description, thumbnail_url, stream_url, source_website,
          category_id, is_live, is_featured, sort_order } = req.body;
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO streams (title, description, thumbnail_url, stream_url,
    source_website, category_id, is_live, is_featured, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description, thumbnail_url, stream_url, source_website,
         category_id, is_live ?? 1, is_featured ?? 0, sort_order ?? 0);
  res.json({ id: result.lastInsertRowid, message: 'Stream added!' });
});

// Update an existing stream
router.put('/streams/:id', (req, res) => {
  const { title, description, thumbnail_url, stream_url, source_website,
          category_id, is_live, is_featured, sort_order } = req.body;
  const db = getDb();
  db.prepare(`
    UPDATE streams SET title=?, description=?, thumbnail_url=?, stream_url=?,
    source_website=?, category_id=?, is_live=?, is_featured=?, sort_order=?
    WHERE id=?
  `).run(title, description, thumbnail_url, stream_url, source_website,
         category_id, is_live, is_featured, sort_order, req.params.id);
  res.json({ message: 'Stream updated!' });
});

// Delete a stream
router.delete('/streams/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM streams WHERE id = ?').run(req.params.id);
  res.json({ message: 'Stream deleted!' });
});

// ==================== CATEGORIES ====================

router.get('/categories', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM categories ORDER BY sort_order').all());
});

router.post('/categories', (req, res) => {
  const { name, sort_order } = req.body;
  const db = getDb();
  const result = db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)')
    .run(name, sort_order ?? 0);
  res.json({ id: result.lastInsertRowid });
});

router.put('/categories/:id', (req, res) => {
  const { name, sort_order } = req.body;
  const db = getDb();
  db.prepare('UPDATE categories SET name=?, sort_order=? WHERE id=?')
    .run(name, sort_order, req.params.id);
  res.json({ message: 'Category updated!' });
});

router.delete('/categories/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ message: 'Category deleted!' });
});

// ==================== SOURCE SITES ====================

router.get('/sources', (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM source_sites ORDER BY name').all());
});

router.post('/sources', (req, res) => {
  const { name, base_url, channels_path, channel_selector, description } = req.body;
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO source_sites (name, base_url, channels_path, channel_selector, description) VALUES (?, ?, ?, ?, ?)'
  ).run(name, base_url, channels_path || '/24-7-channels.php', channel_selector || 'a[href*="stream"]', description);
  res.json({ id: result.lastInsertRowid });
});

router.put('/sources/:id', (req, res) => {
  const { name, base_url, channels_path, channel_selector, description, is_active } = req.body;
  const db = getDb();
  db.prepare(
    'UPDATE source_sites SET name=?, base_url=?, channels_path=?, channel_selector=?, description=?, is_active=? WHERE id=?'
  ).run(name, base_url, channels_path, channel_selector, description, is_active, req.params.id);
  res.json({ message: 'Source updated!' });
});

router.delete('/sources/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM source_sites WHERE id = ?').run(req.params.id);
  res.json({ message: 'Source deleted!' });
});

// ==================== MIRRORS ====================

// Get all mirrors for a stream
router.get('/streams/:id/mirrors', (req, res) => {
  const db = getDb();
  const mirrors = db.prepare(
    'SELECT * FROM stream_mirrors WHERE stream_id = ? ORDER BY sort_order'
  ).all(req.params.id);
  res.json(mirrors);
});

// Add a mirror to a stream
router.post('/streams/:id/mirrors', (req, res) => {
  const { label, url, sort_order } = req.body;
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO stream_mirrors (stream_id, label, url, sort_order) VALUES (?, ?, ?, ?)'
  ).run(req.params.id, label, url, sort_order ?? 0);
  res.json({ id: result.lastInsertRowid, message: 'Mirror added!' });
});

// Update a mirror
router.put('/mirrors/:id', (req, res) => {
  const { label, url, sort_order } = req.body;
  const db = getDb();
  db.prepare(
    'UPDATE stream_mirrors SET label=?, url=?, sort_order=? WHERE id=?'
  ).run(label, url, sort_order, req.params.id);
  res.json({ message: 'Mirror updated!' });
});

// Delete a mirror
router.delete('/mirrors/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM stream_mirrors WHERE id = ?').run(req.params.id);
  res.json({ message: 'Mirror deleted!' });
});

const { syncAllSites, syncSiteById } = require('../scraper');

// Sync all active source sites
router.post('/sync-all', async (req, res) => {
  res.json({ message: 'Sync started for all sites' });
  syncAllSites();
});

// Sync a single source site
router.post('/sync-site/:id', async (req, res) => {
  res.json({ message: 'Sync started for site ' + req.params.id });
  syncSiteById(req.params.id);
});

module.exports = router;