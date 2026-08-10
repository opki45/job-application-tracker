const pool = require('../db/pool');

// Every function takes userId first and every query includes "WHERE user_id = ?".
// This is how I guarantee one user can never see or touch another user's data:
// the ownership check lives INSIDE the SQL, not as a separate step I might forget.

// Columns a client is allowed to write. I use this whitelist when building the
// dynamic UPDATE below, so a user can never set a column I didn't intend.
const WRITABLE_COLUMNS = ['company', 'role', 'status', 'date_applied', 'job_description', 'notes'];

async function createApplication(userId, data) {
  const [result] = await pool.execute(
    `INSERT INTO applications
       (user_id, company, role, status, date_applied, job_description, notes, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      data.company,
      data.role,
      data.status,
      data.date_applied,
      data.job_description ?? null,
      data.notes ?? null,
      // 'manual' unless the caller says otherwise (candidateController passes
      // 'email' when an application is created from an accepted candidate).
      // Matches the schema default, so every existing caller is unaffected.
      data.source ?? 'manual',
    ]
  );
  // Read the new row back so the client gets the full record (id, timestamps...).
  return findApplicationById(userId, result.insertId);
}

// The dashboard list. Optional status filter. Newest first.
async function findApplications(userId, { status } = {}) {
  if (status) {
    const [rows] = await pool.execute(
      `SELECT * FROM applications
        WHERE user_id = ? AND status = ?
        ORDER BY date_applied DESC, id DESC`,
      [userId, status]
    );
    return rows;
  }
  const [rows] = await pool.execute(
    `SELECT * FROM applications
      WHERE user_id = ?
      ORDER BY date_applied DESC, id DESC`,
    [userId]
  );
  return rows;
}

async function findApplicationById(userId, id) {
  const [rows] = await pool.execute(
    'SELECT * FROM applications WHERE user_id = ? AND id = ?',
    [userId, id]
  );
  return rows[0] || null;
}

async function updateApplication(userId, id, data) {
  // Build the SET clause from only the fields the caller actually sent, so a
  // partial update (e.g. just { status }) doesn't overwrite everything else.
  // Column NAMES come from my fixed whitelist (never user input); VALUES stay
  // parameterized.
  const fields = [];
  const values = [];
  for (const col of WRITABLE_COLUMNS) {
    if (data[col] !== undefined) {
      fields.push(`${col} = ?`);
      values.push(data[col]);
    }
  }

  if (fields.length === 0) {
    return findApplicationById(userId, id); // nothing to change
  }

  values.push(userId, id); // for the WHERE clause
  await pool.execute(
    `UPDATE applications SET ${fields.join(', ')} WHERE user_id = ? AND id = ?`,
    values
  );
  return findApplicationById(userId, id);
}

async function deleteApplication(userId, id) {
  const [result] = await pool.execute(
    'DELETE FROM applications WHERE user_id = ? AND id = ?',
    [userId, id]
  );
  // affectedRows is 0 if nothing matched (wrong id, or not this user's row).
  return result.affectedRows > 0;
}

module.exports = {
  createApplication,
  findApplications,
  findApplicationById,
  updateApplication,
  deleteApplication,
};
