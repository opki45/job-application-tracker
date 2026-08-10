const request = require('supertest');
const { resetDatabase, pool } = require('./helpers');
const candidateModel = require('../src/models/candidateModel');

const app = require('../src/app');

beforeEach(async () => {
  await resetDatabase();
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

async function seedCandidate(userId, overrides = {}) {
  return candidateModel.createCandidate(userId, {
    sourceMessageId: 'm1',
    company: 'Monzo',
    role: 'Graduate Software Engineer',
    status: 'applied',
    confidence: 0.9,
    ...overrides,
  });
}

describe('GET /api/candidates', () => {
  test('requires auth', async () => {
    const res = await request(app).get('/api/candidates');
    expect(res.status).toBe(401);
  });

  test('returns only this user\'s pending candidates', async () => {
    const { token, userId } = await createUser('a@example.com');
    const { userId: otherUserId } = await createUser('b@example.com');
    await seedCandidate(userId, { sourceMessageId: 'm1' });
    await seedCandidate(otherUserId, { sourceMessageId: 'm2' });

    const res = await request(app).get('/api/candidates').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.candidates).toHaveLength(1);
    expect(res.body.candidates[0].company).toBe('Monzo');
  });

  test('does not include accepted or dismissed candidates', async () => {
    const { token, userId } = await createUser();
    const accepted = await seedCandidate(userId, { sourceMessageId: 'm1' });
    const dismissed = await seedCandidate(userId, { sourceMessageId: 'm2' });
    await candidateModel.updateCandidateState(userId, accepted.id, 'accepted');
    await candidateModel.updateCandidateState(userId, dismissed.id, 'dismissed');

    const res = await request(app).get('/api/candidates').set('Authorization', `Bearer ${token}`);
    expect(res.body.candidates).toHaveLength(0);
  });
});

describe('POST /api/candidates/:id/accept', () => {
  test('requires auth', async () => {
    const res = await request(app).post('/api/candidates/1/accept');
    expect(res.status).toBe(401);
  });

  test('creates an application with source=email from a complete candidate', async () => {
    const { token, userId } = await createUser();
    const candidate = await seedCandidate(userId);

    const res = await request(app)
      .post(`/api/candidates/${candidate.id}/accept`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.application).toMatchObject({
      company: 'Monzo',
      role: 'Graduate Software Engineer',
      status: 'applied',
      source: 'email',
    });

    // The candidate should no longer show up in the queue.
    const list = await request(app).get('/api/candidates').set('Authorization', `Bearer ${token}`);
    expect(list.body.candidates).toHaveLength(0);
  });

  test('rejects an incomplete candidate (null role) with 400 until edited', async () => {
    const { token, userId } = await createUser();
    const candidate = await seedCandidate(userId, { role: null, status: null, confidence: 0.6 });

    const res = await request(app)
      .post(`/api/candidates/${candidate.id}/accept`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(expect.arrayContaining([expect.stringContaining('role')]));

    // Still pending -- a failed accept doesn't consume the candidate.
    const list = await request(app).get('/api/candidates').set('Authorization', `Bearer ${token}`);
    expect(list.body.candidates).toHaveLength(1);
  });

  test('edit-then-approve: an override in the request body fills the gap', async () => {
    const { token, userId } = await createUser();
    const candidate = await seedCandidate(userId, { role: null, confidence: 0.6 });

    const res = await request(app)
      .post(`/api/candidates/${candidate.id}/accept`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'Graduate AI Engineer' });

    expect(res.status).toBe(201);
    expect(res.body.application.role).toBe('Graduate AI Engineer');
  });

  test('returns 404 for another user\'s candidate', async () => {
    const { userId: ownerId } = await createUser('a@example.com');
    const { token: otherToken } = await createUser('b@example.com');
    const candidate = await seedCandidate(ownerId);

    const res = await request(app)
      .post(`/api/candidates/${candidate.id}/accept`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({});

    expect(res.status).toBe(404);
  });

  test('returns 404 for an already-accepted candidate (no double accept)', async () => {
    const { token, userId } = await createUser();
    const candidate = await seedCandidate(userId);
    await candidateModel.updateCandidateState(userId, candidate.id, 'accepted');

    const res = await request(app)
      .post(`/api/candidates/${candidate.id}/accept`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(404);
  });
});

describe('POST /api/candidates/:id/dismiss', () => {
  test('requires auth', async () => {
    const res = await request(app).post('/api/candidates/1/dismiss');
    expect(res.status).toBe(401);
  });

  test('removes the candidate from the queue without creating an application', async () => {
    const { token, userId } = await createUser();
    const candidate = await seedCandidate(userId);

    const res = await request(app)
      .post(`/api/candidates/${candidate.id}/dismiss`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);

    const list = await request(app).get('/api/candidates').set('Authorization', `Bearer ${token}`);
    expect(list.body.candidates).toHaveLength(0);

    const [appRows] = await pool.query('SELECT * FROM applications WHERE user_id = ?', [userId]);
    expect(appRows).toHaveLength(0);
  });

  test('a dismissed candidate never resurfaces (404 on a second dismiss)', async () => {
    const { token, userId } = await createUser();
    const candidate = await seedCandidate(userId);
    await request(app).post(`/api/candidates/${candidate.id}/dismiss`).set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .post(`/api/candidates/${candidate.id}/dismiss`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  test('returns 404 for another user\'s candidate', async () => {
    const { userId: ownerId } = await createUser('a@example.com');
    const { token: otherToken } = await createUser('b@example.com');
    const candidate = await seedCandidate(ownerId);

    const res = await request(app)
      .post(`/api/candidates/${candidate.id}/dismiss`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(404);
  });
});
