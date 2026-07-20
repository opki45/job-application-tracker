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

module.exports = { createUser, findUserByEmail, findUserById };
