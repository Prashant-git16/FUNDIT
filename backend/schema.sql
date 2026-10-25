-- ============================================================
-- Fundit Database Schema — MySQL 8.0+
-- Run this file once against a fresh database:
--   mysql -u fundit_user -p fundit_db < schema.sql
--
-- For production, use versioned migrations instead of re-running this.
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ─── users ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            INT          UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(100) NOT NULL,
  email             VARCHAR(255) NOT NULL,
  password_hash     VARCHAR(255) NULL,           -- NULL for Google-only accounts
  google_id         VARCHAR(255) NULL,           -- NULL for password-only accounts
  role              ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  phone             VARCHAR(20)  NULL,
  occupation        VARCHAR(100) NULL,
  address           TEXT         NULL,
  profile_completed TINYINT(1)   NOT NULL DEFAULT 0,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_users_email    (email),
  UNIQUE KEY uq_users_google   (google_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── campaigns ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaigns (
  id              INT           UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  owner_id        INT           UNSIGNED NOT NULL,
  title           VARCHAR(200)  NOT NULL,
  category        VARCHAR(50)   NOT NULL,
  description     TEXT          NOT NULL,
  -- DECIMAL(12,2): stores exact rupee amounts up to 9,999,999,999.99
  target_amount   DECIMAL(12,2) NOT NULL,
  raised_amount   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  image_key       VARCHAR(500)  NULL,         -- Cover image key / URL
  deadline        DATE          NOT NULL,
  gov_id_type     VARCHAR(50)   NULL,         -- Aadhaar, PAN, Voter ID, Passport, etc.
  gov_id_number   VARCHAR(100)  NULL,
  phone           VARCHAR(20)   NULL,         -- Campaign organizer verified mobile
  address         TEXT          NULL,         -- Organizer address
  proof_documents JSON          NULL,         -- JSON array of 2-3 proof document keys
  status          ENUM('pending', 'review', 'active', 'rejected', 'closed', 'deleted') NOT NULL DEFAULT 'pending',
  admin_remarks   TEXT          NULL,         -- Moderation remarks from admin
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_campaigns_owner FOREIGN KEY (owner_id) REFERENCES users(id),
  INDEX idx_campaigns_category (category),
  INDEX idx_campaigns_status   (status),
  INDEX idx_campaigns_deadline (deadline),
  INDEX idx_campaigns_created  (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── donations ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS donations (
  id                   INT           UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id          INT           UNSIGNED NOT NULL,
  donor_id             INT           UNSIGNED NOT NULL,
  amount               DECIMAL(12,2) NOT NULL,
  currency             CHAR(3)       NOT NULL DEFAULT 'INR',
  is_anonymous         TINYINT(1)    NOT NULL DEFAULT 0,
  razorpay_order_id    VARCHAR(100)  NOT NULL,
  razorpay_payment_id  VARCHAR(100)  NULL,    -- NULL until payment is verified
  -- UNIQUE on payment_id prevents recording the same payment twice
  status               ENUM('pending', 'paid', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
  created_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_donations_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
  CONSTRAINT fk_donations_donor    FOREIGN KEY (donor_id)    REFERENCES users(id),
  UNIQUE KEY uq_donations_order    (razorpay_order_id),
  UNIQUE KEY uq_donations_payment  (razorpay_payment_id),
  INDEX idx_donations_donor        (donor_id),
  INDEX idx_donations_campaign     (campaign_id),
  INDEX idx_donations_status       (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── expenses ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS expenses (
  id              INT           UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id     INT           UNSIGNED NOT NULL,
  amount          DECIMAL(12,2) NOT NULL,
  description     VARCHAR(500)  NOT NULL,
  proof_image_key VARCHAR(500)  NULL,    -- S3 object key for receipt image
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_expenses_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
  INDEX idx_expenses_campaign (campaign_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── moderation_logs ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS moderation_logs (
  id           INT          UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id     INT          UNSIGNED NOT NULL,
  campaign_id  INT          UNSIGNED NOT NULL,
  action       VARCHAR(50)  NOT NULL,   -- 'close', 'delete', etc.
  reason       TEXT         NOT NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_modlogs_admin    FOREIGN KEY (admin_id)    REFERENCES users(id),
  CONSTRAINT fk_modlogs_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
  INDEX idx_modlogs_campaign (campaign_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
