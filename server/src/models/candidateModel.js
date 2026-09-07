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

// Merges a newer email's extraction into a candidate that's still sitting in
// the review queue (see reconcile.js / syncController.js for when this is
// used instead of inserting a new row). Scoped to state = 'pending', same
// guard as findPendingCandidateById -- a candidate the user already decided
// on is never touched by sync again, full stop.
//
// company/role are only backfilled when the existing value is null and the
// new extraction actually has one -- a later email that fails to extract a
// role must never blank out a role a previous email already gave us.
async function mergeIntoPendingCandidate(
  userId,
  id,
  { company, role, status, confidence, sourceMessageId, emailDate }
) {
  await pool.execute(
    `UPDATE candidates
       SET company = COALESCE(company, ?),
           role = COALESCE(role, ?),
           status = ?,
           confidence = ?,
           source_message_id = ?,
           email_date = ?
     WHERE user_id = ? AND id = ? AND state = 'pending'`,
    [company, role, status, confidence, sourceMessageId, emailDate, userId, id]
  );
}

async function updateCandidateState(userId, id, state) {
  await pool.execute('UPDATE candidates SET state = ? WHERE user_id = ? AND id = ?', [
    state,
    userId,
    id,
  ]);
}

// See applicationModel.deleteAllForUser -- same reasoning, same demo-only use.
async function deleteAllForUser(userId) {
  await pool.execute('DELETE FROM candidates WHERE user_id = ?', [userId]);
}

module.exports = {
  createCandidate,
  findCandidateById,
  findPendingCandidates,
  findPendingCandidateById,
  updateCandidateState,
  mergeIntoPendingCandidate,
  deleteAllForUser,
};
