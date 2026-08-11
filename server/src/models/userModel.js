const pool = require('../db/pool');

// This is the only file that writes SQL for users. My controllers call these
// functions and never touch the database directly.
//
// Every query uses ? placeholders. mysql2 sends the SQL and the values to the
// database SEPARATELY, so a value can never be treated as SQL. That's my
// protection against SQL injection, and it's why raw SQL is safe here.

async function createUser({ email, passwordHash }) {
  const [result] = await pool.execute(
    'INSERT INTO users (email, password_hash) VALUES (?, ?)',
    [email, passwordHash]
  );
  // result.insertId is the auto-increment id MySQL just assigned.
  return { id: result.insertId, email };
}

// I select password_hash here because login will need it to compare passwords.
// I must be careful never to send this object straight back to the client.
async function findUserByEmail(email) {
  const [rows] = await pool.execute(
    'SELECT id, email, password_hash FROM users WHERE email = ?',
    [email]
  );
  return rows[0] || null;
}

// Safe to return to the client: I don't select password_hash here.
async function findUserById(id) {
  const [rows] = await pool.execute(
    'SELECT id, email, created_at FROM users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

// Like findUserById, but includes password_hash -- used for the change-
// password and delete-account flows, which both need to re-verify the
// user's CURRENT password before acting (a valid JWT alone isn't proof of
// the password; the token could be hours old). Same care as
// findUserByEmail: never send this object straight back to the client.
async function findUserByIdWithPassword(id) {
  const [rows] = await pool.execute(
    'SELECT id, email, password_hash FROM users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

async function updatePassword(id, passwordHash) {
  await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
}

// A Google-created account has no password -- password_hash stays NULL. It's
// still a normal row in the same table (not a separate identity system), so
// every other query/model in the app works on it unchanged.
async function createUserFromGoogle({ email, googleId }) {
  const [result] = await pool.execute(
    'INSERT INTO users (email, google_id) VALUES (?, ?)',
    [email, googleId]
  );
  return { id: result.insertId, email };
}

async function findUserByGoogleId(googleId) {
  const [rows] = await pool.execute(
    'SELECT id, email FROM users WHERE google_id = ?',
    [googleId]
  );
  return rows[0] || null;
}

// Attaches a Google identity to an existing password-created account, the
// first time that account's (verified) email signs in via Google. After
// this, either method logs the same user in.
async function linkGoogleId(id, googleId) {
  await pool.execute('UPDATE users SET google_id = ? WHERE id = ?', [googleId, id]);
}

// Every other table (applications, candidates, oauth_accounts,
// processed_emails, reminders) has ON DELETE CASCADE back to users, so
// deleting the user row is enough to take everything else with it -- no
// manual cleanup needed here.
async function deleteUser(id) {
  await pool.execute('DELETE FROM users WHERE id = ?', [id]);
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByIdWithPassword,
  updatePassword,
  deleteUser,
  createUserFromGoogle,
  findUserByGoogleId,
  linkGoogleId,
};
