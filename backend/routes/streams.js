const express = require('express');
const { getDb } = require('../database');
const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();

  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
  const streams = db.prepare(`
    SELECT s.*, c.name as category_name
    FROM streams s
    LEFT JOIN categories c ON s.category_id = c.id
    WHERE s.is_live = 1
    ORDER BY s.sort_order
  `).all();

  // Attach mirrors to each stream
  const mirrors = db.prepare('SELECT * FROM stream_mirrors ORDER BY sort_order').all();
  const streamsWithMirrors = streams.map(s => ({
    ...s,
    mirrors: mirrors.filter(m => m.stream_id === s.id)
  }));

  const featured = streamsWithMirrors.filter(s => s.is_featured);
  const grouped = categories.map(cat => ({
    ...cat,
    streams: streamsWithMirrors.filter(s => s.category_id === cat.id)
  })).filter(cat => cat.streams.length > 0);

  res.json({ featured, categories: grouped });
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const stream = db.prepare('SELECT * FROM streams WHERE id = ?').get(req.params.id);
  if (!stream) return res.status(404).json({ error: 'Stream not found' });
  const mirrors = db.prepare('SELECT * FROM stream_mirrors WHERE stream_id = ? ORDER BY sort_order').all(req.params.id);
  res.json({ ...stream, mirrors });
});

module.exports = router;