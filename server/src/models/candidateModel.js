const pool = require('../db/pool');

// Only candidates SQL lives here. Every query is scoped to a userId, same
// rule as every other model, so one user's review queue can never surface
// (or be dismissed by) another user.

async function createCandidate(
  userId,
  { sourceMessageId, company, role, status, confidence, matchedApplicationId = null, emailDate = null }
) {
  const [result] = await pool.execute(
    `INSERT INTO candidates
       (user_id, source_message_id, company, role, status, confidence, matched_application_id, email_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, sourceMessageId, company, role, status, confidence, matchedApplicationId, emailDate]
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

// The review queue: everything still awaiting a decision. Newest first, same
// convention as the applications list.
async function findPendingCandidates(userId) {
  const [rows] = await pool.execute(
    `SELECT * FROM candidates WHERE user_id = ? AND state = 'pending' ORDER BY created_at DESC, id DESC`,
    [userId]
  );
  return rows;
}

// Scoped to state = 'pending' on purpose: accept/dismiss both look a
// candidate up this way, so a nonexistent id, another user's candidate, AND
// one that's already been accepted/dismissed all 404 the same way. Once
// something's been decided, it doesn't resurface -- there's no path back to
// "pending" through this API.
async function findPendingCandidateById(userId, id) {
  const [rows] = await pool.execute(
    `SELECT * FROM candidates WHERE user_id = ? AND id = ? AND state = 'pending'`,
    [userId, id]
  );
  return rows[0] || null;
}

async function updateCandidateState(userId, id, state) {
  await pool.execute('UPDATE candidates SET state = ? WHERE user_id = ? AND id = ?', [
    state,
    userId,
    id,
  ]);
}

module.exports = {
  createCandidate,
  findCandidateById,
  findPendingCandidates,
  findPendingCandidateById,
  updateCandidateState,
};
