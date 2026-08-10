const pool = require('../db/pool');

// Only reminders SQL lives here. Every query is scoped to userId, same rule
// as every other model, so one user's reminders can never be seen or
// touched by another.

const WRITABLE_COLUMNS = ['title', 'due_date', 'done', 'application_id'];

async function createReminder(userId, data) {
  const [result] = await pool.execute(
    `INSERT INTO reminders (user_id, application_id, title, due_date)
     VALUES (?, ?, ?, ?)`,
    [userId, data.application_id ?? null, data.title, data.due_date]
  );
  return findReminderById(userId, result.insertId);
}

// I join the linked application (if any) so the client can show "Follow up
// -- Monzo, Graduate Engineer" without a second round trip. The join is
// LEFT (not INNER) since application_id is optional, and re-checks
// a.user_id = r.user_id so a reminder can never surface another user's
// application details even in the pathological case of a stale/bad link.
const SELECT_WITH_APPLICATION = `
  SELECT r.*, a.company AS application_company, a.role AS application_role
    FROM reminders r
    LEFT JOIN applications a ON a.id = r.application_id AND a.user_id = r.user_id
`;

async function findReminderById(userId, id) {
  const [rows] = await pool.execute(`${SELECT_WITH_APPLICATION} WHERE r.user_id = ? AND r.id = ?`, [
    userId,
    id,
  ]);
  return rows[0] || null;
}

// Not-done first, then soonest due date -- the ones that actually need
// attention float to the top.
async function findReminders(userId) {
  const [rows] = await pool.execute(
    `${SELECT_WITH_APPLICATION} WHERE r.user_id = ? ORDER BY r.done ASC, r.due_date ASC, r.id ASC`,
    [userId]
  );
  return rows;
}

async function updateReminder(userId, id, data) {
  const fields = [];
  const values = [];
  for (const col of WRITABLE_COLUMNS) {
    if (data[col] !== undefined) {
      fields.push(`${col} = ?`);
      values.push(data[col]);
    }
  }
  if (fields.length === 0) {
    return findReminderById(userId, id); // nothing to change
  }

  values.push(userId, id);
  await pool.execute(`UPDATE reminders SET ${fields.join(', ')} WHERE user_id = ? AND id = ?`, values);
  return findReminderById(userId, id);
}

async function deleteReminder(userId, id) {
  const [result] = await pool.execute('DELETE FROM reminders WHERE user_id = ? AND id = ?', [
    userId,
    id,
  ]);
  return result.affectedRows > 0;
}

module.exports = { createReminder, findReminderById, findReminders, updateReminder, deleteReminder };
