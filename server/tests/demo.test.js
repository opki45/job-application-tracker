const request = require('supertest');
const { resetDatabase, pool } = require('./helpers');

// Same boundary-mocking approach as integrations.test.js: googleClient.js is
// the only file that talks to Google, so mocking it here exercises my own
// connect() logic (including the demo-account block) without depending on
// real Google config being present in the test environment.
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

describe('POST /api/auth/demo', () => {
  test('logs straight in with no body, no password, returning a usable token', async () => {
    const res = await request(app).post('/api/auth/demo');
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('demo@landed.app');
    expect(res.body.user.is_demo).toBe(true);

    // The token actually works against a protected route.
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${res.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.is_demo).toBe(true);
  });

  test('a normal account is_demo: false', async () => {
    await request(app).post('/api/auth/register').send({ email: 'real@example.com', password: 'password123' });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'real@example.com', password: 'password123' });
    expect(login.body.user.is_demo).toBe(false);
  });

  test('reuses the same demo user id across calls rather than creating a new one each time', async () => {
    const first = await request(app).post('/api/auth/demo');
    const second = await request(app).post('/api/auth/demo');
    expect(first.body.user.id).toBe(second.body.user.id);

    const [rows] = await pool.query("SELECT COUNT(*) AS n FROM users WHERE email = 'demo@landed.app'");
    expect(rows[0].n).toBe(1);
  });

  test('seeds a curated set of applications, review-queue candidates, and reminders', async () => {
    const res = await request(app).post('/api/auth/demo');
    const { token, id: userId } = { token: res.body.token, id: res.body.user.id };

    const apps = await request(app).get('/api/applications').set('Authorization', `Bearer ${token}`);
    expect(apps.body.applications.length).toBeGreaterThan(0);

    const candidates = await request(app).get('/api/candidates').set('Authorization', `Bearer ${token}`);
    expect(candidates.body.candidates.length).toBeGreaterThan(0);
    // At least one should be immediately actionable in the review queue.
    expect(candidates.body.candidates.every((c) => c.state === 'pending')).toBe(true);

    const [reminderRows] = await pool.query('SELECT COUNT(*) AS n FROM reminders WHERE user_id = ?', [userId]);
    expect(reminderRows[0].n).toBeGreaterThan(0);
  });

  test('wipes and reseeds every visit, so nothing a previous visitor did survives', async () => {
    const first = await request(app).post('/api/auth/demo');
    const token = first.body.token;

    // A "visitor" deletes an application and adds a reminder of their own.
    const apps = await request(app).get('/api/applications').set('Authorization', `Bearer ${token}`);
    await request(app)
      .delete(`/api/applications/${apps.body.applications[0].id}`)
      .set('Authorization', `Bearer ${token}`);
    await request(app)
      .post('/api/reminders')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Visitor-added reminder', due_date: '2099-01-01' });

    // Next visitor hits /demo again.
    const second = await request(app).post('/api/auth/demo');
    const secondToken = second.body.token;
    const secondApps = await request(app)
      .get('/api/applications')
      .set('Authorization', `Bearer ${secondToken}`);
    const secondReminders = await request(app)
      .get('/api/reminders')
      .set('Authorization', `Bearer ${secondToken}`);

    expect(secondApps.body.applications.length).toBe(apps.body.applications.length); // the deleted one is back
    expect(secondReminders.body.reminders.some((r) => r.title === 'Visitor-added reminder')).toBe(false);
  });
});

describe('Gmail connect is blocked on the demo account', () => {
  test('GET /api/integrations/gmail/connect returns 403 for the demo user', async () => {
    const demo = await request(app).post('/api/auth/demo');
    const res = await request(app)
      .get('/api/integrations/gmail/connect')
      .set('Authorization', `Bearer ${demo.body.token}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/demo/i);
  });

  test('a real account is unaffected', async () => {
    googleClient.getAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?mock=1');
    await request(app).post('/api/auth/register').send({ email: 'real2@example.com', password: 'password123' });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'real2@example.com', password: 'password123' });
    const res = await request(app)
      .get('/api/integrations/gmail/connect')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.url).toContain('accounts.google.com');
  });
});
