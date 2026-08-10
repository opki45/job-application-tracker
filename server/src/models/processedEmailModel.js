const pool = require('../db/pool');

// Only processed_emails SQL lives here. Every query is scoped to a userId,
// same as every other model, so one user's dedupe state can never affect
// another's.

// Idempotent: INSERT IGNORE means a retried sync that sees the same message
// twice just leaves the existing row alone instead of erroring on the unique
// key.
async function markProcessed(userId, gmailMessageId) {
  await pool.execute(
    'INSERT IGNORE INTO processed_emails (user_id, gmail_message_id) VALUES (?, ?)',
    [userId, gmailMessageId]
  );
}

// Given a list of Gmail message ids, returns the subset I haven't recorded
// for this user before. One query instead of one per id.
async function filterUnprocessed(userId, gmailMessageIds) {
  if (gmailMessageIds.length === 0) return [];
  const [rows] = await pool.query(
    'SELECT gmail_message_id FROM processed_emails WHERE user_id = ? AND gmail_message_id IN (?)',
    [userId, gmailMessageIds]
  );
  const seen = new Set(rows.map((r) => r.gmail_message_id));
  return gmailMessageIds.filter((id) => !seen.has(id));
}

module.exports = { markProcessed, filterUnprocessed };
