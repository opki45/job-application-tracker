const request = require('supertest');
const jwt = require('jsonwebtoken');
const config = require('../src/config');
const { resetDatabase, pool } = require('./helpers');

// I mock the Google boundary module rather than hitting real Google, per the
// same philosophy as the rest of this suite: exercise my own code, fixture
// everything external. googleClient.js is the only file that talks to Google,
// so mocking it here means the controller/model/crypto code underneath runs
// for real.
jest.mock('../src/integrations/googleClient');
const googleClient = require('../src/integrations/googleClient');

const app = require('../src/app');

beforeEach(async () => {
  await resetDatabase();
  jest.clearAllMocks();
});

afterAll(async () => {
  await pool.end();
});

// Registers + logs in a fresh user and returns their token.
async function createUser(email = 'dayo@example.com') {
  await request(app).post('/api/auth/register').send({ email, password: 'password123' });
  const login = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  return login.body.token;
}

describe('GET /api/integrations/gmail/connect', () => {
  test('requires auth', async () => {
    const res = await request(app).get('/api/integrations/gmail/connect');
    expect(res.status).toBe(401);
  });

  test('returns a consent URL built from a signed state', async () => {
    googleClient.getAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?mock=1');
    const token = await createUser();

    const res = await request(app)
      .get('/api/integrations/gmail/connect')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://accounts.google.com/o/oauth2/v2/auth?mock=1');
    // The state I generated should verify back to the requesting user.
    const state = googleClient.getAuthUrl.mock.calls[0][0];
    const payload = jwt.verify(state, config.jwtSecret);
    expect(typeof payload.sub).toBe('number');
  });
});

describe('GET /api/integrations/gmail/callback', () => {
  test('exchanges the code, stores encrypted tokens, and redirects to the client with success', async () => {
    const token = await createUser();
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    const userId = me.body.user.id;
    const state = jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: '10m' });

    googleClient.getTokensFromCode.mockResolvedValue({
      access_token: 'raw-access-token',
      refresh_token: 'raw-refresh-token',
      expiry_date: Date.now() + 3600_000,
    });

    const res = await request(app)
      .get('/api/integrations/gmail/callback')
      .query({ code: 'mock-code', state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`${config.clientUrl}/?gmail=connected`);

    // The stored row must never contain the raw token text.
    const [rows] = await pool.query('SELECT * FROM oauth_accounts WHERE user_id = ?', [userId]);
    expect(rows).toHaveLength(1);
    expect(rows[0].access_token).not.toContain('raw-access-token');
    expect(rows[0].refresh_token).not.toContain('raw-refresh-token');

    const statusRes = await request(app)
      .get('/api/integrations/gmail/status')
      .set('Authorization', `Bearer ${token}`);
    expect(statusRes.body.connected).toBe(true);
  });

  test('redirects with an error when the state is missing/invalid', async () => {
    const res = await request(app)
      .get('/api/integrations/gmail/callback')
      .query({ code: 'mock-code', state: 'not-a-real-token' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`${config.clientUrl}/?gmail=error`);
  });

  test('redirects with an error when the code exchange fails', async () => {
    const token = await createUser();
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    const state = jwt.sign({ sub: me.body.user.id }, config.jwtSecret, { expiresIn: '10m' });

    googleClient.getTokensFromCode.mockRejectedValue(new Error('invalid_grant'));

    const res = await request(app)
      .get('/api/integrations/gmail/callback')
      .query({ code: 'bad-code', state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`${config.clientUrl}/?gmail=error`);
  });

  test("a state signed for one user can't be used to connect a different user's account", async () => {
    const tokenA = await createUser('a@example.com');
    const meB = await createUser('b@example.com');
    const userA = (await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tokenA}`)).body
      .user.id;
    void meB; // just needed to seed a second user in the DB

    const state = jwt.sign({ sub: userA }, config.jwtSecret, { expiresIn: '10m' });
    googleClient.getTokensFromCode.mockResolvedValue({
      access_token: 'raw-access-token',
      refresh_token: 'raw-refresh-token',
      expiry_date: Date.now() + 3600_000,
    });

    await request(app).get('/api/integrations/gmail/callback').query({ code: 'mock-code', state });

    const [rows] = await pool.query('SELECT user_id FROM oauth_accounts');
    expect(rows).toHaveLength(1);
    expect(rows[0].user_id).toBe(userA);
  });
});

describe('GET /api/integrations/gmail/status', () => {
  test('requires auth', async () => {
    const res = await request(app).get('/api/integrations/gmail/status');
    expect(res.status).toBe(401);
  });

  test('returns connected: false when no account is linked', async () => {
    const token = await createUser();
    const res = await request(app)
      .get('/api/integrations/gmail/status')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(false);
  });
});

describe('DELETE /api/integrations/gmail', () => {
  test('requires auth', async () => {
    const res = await request(app).delete('/api/integrations/gmail');
    expect(res.status).toBe(401);
  });

  test('revokes with Google and removes the stored tokens', async () => {
    const token = await createUser();
    const userId = (await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)).body
      .user.id;
    const state = jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: '10m' });
    googleClient.getTokensFromCode.mockResolvedValue({
      access_token: 'raw-access-token',
      refresh_token: 'raw-refresh-token',
      expiry_date: Date.now() + 3600_000,
    });
    await request(app).get('/api/integrations/gmail/callback').query({ code: 'mock-code', state });

    googleClient.revokeToken.mockResolvedValue();
    const res = await request(app)
      .delete('/api/integrations/gmail')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(googleClient.revokeToken).toHaveBeenCalledWith('raw-refresh-token');

    const [rows] = await pool.query('SELECT * FROM oauth_accounts WHERE user_id = ?', [userId]);
    expect(rows).toHaveLength(0);
  });

  test('still deletes local tokens even if revoking with Google fails', async () => {
    const token = await createUser();
    const userId = (await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)).body
      .user.id;
    const state = jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: '10m' });
    googleClient.getTokensFromCode.mockResolvedValue({
      access_token: 'raw-access-token',
      refresh_token: 'raw-refresh-token',
      expiry_date: Date.now() + 3600_000,
    });
    await request(app).get('/api/integrations/gmail/callback').query({ code: 'mock-code', state });

    googleClient.revokeToken.mockRejectedValue(new Error('already revoked'));
    const res = await request(app)
      .delete('/api/integrations/gmail')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    const [rows] = await pool.query('SELECT * FROM oauth_accounts WHERE user_id = ?', [userId]);
    expect(rows).toHaveLength(0);
  });

  test('204s cleanly when nothing was connected', async () => {
    const token = await createUser();
    const res = await request(app)
      .delete('/api/integrations/gmail')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
  });
});
