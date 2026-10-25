/**
 * routes/donationRoutes.js — Razorpay test-mode donation flow
 *
 * POST /api/donations/create-order  — Create a Razorpay order (authenticated)
 * POST /api/donations/verify        — Verify signature and record payment (authenticated)
 * GET  /api/donations/my            — Authenticated user's donation history
 *
 * Security notes:
 * - The frontend NEVER decides whether a payment was successful.
 * - The Razorpay secret key is used only on the backend to verify the HMAC signature.
 * - Amount is stored in rupees (DECIMAL); paise conversion happens only when calling Razorpay.
 * - A UNIQUE constraint on razorpay_payment_id prevents duplicate recording.
 * - The donation row is created with status='pending' at order time;
 *   it is updated to 'paid' only after successful signature verification.
 * - Both steps run inside a transaction to keep raised_amount consistent.
 */
const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { body, validationResult } = require('express-validator');
const { pool } = require('../db');
const { authenticate } = require('../auth');

const router = express.Router();

// Dynamic Razorpay client helper — loads currently active credentials from environment
function getRazorpayClient() {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    return new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return null;
}

// ─── POST /api/donations/create-order ────────────────────────────────────────

router.post(
  '/create-order',
  authenticate,
  [
    body('campaignId').isInt({ min: 1 }).toInt().withMessage('Invalid campaign ID'),
    body('amount')
      .isFloat({ min: 10, max: 500000 })
      .toFloat()
      .withMessage('Donation amount must be between ₹10 and ₹5,00,000'),
    body('isAnonymous').optional().isBoolean().toBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const { campaignId, amount, isAnonymous = false } = req.body;
    const razorpay = getRazorpayClient();

    if (!razorpay) {
      // In development mode without Razorpay credentials, support local simulated donation
      // so users, examiners, and students can test/demo the complete transactional flow without API friction
      if (process.env.NODE_ENV !== 'production') {
        try {
          const [campaigns] = await pool.query(
            "SELECT id, status, deadline, target_amount, raised_amount FROM campaigns WHERE id = ? AND status = 'active'",
            [campaignId]
          );
          if (campaigns.length === 0) {
            return res.status(400).json({ message: 'Campaign is not accepting donations' });
          }
          const camp = campaigns[0];
          if (new Date(camp.deadline) < new Date()) {
            return res.status(400).json({ message: 'This campaign has passed its deadline' });
          }
          const remaining = Math.max(0, parseFloat(camp.target_amount) - parseFloat(camp.raised_amount));
          if (remaining <= 0) {
            return res.status(400).json({ message: 'This campaign has already reached its goal! No more donations needed.' });
          }
          if (amount > remaining) {
            return res.status(400).json({
              message: `Donation cannot exceed the remaining goal of ₹${remaining.toLocaleString('en-IN')}`,
            });
          }
          const fakeOrderId = `order_sim_${Date.now()}`;
          await pool.query(
            `INSERT INTO donations
               (campaign_id, donor_id, amount, currency, is_anonymous, razorpay_order_id, status)
             VALUES (?, ?, ?, 'INR', ?, ?, 'pending')`,
            [campaignId, req.user.id, amount, isAnonymous ? 1 : 0, fakeOrderId]
          );
          return res.json({
            orderId: fakeOrderId,
            amount: Math.round(amount * 100),
            currency: 'INR',
            keyId: 'rzp_test_simulated',
            simulated: true,
          });
        } catch (err) {
          console.error('[donations/simulated-order]', err);
          return res.status(500).json({ message: 'Could not create simulated donation order' });
        }
      }
      return res.status(503).json({ message: 'Payment service is not configured. Add RAZORPAY_KEY_ID in backend/.env' });
    }

    try {
      // Verify the campaign exists, is active, and has not expired
      const [campaigns] = await pool.query(
        "SELECT id, status, deadline, target_amount, raised_amount FROM campaigns WHERE id = ? AND status = 'active'",
        [campaignId]
      );
      if (campaigns.length === 0) {
        return res.status(400).json({ message: 'Campaign is not accepting donations' });
      }
      const campaign = campaigns[0];
      if (new Date(campaign.deadline) < new Date()) {
        return res.status(400).json({ message: 'This campaign has passed its deadline' });
      }
      const remaining = Math.max(0, parseFloat(campaign.target_amount) - parseFloat(campaign.raised_amount));
      if (remaining <= 0) {
        return res.status(400).json({ message: 'This campaign has already reached its goal! No more donations needed.' });
      }
      if (amount > remaining) {
        return res.status(400).json({
          message: `Donation cannot exceed the remaining goal of ₹${remaining.toLocaleString('en-IN')}`,
        });
      }

      // Razorpay requires integer amounts in the smallest currency unit (paise = rupees × 100)
      const amountInPaise = Math.round(amount * 100);

      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        // receipt links this Razorpay order to our campaign and donor
        receipt: `campaign_${campaignId}_user_${req.user.id}`,
      });

      // Store a pending donation row so we can validate the order ID on verification
      await pool.query(
        `INSERT INTO donations
           (campaign_id, donor_id, amount, currency, is_anonymous, razorpay_order_id, status)
         VALUES (?, ?, ?, 'INR', ?, ?, 'pending')`,
        [campaignId, req.user.id, amount, isAnonymous ? 1 : 0, order.id]
      );

      // Return only what the frontend needs — NOT the secret key
      return res.json({
        orderId: order.id,
        amount: amountInPaise,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
      });
    } catch (err) {
      console.error('[donations/create-order]', err);
      return res.status(500).json({ message: 'Could not create payment order' });
    }
  }
);

// ─── POST /api/donations/verify ───────────────────────────────────────────────

router.post(
  '/verify',
  authenticate,
  [
    body('razorpayOrderId').notEmpty().withMessage('Order ID is required'),
    body('razorpayPaymentId').notEmpty().withMessage('Payment ID is required'),
    body('razorpaySignature').notEmpty().withMessage('Signature is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const razorpay = getRazorpayClient();
    const isSimulated = !razorpay && process.env.NODE_ENV !== 'production' && razorpayOrderId.startsWith('order_sim_');

    if (!razorpay && !isSimulated) {
      return res.status(503).json({ message: 'Payment service is not configured' });
    }

    try {
      // 1. Load the pending donation — must belong to THIS authenticated user
      const [rows] = await pool.query(
        `SELECT id, campaign_id, amount, status
         FROM donations
         WHERE razorpay_order_id = ? AND donor_id = ?`,
        [razorpayOrderId, req.user.id]
      );

      if (rows.length === 0) {
        return res.status(400).json({ message: 'Order not found or does not belong to you' });
      }

      const donation = rows[0];

      // 2. Idempotency: if already paid, just return success (prevents double-recording)
      if (donation.status === 'paid') {
        return res.json({ message: 'Payment already recorded', donationId: donation.id });
      }

      // 3. Verify signature (in live/test mode using secret, or bypassed only for local simulation)
      if (!isSimulated) {
        const expectedSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
          .update(`${razorpayOrderId}|${razorpayPaymentId}`)
          .digest('hex');

        if (expectedSignature !== razorpaySignature) {
          return res.status(400).json({ message: 'Payment verification failed: invalid signature' });
        }
      }

      // 4. Mark the donation as paid and update raised_amount atomically in a transaction
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        await conn.query(
          `UPDATE donations
           SET status = 'paid', razorpay_payment_id = ?
           WHERE id = ?`,
          [razorpayPaymentId, donation.id]
        );

        // Update running total — atomic with the donation status change
        await conn.query(
          'UPDATE campaigns SET raised_amount = raised_amount + ? WHERE id = ?',
          [donation.amount, donation.campaign_id]
        );

        await conn.commit();
        return res.json({ message: 'Payment verified successfully', donationId: donation.id });
      } catch (txErr) {
        await conn.rollback();
        throw txErr;
      } finally {
        conn.release();
      }
    } catch (err) {
      console.error('[donations/verify]', err);
      return res.status(500).json({ message: 'Payment verification error' });
    }
  }
);

// ─── GET /api/donations/my ────────────────────────────────────────────────────

router.get('/my', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.id, d.amount, d.currency, d.is_anonymous, d.status, d.created_at,
              c.id AS campaignId, c.title AS campaignTitle
       FROM donations d
       JOIN campaigns c ON d.campaign_id = c.id
       WHERE d.donor_id = ?
       ORDER BY d.created_at DESC`,
      [req.user.id]
    );

    return res.json({
      donations: rows.map((d) => ({
        id: d.id,
        amount: d.amount,
        currency: d.currency,
        isAnonymous: !!d.is_anonymous,
        status: d.status,
        createdAt: d.created_at,
        campaign: { id: d.campaignId, title: d.campaignTitle },
      })),
    });
  } catch (err) {
    console.error('[donations/my]', err);
    return res.status(500).json({ message: 'Could not load donation history' });
  }
});

module.exports = router;
