/**
 * routes/expenseRoutes.js — Expense reporting for campaign owners
 *
 * GET  /api/expenses/:campaignId  — Public expense list for a campaign
 * POST /api/expenses/:campaignId  — Add an expense entry (campaign owner only)
 */
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { pool } = require('../db');
const { authenticate } = require('../auth');
const { imageUpload, buildImageUrl } = require('../upload');

const router = express.Router({ mergeParams: true });

// ─── GET /api/expenses/:campaignId ───────────────────────────────────────────

router.get('/:campaignId', [param('campaignId').isInt({ min: 1 }).toInt()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Invalid campaign ID' });

  try {
    const [rows] = await pool.query(
      'SELECT id, amount, description, proof_image_key, created_at FROM expenses WHERE campaign_id = ? ORDER BY created_at DESC',
      [req.params.campaignId]
    );

    return res.json({
      expenses: rows.map((e) => ({
        id: e.id,
        amount: e.amount,
        description: e.description,
        proofImageUrl: buildImageUrl(e.proof_image_key),
        createdAt: e.created_at,
      })),
    });
  } catch (err) {
    console.error('[expenses/list]', err);
    return res.status(500).json({ message: 'Could not load expenses' });
  }
});

// ─── POST /api/expenses/:campaignId ──────────────────────────────────────────

router.post(
  '/:campaignId',
  authenticate,
  imageUpload('expenses'),
  [
    param('campaignId').isInt({ min: 1 }).toInt(),
    body('amount').isFloat({ min: 1 }).toFloat().withMessage('Amount must be at least ₹1'),
    body('description').trim().isLength({ min: 5, max: 500 }).withMessage('Description must be 5–500 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const campaignId = req.params.campaignId;
    const { amount, description } = req.body;
    const imageKey = req.file ? (req.file.key || (req.file.filename ? `expenses/${req.file.filename}` : null)) : null;

    try {
      // Verify the authenticated user owns this campaign
      const [campaigns] = await pool.query(
        "SELECT id, owner_id, raised_amount FROM campaigns WHERE id = ? AND status != 'deleted'",
        [campaignId]
      );
      if (campaigns.length === 0) return res.status(404).json({ message: 'Campaign not found' });

      const campaign = campaigns[0];
      if (campaign.owner_id !== req.user.id) {
        return res.status(403).json({ message: 'Only the campaign owner can add expense reports' });
      }

      // Policy: cumulative reported expenses should not silently exceed the amount raised.
      // We warn in the response but do not block the entry, as the owner may be reporting
      // expenses in advance (e.g., using their own funds). This policy is clearly documented.
      const [sumRow] = await pool.query(
        'SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE campaign_id = ?',
        [campaignId]
      );
      const currentTotal = parseFloat(sumRow[0].total);
      const raised = parseFloat(campaign.raised_amount);
      const warning =
        currentTotal + amount > raised
          ? 'Note: total reported expenses now exceed the amount raised. This entry has been saved.'
          : null;

      const [result] = await pool.query(
        'INSERT INTO expenses (campaign_id, amount, description, proof_image_key) VALUES (?, ?, ?, ?)',
        [campaignId, amount, description, imageKey]
      );

      return res.status(201).json({
        expense: {
          id: result.insertId,
          amount,
          description,
          proofImageUrl: buildImageUrl(imageKey),
          createdAt: new Date(),
        },
        warning,
      });
    } catch (err) {
      console.error('[expenses/create]', err);
      return res.status(500).json({ message: 'Could not save expense entry' });
    }
  }
);

module.exports = router;
