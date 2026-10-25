require('dotenv').config();
const { pool } = require('./db');

async function runMigration() {
  try {
    console.log('[migration] Starting database migration...');

    // 1. Update users table
    try {
      await pool.query(`
        ALTER TABLE users
        ADD COLUMN phone VARCHAR(20) NULL,
        ADD COLUMN occupation VARCHAR(100) NULL,
        ADD COLUMN address TEXT NULL,
        ADD COLUMN profile_completed TINYINT(1) NOT NULL DEFAULT 0
      `);
      console.log('[migration] users table updated with phone, occupation, address, profile_completed');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('[migration] users table columns already exist.');
      } else {
        console.warn('[migration] users alter warning:', err.message);
      }
    }

    // 2. Update campaigns table
    try {
      await pool.query(`
        ALTER TABLE campaigns
        MODIFY COLUMN status ENUM('pending', 'review', 'active', 'rejected', 'closed', 'deleted') NOT NULL DEFAULT 'pending',
        ADD COLUMN gov_id_type VARCHAR(50) NULL,
        ADD COLUMN gov_id_number VARCHAR(100) NULL,
        ADD COLUMN phone VARCHAR(20) NULL,
        ADD COLUMN address TEXT NULL,
        ADD COLUMN proof_documents JSON NULL,
        ADD COLUMN admin_remarks TEXT NULL
      `);
      console.log('[migration] campaigns table updated with KYC fields, proof_documents, admin_remarks, and status enum');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('[migration] campaigns table columns already exist. Updating status enum...');
        await pool.query(`
          ALTER TABLE campaigns
          MODIFY COLUMN status ENUM('pending', 'review', 'active', 'rejected', 'closed', 'deleted') NOT NULL DEFAULT 'pending'
        `);
      } else {
        console.warn('[migration] campaigns alter warning:', err.message);
      }
    }

    // 3. Mark existing seed campaigns as 'active' and seed users as profile_completed = 1
    await pool.query("UPDATE campaigns SET status = 'active' WHERE status != 'deleted' AND (status = 'pending' OR status IS NULL)");
    await pool.query("UPDATE users SET profile_completed = 1 WHERE profile_completed = 0");

    console.log('[migration] Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('[migration] Fatal error:', err);
    process.exit(1);
  }
}

runMigration();
