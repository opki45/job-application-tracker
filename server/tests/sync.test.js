const request = require('supertest');
const { resetDatabase, pool } = require('./helpers');
const oauthAccountModel = require('../src/models/oauthAccountModel');
const tokenCrypto = require('../src/utils/tokenCrypto');

// gmailClient.js and extractApplication.js are the only files that talk to
// Gmail/the LLM directly -- I mock both whole modules here, same
// boundary-mocking approach as integrations.test.js, so the
// controller/model/prefilter code underneath runs for real.
jest.mock('../src/integrations/gmailClient');
jest.mock('../src/llm/extractApplication');
const gmailClient = require('../src/integrations/gmailClient');
const { extractApplication } = require('../src/llm/extractApplication');

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
// only that the same value flows into the other mocked calls.
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

const JOB_RELATED = {
  is_job_related: true,
  company: 'Some Company',
  role: 'Graduate Engineer',
  status: 'applied',
  confidence: 0.9,
};
const NOT_JOB_RELATED = { is_job_related: false, company: null, role: null, status: null, confidence: 0.2 };

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

  test('prefilter-rejected messages are dropped without ever reaching the LLM', async () => {
    const { token, userId } = await createUser();
    await connectGmail(userId);

    gmailClient.createClient.mockReturnValue(FAKE_GMAIL);
    gmailClient.listMessageIds.mockResolvedValue(['m1', 'm2']);
    gmailClient.getMessageSummary.mockImplementation(async (_gmail, id) => {
      if (id === 'm1') return summary('m1', { subject: 'Your application to Some Company' });
      return summary('m2', { subject: 'Dinner Friday?', snippet: 'Free tonight?' });
    });
    gmailClient.getMessageBody.mockResolvedValue('body text');
    extractApplication.mockResolvedValue(JOB_RELATED);

    const res = await request(app).post('/api/sync/gmail').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.scanned).toBe(2);
    expect(res.body.shortlisted).toBe(1); // only m1 passed the prefilter
    expect(extractApplication).toHaveBeenCalledTimes(1); // never called for m2

    const [rows] = await pool.query(
      'SELECT gmail_message_id FROM processed_emails WHERE user_id = ? ORDER BY gmail_message_id',
      [userId]
    );
    expect(rows.map((r) => r.gmail_message_id)).toEqual(['m1', 'm2']);
  });

  test('a job-related extraction creates a candidate and marks the message processed', async () => {
    const { token, userId } = await createUser();
    await connectGmail(userId);

    gmailClient.createClient.mockReturnValue(FAKE_GMAIL);
    gmailClient.listMessageIds.mockResolvedValue(['m1']);
    gmailClient.getMessageSummary.mockResolvedValue(
      summary('m1', { subject: 'Your application to Some Company' })
    );
    gmailClient.getMessageBody.mockResolvedValue('Thanks for applying to Some Company...');
    extractApplication.mockResolvedValue(JOB_RELATED);

    const res = await request(app).post('/api/sync/gmail').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.shortlisted).toBe(1);
    expect(res.body.candidates).toBe(1);

    // The LLM should see subject + sender + the full body, not just the snippet.
    const emailText = extractApplication.mock.calls[0][0];
    expect(emailText).toContain('Your application to Some Company');
    expect(emailText).toContain('Thanks for applying to Some Company');

    const [candidateRows] = await pool.query('SELECT * FROM candidates WHERE user_id = ?', [userId]);
    expect(candidateRows).toHaveLength(1);
    expect(candidateRows[0]).toMatchObject({
      source_message_id: 'm1',
      company: 'Some Company',
      role: 'Graduate Engineer',
      status: 'applied',
      state: 'pending',
      matched_application_id: null,
      // Parsed from summary()'s fixed 'Mon, 10 Aug 2026 00:00:00 +0000'
      // Date header, not whatever day the sync happens to run on.
      email_date: '2026-08-10',
    });

    const [processedRows] = await pool.query(
      'SELECT gmail_message_id FROM processed_emails WHERE user_id = ?',
      [userId]
    );
    expect(processedRows.map((r) => r.gmail_message_id)).toEqual(['m1']);
  });

  test('a missing/unparseable email Date header stores a null email_date rather than throwing', async () => {
    const { token, userId } = await createUser();
    await connectGmail(userId);

    gmailClient.createClient.mockReturnValue(FAKE_GMAIL);
    gmailClient.listMessageIds.mockResolvedValue(['m1']);
    gmailClient.getMessageSummary.mockResolvedValue(
      summary('m1', { subject: 'Your application to Some Company', date: 'not a real date' })
    );
    gmailClient.getMessageBody.mockResolvedValue('Thanks for applying to Some Company...');
    extractApplication.mockResolvedValue(JOB_RELATED);

    const res = await request(app).post('/api/sync/gmail').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const [candidateRows] = await pool.query('SELECT * FROM candidates WHERE user_id = ?', [userId]);
    expect(candidateRows[0].email_date).toBeNull();
  });

  test('an LLM "not job related" verdict marks processed without creating a candidate', async () => {
    const { token, userId } = await createUser();
    await connectGmail(userId);

    gmailClient.createClient.mockReturnValue(FAKE_GMAIL);
    gmailClient.listMessageIds.mockResolvedValue(['m1']);
    // Passes the cheap prefilter (mentions "interview") but the LLM,
    // reading the real body, decides it's not actually job-related.
    gmailClient.getMessageSummary.mockResolvedValue(summary('m1', { subject: 'Interview prep podcast' }));
    gmailClient.getMessageBody.mockResolvedValue('Episode 12: how to prepare for any interview.');
    extractApplication.mockResolvedValue(NOT_JOB_RELATED);

    const res = await request(app).post('/api/sync/gmail').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.candidates).toBe(0);

    const [candidateRows] = await pool.query('SELECT * FROM candidates WHERE user_id = ?', [userId]);
    expect(candidateRows).toHaveLength(0);
    const [processedRows] = await pool.query(
      'SELECT gmail_message_id FROM processed_emails WHERE user_id = ?',
      [userId]
    );
    expect(processedRows.map((r) => r.gmail_message_id)).toEqual(['m1']);
  });

  test('an LLM failure leaves the message unprocessed for the next sync to retry', async () => {
    const { token, userId } = await createUser();
    await connectGmail(userId);

    gmailClient.createClient.mockReturnValue(FAKE_GMAIL);
    gmailClient.listMessageIds.mockResolvedValue(['m1']);
    gmailClient.getMessageSummary.mockResolvedValue(
      summary('m1', { subject: 'Your application to Some Company' })
    );
    gmailClient.getMessageBody.mockResolvedValue('body text');
    extractApplication.mockRejectedValue(new Error('Ollama request failed: 500'));

    const res = await request(app).post('/api/sync/gmail').set('Authorization', `Bearer ${token}`);

    // The sync as a whole still succeeds -- one bad message doesn't fail the run.
    expect(res.status).toBe(200);
    expect(res.body.candidates).toBe(0);

    const [candidateRows] = await pool.query('SELECT * FROM candidates WHERE user_id = ?', [userId]);
    expect(candidateRows).toHaveLength(0);
    // Crucially: NOT recorded as processed, so the next sync retries it
    // instead of silently losing it because the LLM happened to be down.
    const [processedRows] = await pool.query(
      'SELECT gmail_message_id FROM processed_emails WHERE user_id = ?',
      [userId]
    );
    expect(processedRows).toHaveLength(0);
  });

  test('does not re-fetch a message already recorded in processed_emails', async () => {
    const { token, userId } = await createUser();
    await connectGmail(userId);

    gmailClient.createClient.mockReturnValue(FAKE_GMAIL);
    gmailClient.listMessageIds.mockResolvedValue(['m1']);
    gmailClient.getMessageSummary.mockResolvedValue(
      summary('m1', { subject: 'Dinner Friday?', snippet: 'Free tonight?' })
    );

    // First sync: m1 fails the prefilter, gets recorded as processed.
    await request(app).post('/api/sync/gmail').set('Authorization', `Bearer ${token}`);
    expect(gmailClient.getMessageSummary).toHaveBeenCalledTimes(1);

    // Second sync: Gmail lists the same message again (e.g. still within the
    // lookback window) -- I should skip it without calling getMessageSummary.
    gmailClient.getMessageSummary.mockClear();
    const res = await request(app).post('/api/sync/gmail').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.scanned).toBe(1);
    expect(res.body.shortlisted).toBe(0);
    expect(gmailClient.getMessageSummary).not.toHaveBeenCalled();
  });

  test('reconciliation: a forward status move on an existing application creates a matched candidate', async () => {
    const { token, userId } = await createUser();
    await connectGmail(userId);
    await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({ company: 'Some Company', role: 'Graduate Engineer', status: 'applied' });

    gmailClient.createClient.mockReturnValue(FAKE_GMAIL);
    gmailClient.listMessageIds.mockResolvedValue(['m1']);
    gmailClient.getMessageSummary.mockResolvedValue(
      summary('m1', { subject: 'Interview invitation from Some Company' })
    );
    gmailClient.getMessageBody.mockResolvedValue('We would like to invite you to interview...');
    extractApplication.mockResolvedValue({ ...JOB_RELATED, status: 'interviewing', confidence: 0.85 });

    const res = await request(app).post('/api/sync/gmail').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.candidates).toBe(1);

    const [rows] = await pool.query('SELECT * FROM candidates WHERE user_id = ?', [userId]);
    expect(rows).toHaveLength(1);
    expect(rows[0].matched_application_id).not.toBeNull();
    expect(rows[0].status).toBe('interviewing');

    // The existing application itself is untouched by sync -- only accepting
    // the candidate (a later step) writes to applications.
    const [appRows] = await pool.query('SELECT status FROM applications WHERE user_id = ?', [userId]);
    expect(appRows[0].status).toBe('applied');
  });

  test('reconciliation: a non-forward match (same stage restated) creates no candidate', async () => {
    const { token, userId } = await createUser();
    await connectGmail(userId);
    await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({ company: 'Some Company', role: 'Graduate Engineer', status: 'interviewing' });

    gmailClient.createClient.mockReturnValue(FAKE_GMAIL);
    gmailClient.listMessageIds.mockResolvedValue(['m1']);
    gmailClient.getMessageSummary.mockResolvedValue(
      summary('m1', { subject: 'Reminder: your interview with Some Company' })
    );
    gmailClient.getMessageBody.mockResolvedValue('Just a reminder about your upcoming interview...');
    // Extraction re-states the SAME stage the application is already at.
    extractApplication.mockResolvedValue({ ...JOB_RELATED, status: 'interviewing', confidence: 0.8 });

    const res = await request(app).post('/api/sync/gmail').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.candidates).toBe(0);

    const [rows] = await pool.query('SELECT * FROM candidates WHERE user_id = ?', [userId]);
    expect(rows).toHaveLength(0);
    // Still marked processed, even though no candidate was created -- I
    // never want to re-evaluate the same message on the next sync.
    const [processedRows] = await pool.query(
      'SELECT gmail_message_id FROM processed_emails WHERE user_id = ?',
      [userId]
    );
    expect(processedRows.map((r) => r.gmail_message_id)).toEqual(['m1']);
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
