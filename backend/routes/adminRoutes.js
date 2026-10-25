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

const { buildImageUrl } = require('../upload');

// ─── GET /api/admin/campaigns ─────────────────────────────────────────────────

router.get('/campaigns', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, u.name AS owner_name, u.email AS owner_email, u.phone AS owner_phone
       FROM campaigns c
       JOIN users u ON c.owner_id = u.id
       WHERE c.status != 'deleted'
       ORDER BY
         CASE c.status
           WHEN 'pending' THEN 1
           WHEN 'review' THEN 2
           WHEN 'active' THEN 3
           ELSE 4
         END,
         c.created_at DESC`
    );

    const formatted = rows.map((c) => {
      let proofDocs = [];
      if (c.proof_documents) {
        try {
          const parsed = typeof c.proof_documents === 'string' ? JSON.parse(c.proof_documents) : c.proof_documents;
          if (Array.isArray(parsed)) {
            proofDocs = parsed.map((key) => ({
              key,
              url: buildImageUrl(key),
              isPdf: key.toLowerCase().endsWith('.pdf'),
            }));
          }
        } catch (e) {
          console.warn('[admin/proof-parse]', e.message);
        }
      }

      return {
        id: c.id,
        title: c.title,
        category: c.category,
        description: c.description,
        status: c.status,
        raisedAmount: c.raised_amount,
        targetAmount: c.target_amount,
        createdAt: c.created_at,
        deadline: c.deadline,
        imageUrl: buildImageUrl(c.image_key),
        govIdType: c.gov_id_type,
        govIdNumber: c.gov_id_number,
        phone: c.phone || c.owner_phone,
        address: c.address,
        proofDocuments: proofDocs,
        adminRemarks: c.admin_remarks,
        owner: {
          id: c.owner_id,
          name: c.owner_name,
          email: c.owner_email,
        },
      };
    });

    return res.json({ campaigns: formatted });
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
    body('action').isIn(['approve', 'review', 'reject', 'close', 'delete']).withMessage("Action must be 'approve', 'review', 'reject', 'close', or 'delete'"),
    body('reason').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const { action } = req.body;
    const reason = (req.body.reason && req.body.reason.trim()) || `Administrative ${action} action`;
    const campaignId = req.params.id;

    try {
      const [rows] = await pool.query("SELECT id, title, status FROM campaigns WHERE id = ?", [campaignId]);
      if (rows.length === 0) return res.status(404).json({ message: 'Campaign not found' });

      let newStatus = 'active';
      if (action === 'approve') newStatus = 'active';
      else if (action === 'review') newStatus = 'review';
      else if (action === 'reject') newStatus = 'rejected';
      else if (action === 'close') newStatus = 'closed';
      else if (action === 'delete') newStatus = 'deleted';

      await pool.query(
        'UPDATE campaigns SET status = ?, admin_remarks = ? WHERE id = ?',
        [newStatus, reason, campaignId]
      );

      // Log the moderation action
      await pool.query(
        'INSERT INTO moderation_logs (admin_id, campaign_id, action, reason) VALUES (?, ?, ?, ?)',
        [req.user.id, campaignId, action, reason]
      );

      return res.json({
        message: `Campaign status updated to ${newStatus}.`,
        status: newStatus,
      });
    } catch (err) {
      console.error('[admin/moderate]', err);
      return res.status(500).json({ message: 'Moderation action failed' });
    }
  }
);

module.exports = router;
