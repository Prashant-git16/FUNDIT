/**
 * db.js — MySQL connection pool
 *
 * Uses mysql2/promise for async/await support.
 * The pool manages connections automatically and retries on transient failures.
 * All queries must use parameterized statements (the ? placeholder) to prevent SQL injection.
 */
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'fundit_user',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'fundit_db',
  waitForConnections: true,
  connectionLimit: 10,      // max simultaneous connections
  queueLimit: 0,            // unlimited queue
  charset: 'utf8mb4',       // full Unicode including emoji
  timezone: '+00:00',       // store/read timestamps as UTC
  decimalNumbers: false,    // return DECIMAL columns as strings (exact money arithmetic)
});

/**
 * Verify the pool can reach the database at startup.
 * Logs a warning but does NOT crash the process — the health endpoint will reflect the failure.
 */
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('[db] MySQL connection pool ready');
  } catch (err) {
    console.error('[db] WARNING: Cannot connect to MySQL at startup:', err.message);
    console.error('[db] Check DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in your .env file');
  }
}

module.exports = { pool, testConnection };
