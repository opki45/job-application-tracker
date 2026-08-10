const pool = require('../db/pool');

// Only oauth_accounts SQL lives here. Same rule as every other model: every
// function takes userId and every query includes it in the WHERE clause (or,
// for the insert, in the row itself), so ownership can't be forgotten.
//
// Tokens arrive here already encrypted (see utils/tokenCrypto.js) -- this
// file never sees a usable access or refresh token, only ciphertext.

// Used on connect (OAuth callback), where Google is expected to always
// return a refresh_token (I force prompt=consent for exactly this reason).
// NOTE: MySQL validates NOT NULL on the INSERT clause of an "ON DUPLICATE KEY
// UPDATE" statement even when it ends up taking the UPDATE branch -- so this
// must never be called with a null/undefined refreshToken. Rotating just the
// access token (the common case, on every ordinary token refresh) goes
// through updateAccessToken below instead, which is a plain UPDATE and
// doesn't touch refresh_token at all.
async function upsertTokens(userId, provider, { accessToken, refreshToken, expiresAt }) {
  await pool.execute(
    `INSERT INTO oauth_accounts (user_id, provider, access_token, refresh_token, expires_at)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       access_token = VALUES(access_token),
       refresh_token = VALUES(refresh_token),
       expires_at = VALUES(expires_at)`,
    [userId, provider, accessToken, refreshToken, expiresAt]
  );
}

// Used when googleapis rotates the access token mid-request using the
// refresh_token I already have -- Google doesn't send a new refresh_token in
// this case, so there's nothing to overwrite it with, and I leave it alone.
async function updateAccessToken(userId, provider, { accessToken, expiresAt }) {
  await pool.execute(
    `UPDATE oauth_accounts SET access_token = ?, expires_at = ?
     WHERE user_id = ? AND provider = ?`,
    [accessToken, expiresAt, userId, provider]
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

module.exports = { upsertTokens, updateAccessToken, findAccount, deleteAccount };
