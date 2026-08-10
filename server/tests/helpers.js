const pool = require('../src/db/pool');

// I wipe every table before each test so every test starts from an empty,
// known state and doesn't depend on what ran before it.
//
// I turn off foreign key checks around the TRUNCATEs because several of these
// reference users (directly or via applications); without that, MySQL could
// refuse to truncate. TRUNCATE also resets AUTO_INCREMENT, so ids start back
// at 1 and are predictable in tests.
async function resetDatabase() {
  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  await pool.query('TRUNCATE TABLE candidates');
  await pool.query('TRUNCATE TABLE processed_emails');
  await pool.query('TRUNCATE TABLE oauth_accounts');
  await pool.query('TRUNCATE TABLE applications');
  await pool.query('TRUNCATE TABLE users');
  await pool.query('SET FOREIGN_KEY_CHECKS = 1');
}

module.exports = { resetDatabase, pool };
