/**
 * routes/authRoutes.js — Authentication endpoints
 *
 * POST /api/auth/signup         — Create a new account with email + password
 * POST /api/auth/login          — Email + password login
 * POST /api/auth/google         — Google ID-token login / registration
 * GET  /api/auth/me             — Return current user (requires auth cookie)
 * POST /api/auth/logout         — Clear the auth cookie
 */
const express = require('express');
const bcrypt = require('bcrypt');
const { OAuth2Client } = require('google-auth-library');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { signToken, setTokenCookie, clearTokenCookie, authenticate } = require('../auth');

const router = express.Router();
function getGoogleClient() {
  return new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
}

// Rate-limit login and signup to slow down brute-force attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Return a safe user object (no password hash, no internal secrets). */
function safeUser(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role, createdAt: row.created_at };
}

// ─── POST /api/auth/signup ────────────────────────────────────────────────────

router.post(
  '/signup',
  authLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { name, email, password } = req.body;

    try {
      // Check for existing account
      const [existing] = await pool.query('SELECT id, google_id FROM users WHERE email = ?', [email]);
      if (existing.length > 0) {
        const user = existing[0];
        if (user.google_id && !user.password_hash) {
          return res.status(409).json({
            message: 'This email is linked to a Google account. Please sign in with Google.',
          });
        }
        return res.status(409).json({ message: 'An account with this email already exists' });
      }

      // OWASP recommends bcrypt cost factor 12 for new accounts (slows brute force)
      const hash = await bcrypt.hash(password, 12);

      const [result] = await pool.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [name, email, hash, 'user']
      );

      const newUser = { id: result.insertId, name, email, role: 'user' };
      const token = signToken(newUser);
      setTokenCookie(res, token);
      return res.status(201).json({ user: safeUser({ ...newUser, created_at: new Date() }) });
    } catch (err) {
      console.error('[auth/signup]', err);
      return res.status(500).json({ message: 'Signup failed. Please try again.' });
    }
  }
);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    try {
      const [rows] = await pool.query(
        'SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = ?',
        [email]
      );

      if (rows.length === 0) {
        // Use a constant-time response to avoid leaking whether the email exists
        await bcrypt.hash('dummy', 12);
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const user = rows[0];

      if (!user.password_hash) {
        return res.status(401).json({
          message: 'This account uses Google sign-in. Please sign in with Google.',
        });
      }

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const token = signToken(user);
      setTokenCookie(res, token);
      return res.json({ user: safeUser(user) });
    } catch (err) {
      console.error('[auth/login]', err);
      return res.status(500).json({ message: 'Login failed. Please try again.' });
    }
  }
);

// ─── POST /api/auth/google ────────────────────────────────────────────────────

router.post('/google', authLimiter, async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ message: 'Google ID token is required' });

  try {
    // Verify the token with Google's servers. The audience MUST match our client ID.
    const ticket = await getGoogleClient().verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, email_verified } = payload;

    if (!email_verified) {
      return res.status(401).json({ message: 'Google account email is not verified' });
    }

    // Look up by Google ID first, then by email (for account linking)
    const [byGoogle] = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE google_id = ?',
      [googleId]
    );

    if (byGoogle.length > 0) {
      const user = byGoogle[0];
      const token = signToken(user);
      setTokenCookie(res, token);
      return res.json({ user: safeUser(user) });
    }

    // Check for an existing password-based account with the same email
    const [byEmail] = await pool.query(
      'SELECT id, name, email, role, created_at, google_id FROM users WHERE email = ?',
      [email]
    );

    if (byEmail.length > 0) {
      const existing = byEmail[0];
      if (existing.google_id) {
        // Already linked to a different Google account — shouldn't happen but guard anyway
        return res.status(409).json({ message: 'Account conflict. Please contact support.' });
      }
      // Link the Google ID to the existing password account
      await pool.query('UPDATE users SET google_id = ? WHERE id = ?', [googleId, existing.id]);
      const token = signToken(existing);
      setTokenCookie(res, token);
      return res.json({ user: safeUser(existing) });
    }

    // New user — create account
    const [result] = await pool.query(
      'INSERT INTO users (name, email, google_id, role) VALUES (?, ?, ?, ?)',
      [name, email, googleId, 'user']
    );
    const newUser = { id: result.insertId, name, email, role: 'user', created_at: new Date() };
    const token = signToken(newUser);
    setTokenCookie(res, token);
    return res.status(201).json({ user: safeUser(newUser) });
  } catch (err) {
    console.error('[auth/google]', err);
    if (err.message && err.message.includes('Token used too late')) {
      return res.status(401).json({ message: 'Google token expired. Please sign in again.' });
    }
    return res.status(401).json({ message: 'Google sign-in failed. Please try again.' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    return res.json({ user: safeUser(rows[0]) });
  } catch (err) {
    console.error('[auth/me]', err);
    return res.status(500).json({ message: 'Could not fetch user information' });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

router.post('/logout', (_req, res) => {
  clearTokenCookie(res);
  return res.json({ message: 'Logged out successfully' });
});

module.exports = router;
