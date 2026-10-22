/**
 * routes/adminRoutes.js — Admin-only platform management
 *
 * All routes require authentication AND the 'admin' role.
 * Role is checked from the JWT payload — the frontend cannot override it.
 *
 * GET  /api/admin/users                        — List registered users
 * GET  /api/admin/campaigns                    — List all campaigns (including closed)
 * POST /api/admin/campaigns/:id/moderate       — Moderate a campaign (close / delete)
 */
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { pool } = require('../db');
const { authenticate, requireRole } = require('../auth');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireRole('admin'));

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

router.get('/users', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    return res.json({ users: rows });
  } catch (err) {
    console.error('[admin/users]', err);
    return res.status(500).json({ message: 'Could not load users' });
  }
});

// ─── GET /api/admin/campaigns ─────────────────────────────────────────────────

router.get('/campaigns', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.title, c.category, c.status, c.raised_amount, c.target_amount,
              c.created_at, c.deadline, u.name AS owner_name, u.email AS owner_email
       FROM campaigns c
       JOIN users u ON c.owner_id = u.id
       WHERE c.status != 'deleted'
       ORDER BY c.created_at DESC`
    );
    return res.json({ campaigns: rows });
  } catch (err) {
    console.error('[admin/campaigns]', err);
    return res.status(500).json({ message: 'Could not load campaigns' });
  }
});

// ─── POST /api/admin/campaigns/:id/moderate ───────────────────────────────────

router.post(
  '/campaigns/:id/moderate',
  [
    param('id').isInt({ min: 1 }).toInt(),
    body('action').isIn(['close', 'delete']).withMessage("Action must be 'close' or 'delete'"),
    body('reason').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const { action } = req.body;
    const reason = (req.body.reason && req.body.reason.trim()) || `Administrative ${action} action`;
    const campaignId = req.params.id;

    try {
      const [rows] = await pool.query("SELECT id, status FROM campaigns WHERE id = ?", [campaignId]);
      if (rows.length === 0) return res.status(404).json({ message: 'Campaign not found' });

      // Map action to the new database status
      const newStatus = action === 'delete' ? 'deleted' : 'closed';

      await pool.query('UPDATE campaigns SET status = ? WHERE id = ?', [newStatus, campaignId]);

      // Log the moderation action
      await pool.query(
        'INSERT INTO moderation_logs (admin_id, campaign_id, action, reason) VALUES (?, ?, ?, ?)',
        [req.user.id, campaignId, action, reason]
      );

      return res.json({ message: `Campaign ${action}d successfully` });
    } catch (err) {
      console.error('[admin/moderate]', err);
      return res.status(500).json({ message: 'Moderation action failed' });
    }
  }
);

module.exports = router;
