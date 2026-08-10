const pool = require('../db/pool');

// Only candidates SQL lives here. Every query is scoped to a userId, same
// rule as every other model, so one user's review queue can never surface
// (or be dismissed by) another user.

async function createCandidate(
  userId,
  { sourceMessageId, company, role, status, confidence, matchedApplicationId = null }
) {
  const [result] = await pool.execute(
    `INSERT INTO candidates
       (user_id, source_message_id, company, role, status, confidence, matched_application_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, sourceMessageId, company, role, status, confidence, matchedApplicationId]
  );
  return findCandidateById(userId, result.insertId);
}

async function findCandidateById(userId, id) {
  const [rows] = await pool.execute('SELECT * FROM candidates WHERE user_id = ? AND id = ?', [
    userId,
    id,
  ]);
  return rows[0] || null;
}

module.exports = { createCandidate, findCandidateById };
