const request = require('supertest');
const app = require('../src/app');
const { resetDatabase, pool } = require('./helpers');

// Run before EVERY test: start from an empty database so tests are independent.
beforeEach(async () => {
  await resetDatabase();
});

// Run once after ALL tests: close the pool so Jest can exit cleanly instead of
// hanging on an open database connection.
afterAll(async () => {
  await pool.end();
});

describe('POST /api/auth/register', () => {
  test('creates a user and returns 201 with the user (no password)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dayo@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('dayo@example.com');
    expect(res.body.user.id).toBeDefined();
    // The password (or its hash) must never come back in the response.
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.user.password_hash).toBeUndefined();
  });

  test('rejects a duplicate email with 409', async () => {
    const payload = { email: 'dup@example.com', password: 'password123' };
    await request(app).post('/api/auth/register').send(payload); // first: ok
    const res = await request(app).post('/api/auth/register').send(payload); // second: dup

    expect(res.status).toBe(409);
  });

  test('rejects a password shorter than 8 characters with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'weak@example.com', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  test('rejects an invalid email with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'password123' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  // Each login test needs an existing account first.
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'dayo@example.com', password: 'password123' });
  });

  test('logs in with correct credentials and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dayo@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('dayo@example.com');
  });

  test('rejects a wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dayo@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  test('rejects an unknown email with 401 (same message, no enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me (protected)', () => {
  test('returns 401 with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('returns 401 with a malformed/invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).toBe(401);
  });

  test('returns the current user with a valid token', async () => {
    // Register to get a real token, then use it to reach the protected route.
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dayo@example.com', password: 'password123' });

    // register doesn't return a token, so log in to get one.
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dayo@example.com', password: 'password123' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('dayo@example.com');
    expect(res.body.user.password_hash).toBeUndefined();
  });
});
