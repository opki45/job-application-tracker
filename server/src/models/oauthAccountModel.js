const pool = require('../db/pool');

// Only oauth_accounts SQL lives here. Same rule as every other model: every
// function takes userId and every query includes it in the WHERE clause (or,
// for the insert, in the row itself), so ownership can't be forgotten.
//
// Tokens arrive here already encrypted (see utils/tokenCrypto.js) -- this
// file never sees a usable access or refresh token, only ciphertext.

async function upsertTokens(userId, provider, { accessToken, refreshToken, expiresAt }) {
  await pool.execute(
    `INSERT INTO oauth_accounts (user_id, provider, access_token, refresh_token, expires_at)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       access_token = VALUES(access_token),
       -- Google only sends a refresh_token on the FIRST consent (or when I
       -- force prompt=consent, which I do on every connect). On the rare
       -- reconnect where Google omits it anyway, keep the one I already have
       -- instead of overwriting it with NULL.
       refresh_token = COALESCE(VALUES(refresh_token), refresh_token),
       expires_at = VALUES(expires_at)`,
    [userId, provider, accessToken, refreshToken, expiresAt]
  );
}

async function findAccount(userId, provider) {
  const [rows] = await pool.execute(
    'SELECT * FROM oauth_accounts WHERE user_id = ? AND provider = ?',
    [userId, provider]
  );
  return rows[0] || null;
}

async function deleteAccount(userId, provider) {
  await pool.execute(
    'DELETE FROM oauth_accounts WHERE user_id = ? AND provider = ?',
    [userId, provider]
  );
}

module.exports = { upsertTokens, findAccount, deleteAccount };
