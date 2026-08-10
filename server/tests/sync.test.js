const request = require('supertest');
const { resetDatabase, pool } = require('./helpers');
const oauthAccountModel = require('../src/models/oauthAccountModel');
const tokenCrypto = require('../src/utils/tokenCrypto');

// gmailClient.js is the only file that talks to Gmail directly -- I mock the
// whole module here, same boundary-mocking approach as integrations.test.js,
// so the controller/model/prefilter code underneath runs for real.
jest.mock('../src/integrations/gmailClient');
const gmailClient = require('../src/integrations/gmailClient');

const app = require('../src/app');

beforeEach(async () => {
  await resetDatabase();
  jest.clearAllMocks();
});

afterAll(async () => {
  await pool.end();
});

async function createUser(email = 'dayo@example.com') {
  await request(app).post('/api/auth/register').send({ email, password: 'password123' });
  const login = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`);
  return { token: login.body.token, userId: me.body.user.id };
}

// Seeds an oauth_accounts row directly (bypassing the real OAuth dance,
// which is already covered in integrations.test.js) so these tests can focus
// purely on the sync pipeline.
async function connectGmail(userId) {
  await oauthAccountModel.upsertTokens(userId, 'google', {
    accessToken: tokenCrypto.encrypt('fake-access-token'),
    refreshToken: tokenCrypto.encrypt('fake-refresh-token'),
    expiresAt: new Date(Date.now() + 3600_000),
  });
}

// gmailClient.createClient is mocked to just return this marker object --
// the real client is never constructed, so what it returns doesn't matter,
// only that the same value flows into the other two mocked calls.
const FAKE_GMAIL = { marker: 'fake-gmail-client' };

function summary(id, overrides = {}) {
  return {
    id,
    from: 'noreply@somecompany.com',
    subject: 'Update',
    date: 'Mon, 10 Aug 2026 00:00:00 +0000',
    snippet: '',
    ...overrides,
  };
}

describe('POST /api/sync/gmail', () => {
  test('requires auth', async () => {
    const res = await request(app).post('/api/sync/gmail');
    expect(res.status).toBe(401);
  });

  test('returns 400 when Gmail is not connected', async () => {
    const { token } = await createUser();
    const res = await request(app).post('/api/sync/gmail').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not connected/i);
  });

  test('shortlists job-related messages and drops the rest without an LLM call', async () => {
    const { token, userId } = await createUser();
    await connectGmail(userId);

    gmailClient.createClient.mockReturnValue(FAKE_GMAIL);
    gmailClient.listMessageIds.mockResolvedValue(['m1', 'm2', 'm3']);
    gmailClient.getMessageSummary.mockImplementation(async (_gmail, id) => {
      if (id === 'm1') return summary('m1', { subject: 'Your application to Some Company' });
      if (id === 'm2') return summary('m2', { subject: 'Dinner Friday?', snippet: 'Free tonight?' });
      return summary('m3', { from: 'no-reply@greenhouse.io', subject: 'Account update' });
    });

    const res = await request(app).post('/api/sync/gmail').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.scanned).toBe(3);
    expect(res.body.shortlisted.map((m) => m.id).sort()).toEqual(['m1', 'm3']);

    // The prefilter-rejected message is recorded as processed so it's never
    // re-fetched; the shortlisted ones are left for the next step.
    const [rows] = await pool.query(
      'SELECT gmail_message_id FROM processed_emails WHERE user_id = ?',
      [userId]
    );
    expect(rows.map((r) => r.gmail_message_id)).toEqual(['m2']);
  });

  test('does not re-fetch a message already recorded in processed_emails', async () => {
    const { token, userId } = await createUser();
    await connectGmail(userId);

    gmailClient.createClient.mockReturnValue(FAKE_GMAIL);
    gmailClient.listMessageIds.mockResolvedValue(['m1']);
    gmailClient.getMessageSummary.mockResolvedValue(
      summary('m1', { subject: 'Dinner Friday?', snippet: 'Free tonight?' })
    );

    // First sync: m1 is not job-related, gets recorded as processed.
    await request(app).post('/api/sync/gmail').set('Authorization', `Bearer ${token}`);
    expect(gmailClient.getMessageSummary).toHaveBeenCalledTimes(1);

    // Second sync: Gmail lists the same message again (e.g. still within the
    // lookback window) -- I should skip it without calling getMessageSummary.
    gmailClient.getMessageSummary.mockClear();
    const res = await request(app).post('/api/sync/gmail').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.scanned).toBe(1);
    expect(res.body.shortlisted).toEqual([]);
    expect(gmailClient.getMessageSummary).not.toHaveBeenCalled();
  });

  test('persists a rotated access token when googleapis refreshes one mid-sync', async () => {
    const { token, userId } = await createUser();
    await connectGmail(userId);

    gmailClient.createClient.mockReturnValue(FAKE_GMAIL);
    gmailClient.listMessageIds.mockResolvedValue([]);

    await request(app).post('/api/sync/gmail').set('Authorization', `Bearer ${token}`);

    // Simulate googleapis firing its 'tokens' event mid-request by invoking
    // the handler I passed in directly.
    const { onTokensRefreshed } = gmailClient.createClient.mock.calls[0][0];
    const before = await oauthAccountModel.findAccount(userId, 'google');

    await onTokensRefreshed({
      access_token: 'rotated-access-token',
      expiry_date: Date.now() + 7200_000,
    });

    const after = await oauthAccountModel.findAccount(userId, 'google');
    expect(after.access_token).not.toBe(before.access_token);
    expect(tokenCrypto.decrypt(after.access_token)).toBe('rotated-access-token');
    // No refresh_token in this event -- the one I already had must survive.
    expect(tokenCrypto.decrypt(after.refresh_token)).toBe('fake-refresh-token');
  });
});
