/**
 * index.js — Fundit Express application entry point
 *
 * Loads environment variables, configures middleware, mounts routes,
 * and starts the HTTP server.
 */
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const { testConnection } = require('./db');

// Route modules
const authRoutes = require('./routes/authRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const donationRoutes = require('./routes/donationRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security middleware ────────────────────────────────────────────────────────

// Helmet sets sensible security headers (X-Frame-Options, XSS protection, etc.)
app.use(helmet());

// CORS: allow only configured origins. In production this must be the CloudFront URL.
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((o) => o.trim());
app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (server-to-server, Postman) or matching origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} is not allowed`));
      }
    },
    credentials: true, // Required for HTTP-only cookies to be sent cross-origin
  })
);

// Global rate limit — provides a safety net beyond the per-route auth limiter
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// ─── Body parsing ─────────────────────────────────────────────────────────────

app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));       // Limit JSON body size
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Serve locally stored upload files (active when AWS S3 is not configured)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'fundit-api',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    // Do NOT expose DB credentials, secrets, or internal infrastructure details here
  });
});

// ─── API routes ───────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/admin', adminRoutes);

// ─── 404 handler ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ─── Centralized error handler ────────────────────────────────────────────────
// Must have four parameters for Express to recognize it as an error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // Log the full error internally but return a safe message to the client
  console.error('[error]', err);

  // Handle multer errors (invalid file type, size exceeded)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File is too large. Maximum size is 5 MB.' });
  }
  if (err.message && err.message.startsWith('Only JPEG')) {
    return res.status(400).json({ message: err.message });
  }

  return res.status(500).json({ message: 'An unexpected error occurred' });
});

// ─── Start server ─────────────────────────────────────────────────────────────

async function start() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`[server] Fundit API running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
}

start();

module.exports = app; // Exported for integration tests
