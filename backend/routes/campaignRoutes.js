/**
 * routes/campaignRoutes.js — Campaign CRUD and listing
 *
 * GET    /api/campaigns            — Public list with search, filter, sort, pagination
 * GET    /api/campaigns/:id        — Public campaign detail
 * POST   /api/campaigns            — Create campaign (authenticated)
 * PATCH  /api/campaigns/:id        — Update campaign (owner only)
 * POST   /api/campaigns/:id/close  — Close campaign (owner or admin)
 */
const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { pool } = require('../db');
const { authenticate, optionalAuth, requireRole } = require('../auth');
const { imageUpload, buildImageUrl } = require('../upload');
const { CATEGORY_IDS } = require('../categories');

const router = express.Router();

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Build a campaign response object, computing derived fields. */
function formatCampaign(row) {
  const raised = parseFloat(row.raised_amount) || 0;
  const target = parseFloat(row.target_amount) || 1;
  const progressPct = Math.min(Math.round((raised / target) * 100), 100);
  const isExpired = row.deadline ? new Date(row.deadline) < new Date() : false;

  return {
    id: row.id,
    title: row.title,
    category: row.category,
    description: row.description,
    targetAmount: row.target_amount,
    raisedAmount: row.raised_amount,
    progressPercent: progressPct,
    imageUrl: buildImageUrl(row.image_key),
    deadline: row.deadline,
    status: isExpired && row.status === 'active' ? 'expired' : row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    owner: {
      id: row.owner_id,
      name: row.owner_name,
    },
  };
}

// ─── GET /api/campaigns ───────────────────────────────────────────────────────

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('category').optional().isIn(CATEGORY_IDS),
    query('search').optional().trim().isLength({ max: 200 }),
    query('sort').optional().isIn(['newest', 'most_raised', 'ending_soon']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const page = req.query.page || 1;
    const limit = req.query.limit || 12;
    const offset = (page - 1) * limit;
    const { category, search, sort } = req.query;

    // Build WHERE conditions dynamically with parameterized placeholders
    const conditions = ["c.status != 'deleted'"];
    const params = [];

    if (category) {
      conditions.push('c.category = ?');
      params.push(category);
    }
    if (search) {
      conditions.push('(c.title LIKE ? OR c.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    let orderBy = 'ORDER BY c.created_at DESC'; // default: newest
    if (sort === 'most_raised') orderBy = 'ORDER BY c.raised_amount DESC';
    if (sort === 'ending_soon') orderBy = 'ORDER BY c.deadline ASC';

    try {
      // Count total matching rows for pagination metadata
      const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM campaigns c ${where}`,
        params
      );
      const total = countRows[0].total;

      // Fetch the page
      const [rows] = await pool.query(
        `SELECT c.*, u.name AS owner_name
         FROM campaigns c
         JOIN users u ON c.owner_id = u.id
         ${where}
         ${orderBy}
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return res.json({
        campaigns: rows.map(formatCampaign),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error('[campaigns/list]', err);
      return res.status(500).json({ message: 'Could not load campaigns' });
    }
  }
);

// ─── GET /api/campaigns/:id ───────────────────────────────────────────────────

router.get('/:id', [param('id').isInt({ min: 1 }).toInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid campaign ID' });

  try {
    const [rows] = await pool.query(
      `SELECT c.*, u.name AS owner_name
       FROM campaigns c
       JOIN users u ON c.owner_id = u.id
       WHERE c.id = ? AND c.status != 'deleted'`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Campaign not found' });

    // Load recent donors (public view — no email, no anonymous identity)
    const [donors] = await pool.query(
      `SELECT
         IF(d.is_anonymous = 1, 'Anonymous', u.name) AS donorName,
         d.amount,
         d.created_at AS donatedAt
       FROM donations d
       JOIN users u ON d.donor_id = u.id
       WHERE d.campaign_id = ? AND d.status = 'paid'
       ORDER BY d.created_at DESC
       LIMIT 20`,
      [req.params.id]
    );

    // Load expense reports
    const [expenses] = await pool.query(
      `SELECT id, amount, description, proof_image_key, created_at
       FROM expenses
       WHERE campaign_id = ?
       ORDER BY created_at DESC`,
      [req.params.id]
    );

    const expensesFormatted = expenses.map((e) => ({
      id: e.id,
      amount: e.amount,
      description: e.description,
      proofImageUrl: buildImageUrl(e.proof_image_key),
      createdAt: e.created_at,
    }));

    // Aggregate total reported spending
    const [expSum] = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE campaign_id = ?',
      [req.params.id]
    );
    const totalExpenses = parseFloat(expSum[0].total);
    const raised = parseFloat(rows[0].raised_amount) || 0;
    const spendingPct = raised > 0 ? Math.min(Math.round((totalExpenses / raised) * 100), 100) : 0;

    return res.json({
      campaign: formatCampaign(rows[0]),
      donors,
      expenses: expensesFormatted,
      totalExpenses,
      spendingPercent: spendingPct,
    });
  } catch (err) {
    console.error('[campaigns/detail]', err);
    return res.status(500).json({ message: 'Could not load campaign' });
  }
});

// ─── POST /api/campaigns ──────────────────────────────────────────────────────

router.post(
  '/',
  authenticate,
  imageUpload('campaigns'),
  [
    body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be 5–200 characters'),
    body('category').isIn(CATEGORY_IDS).withMessage('Invalid category'),
    body('description').trim().isLength({ min: 20, max: 10000 }).withMessage('Description must be 20–10 000 characters'),
    body('targetAmount')
      .isFloat({ min: 100 })
      .withMessage('Target amount must be at least ₹100')
      .toFloat(),
    body('deadline')
      .isISO8601()
      .withMessage('Deadline must be a valid date')
      .custom((val) => {
        if (new Date(val) <= new Date()) throw new Error('Deadline must be in the future');
        return true;
      }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { title, category, description, targetAmount, deadline } = req.body;
    // S3 key is set by multer-s3; null when S3 is not configured
    const imageKey = req.file ? (req.file.key || null) : null;

    try {
      const [result] = await pool.query(
        `INSERT INTO campaigns
           (owner_id, title, category, description, target_amount, image_key, deadline, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
        [req.user.id, title, category, description, targetAmount, imageKey, deadline]
      );

      const [rows] = await pool.query(
        `SELECT c.*, u.name AS owner_name
         FROM campaigns c JOIN users u ON c.owner_id = u.id
         WHERE c.id = ?`,
        [result.insertId]
      );

      return res.status(201).json({ campaign: formatCampaign(rows[0]) });
    } catch (err) {
      console.error('[campaigns/create]', err);
      return res.status(500).json({ message: 'Could not create campaign' });
    }
  }
);

// ─── PATCH /api/campaigns/:id ─────────────────────────────────────────────────

router.patch(
  '/:id',
  authenticate,
  imageUpload('campaigns'),
  [
    param('id').isInt({ min: 1 }).toInt(),
    body('title').optional().trim().isLength({ min: 5, max: 200 }),
    body('description').optional().trim().isLength({ min: 20, max: 10000 }),
    body('targetAmount').optional().isFloat({ min: 100 }).toFloat(),
    body('deadline')
      .optional()
      .isISO8601()
      .custom((val) => {
        if (new Date(val) <= new Date()) throw new Error('Deadline must be in the future');
        return true;
      }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    try {
      const [rows] = await pool.query('SELECT * FROM campaigns WHERE id = ? AND status != ?', [
        req.params.id,
        'deleted',
      ]);
      if (rows.length === 0) return res.status(404).json({ message: 'Campaign not found' });

      const campaign = rows[0];
      if (campaign.owner_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'You do not own this campaign' });
      }

      const { title, description, targetAmount, deadline } = req.body;
      const imageKey = req.file ? (req.file.key || null) : null;

      // Only update provided fields
      const updates = [];
      const values = [];
      if (title) { updates.push('title = ?'); values.push(title); }
      if (description) { updates.push('description = ?'); values.push(description); }
      if (targetAmount) { updates.push('target_amount = ?'); values.push(targetAmount); }
      if (deadline) { updates.push('deadline = ?'); values.push(deadline); }
      if (imageKey) { updates.push('image_key = ?'); values.push(imageKey); }

      if (updates.length === 0) return res.status(400).json({ message: 'No fields to update' });

      values.push(req.params.id);
      await pool.query(`UPDATE campaigns SET ${updates.join(', ')} WHERE id = ?`, values);

      const [updated] = await pool.query(
        'SELECT c.*, u.name AS owner_name FROM campaigns c JOIN users u ON c.owner_id = u.id WHERE c.id = ?',
        [req.params.id]
      );
      return res.json({ campaign: formatCampaign(updated[0]) });
    } catch (err) {
      console.error('[campaigns/update]', err);
      return res.status(500).json({ message: 'Could not update campaign' });
    }
  }
);

// ─── POST /api/campaigns/:id/close ───────────────────────────────────────────

router.post('/:id/close', authenticate, [param('id').isInt({ min: 1 }).toInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid campaign ID' });

  try {
    const [rows] = await pool.query("SELECT * FROM campaigns WHERE id = ? AND status = 'active'", [
      req.params.id,
    ]);
    if (rows.length === 0) return res.status(404).json({ message: 'Active campaign not found' });

    const campaign = rows[0];
    if (campaign.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You do not own this campaign' });
    }

    await pool.query("UPDATE campaigns SET status = 'closed' WHERE id = ?", [req.params.id]);
    return res.json({ message: 'Campaign closed successfully' });
  } catch (err) {
    console.error('[campaigns/close]', err);
    return res.status(500).json({ message: 'Could not close campaign' });
  }
});

module.exports = router;
