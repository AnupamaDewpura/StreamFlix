const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'streamflix.db');
let db;

function getDb() {
  if (!db) db = new Database(DB_PATH);
  return db;
}

function initializeDatabase() {
  const db = getDb();

  // Create the categories table (like folders for your streams)
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    )
  `);

  // Create the streams table (your list of channels)
  db.exec(`
    CREATE TABLE IF NOT EXISTS streams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      thumbnail_url TEXT,
      stream_url TEXT NOT NULL,
      source_website TEXT,
      category_id INTEGER,
      is_live INTEGER DEFAULT 1,
      is_featured INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    )
  `);

  // Mirror sources for each stream (multiple URLs per channel)
  db.exec(`
    CREATE TABLE IF NOT EXISTS stream_mirrors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stream_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      url TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE CASCADE
    )
  `);

  // Create the admins table (who can log in to the admin panel)
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    )
  `);

  // Create the source_sites table (your list of streaming websites)
  db.exec(`
    CREATE TABLE IF NOT EXISTS source_sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      base_url TEXT NOT NULL,
      channels_path TEXT DEFAULT '/24-7-channels.php',
      channel_selector TEXT DEFAULT 'a[href*="stream"]',
      description TEXT,
      is_active INTEGER DEFAULT 1,
      last_synced DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create a default admin account if none exists
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get();
  if (adminCount.count === 0) {
    const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = bcrypt.hashSync(defaultPassword, 10);
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)')
      .run('admin', hash);
    console.log('==============================================');
    console.log('Admin account created!');
    console.log('Username: admin');
    console.log('Password: ' + defaultPassword);
    console.log('==============================================');
  }

  // Add sample data if the database is empty
  const streamCount = db.prepare('SELECT COUNT(*) as count FROM streams').get();
  if (streamCount.count === 0) {
    seedSampleData(db);
  }

  console.log('Database ready!');
}

function seedSampleData(db) {
  // Add sample categories
  db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)').run('Sports', 1);
  db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)').run('News', 2);
  db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)').run('Entertainment', 3);

  // Add sample streams (replace these URLs with real ones later)
  db.prepare(`
    INSERT INTO streams (title, description, thumbnail_url, stream_url, source_website, category_id, is_featured)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'Sample Channel 1',
    'This is a sample stream. Replace the URL in the admin panel.',
    'https://picsum.photos/seed/ch1/400/225',
    'https://example.com/stream1',
    'example.com',
    1, 1
  );

  db.prepare(`
    INSERT INTO streams (title, description, thumbnail_url, stream_url, source_website, category_id, is_featured)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'Sample Channel 2',
    'Another sample stream.',
    'https://picsum.photos/seed/ch2/400/225',
    'https://example.com/stream2',
    'example.com',
    2, 0
  );
}

module.exports = { getDb, initializeDatabase };