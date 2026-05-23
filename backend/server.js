// Load our secret settings from the .env file
require('dotenv').config();

const cron = require('node-cron');
const { syncAllSites } = require('./scraper');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Import our route files (we'll create these next)
const streamsRouter = require('./routes/streams');
const adminRouter = require('./routes/admin');
const authRouter = require('./routes/auth');
const { initializeDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// Set up the database when server starts
initializeDatabase();

cron.schedule('*/45 * * * *', () => {
  console.log('Running scheduled stream sync...');
  syncAllSites();
});

setTimeout(() => {
  syncAllSites();
}, 10000);

// Security and utility middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(morgan('dev'));

// Connect our routes
app.use('/api/streams', streamsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/auth', authRouter);

// Simple check to see if server is running
app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'StreamFlix is running!' }));

// Serve the built frontend files
const frontendPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendPath));

// For any non-API route, send the React app
// This makes page refreshes and direct URL visits work
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

const { createProxyMiddleware } = require('http-proxy-middleware');

app.use('/proxy/stream', (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: 'Missing url parameter' });

  try {
    const parsed = new URL(targetUrl);

    const proxy = createProxyMiddleware({
      target: parsed.origin,
      changeOrigin: true,
      selfHandleResponse: false,
      pathRewrite: () => parsed.pathname + parsed.search,
      on: {
        proxyReq: (proxyReq) => {
          // Pretend to be a regular browser so the stream site doesn't block us
          proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
          proxyReq.setHeader('Referer', parsed.origin);
          proxyReq.setHeader('Origin', parsed.origin);
        },
        proxyRes: (proxyRes) => {
          // Allow the browser to receive this
          proxyRes.headers['access-control-allow-origin'] = '*';
        },
        error: (err, req, res) => {
          res.status(500).json({ error: 'Proxy failed', detail: err.message });
        }
      }
    });

    proxy(req, res, () => {});
  } catch (e) {
    res.status(400).json({ error: 'Invalid URL' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log('');
  console.log('StreamFlix backend is running!');
  console.log('Open http://localhost:' + PORT + '/api/health to confirm');
  console.log('');
});