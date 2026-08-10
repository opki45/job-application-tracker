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

// Sortable columns a client can ask for. Never taken from user input directly
// for the SQL itself -- same whitelist principle as WRITABLE_COLUMNS below,
// just for ORDER BY instead of SET.
const SORT_COLUMNS = {
  date_applied: 'date_applied',
  company: 'company',
  role: 'role',
  status: 'status',
  created_at: 'created_at',
};

// The applications list. Two shapes depending on whether `page` is given:
//   - no page: returns a plain array, unpaginated -- this is what the
//     Dashboard's own summary table and syncController's reconciliation
//     matching both need (reconciliation in particular needs the user's
//     FULL application set to match against, not one page of it).
//   - page given: returns { applications, total } for the dedicated
//     Applications page's search/sort/pagination UI.
// `search` matches company or role (substring, case-insensitive by MySQL's
// default collation). `sort`/`order` control ORDER BY; both fall back to a
// sane default rather than erroring on a bad value, since this only affects
// display order, never which rows are returned.
async function findApplications(userId, { status, search, sort, order, page, pageSize } = {}) {
  const conditions = ['user_id = ?'];
  const params = [userId];

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push('(company LIKE ? OR role LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like);
  }

  const whereClause = conditions.join(' AND ');
  const sortColumn = SORT_COLUMNS[sort] || 'date_applied';
  const sortOrder = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const orderClause = `ORDER BY ${sortColumn} ${sortOrder}, id DESC`;

  if (page) {
    const size = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
    const offset = (Math.max(Number(page), 1) - 1) * size;
    const [rows] = await pool.query(
      `SELECT * FROM applications WHERE ${whereClause} ${orderClause} LIMIT ? OFFSET ?`,
      [...params, size, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM applications WHERE ${whereClause}`,
      params
    );
    return { applications: rows, total };
  }

  const [rows] = await pool.query(
    `SELECT * FROM applications WHERE ${whereClause} ${orderClause}`,
    params
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
