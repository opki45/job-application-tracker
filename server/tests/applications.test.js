const request = require('supertest');
const app = require('../src/app');
const { resetDatabase, pool } = require('./helpers');

// Register a user and return a usable token. I register then log in because
// register (by design) doesn't hand back a token; login does.
async function makeUserToken(email = 'dayo@example.com') {
  await request(app).post('/api/auth/register').send({ email, password: 'password123' });
  const login = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  return login.body.token;
}

let token;
beforeEach(async () => {
  await resetDatabase();
  token = await makeUserToken();
});
afterAll(async () => {
  await pool.end();
});

// Small helper: attach the current user's token to a supertest request.
const auth = (req) => req.set('Authorization', `Bearer ${token}`);

describe('Applications require authentication', () => {
  test('GET without a token returns 401', async () => {
    const res = await request(app).get('/api/applications');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/applications', () => {
  test('creates an application and defaults status to "applied"', async () => {
    const res = await auth(request(app).post('/api/applications')).send({
      company: 'Monzo',
      role: 'Graduate Software Engineer',
    });

    expect(res.status).toBe(201);
    expect(res.body.application.company).toBe('Monzo');
    expect(res.body.application.status).toBe('applied');
    expect(res.body.application.id).toBeDefined();
  });

  test('rejects a missing required field with 400', async () => {
    const res = await auth(request(app).post('/api/applications')).send({ role: 'SWE' });
    expect(res.status).toBe(400);
  });

  test('rejects an invalid status with 400', async () => {
    const res = await auth(request(app).post('/api/applications')).send({
      company: 'Amazon',
      role: 'SDE',
      status: 'ghosted',
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/applications (list + filter)', () => {
  test('lists only the current user\'s applications', async () => {
    await auth(request(app).post('/api/applications')).send({ company: 'Monzo', role: 'SWE' });

    // A second user with their own application.
    const otherToken = await makeUserToken('other@example.com');
    await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ company: 'Amazon', role: 'SDE' });

    const res = await auth(request(app).get('/api/applications'));
    expect(res.status).toBe(200);
    expect(res.body.applications).toHaveLength(1);
    expect(res.body.applications[0].company).toBe('Monzo');
  });

  test('filters by status', async () => {
    await auth(request(app).post('/api/applications')).send({
      company: 'Monzo', role: 'SWE', status: 'applied',
    });
    await auth(request(app).post('/api/applications')).send({
      company: 'Wayve', role: 'ML Engineer', status: 'interviewing',
    });

    const res = await auth(request(app).get('/api/applications?status=interviewing'));
    expect(res.status).toBe(200);
    expect(res.body.applications).toHaveLength(1);
    expect(res.body.applications[0].company).toBe('Wayve');
  });
});

describe('GET /api/applications?page= (pagination/search/sort)', () => {
  async function seedApplications() {
    const companies = ['Amazon', 'Monzo', 'Synthesia', 'Wayve', 'Palantir'];
    for (const [i, company] of companies.entries()) {
      await auth(request(app).post('/api/applications')).send({
        company,
        role: 'Graduate Engineer',
        date_applied: `2024-05-${String(10 + i).padStart(2, '0')}`,
      });
    }
  }

  test('without page, returns the plain unpaginated shape (dashboard behavior unchanged)', async () => {
    await seedApplications();
    const res = await auth(request(app).get('/api/applications'));
    expect(res.status).toBe(200);
    expect(res.body.applications).toHaveLength(5);
    expect(res.body.total).toBeUndefined();
  });

  test('with page, returns { applications, total, page, pageSize }', async () => {
    await seedApplications();
    const res = await auth(request(app).get('/api/applications?page=1&pageSize=2'));
    expect(res.status).toBe(200);
    expect(res.body.applications).toHaveLength(2);
    expect(res.body.total).toBe(5);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(2);
  });

  test('page 2 returns the next slice, not an overlapping or empty one', async () => {
    await seedApplications();
    const page1 = await auth(request(app).get('/api/applications?page=1&pageSize=2'));
    const page2 = await auth(request(app).get('/api/applications?page=2&pageSize=2'));

    expect(page2.body.applications).toHaveLength(2);
    const page1Ids = page1.body.applications.map((a) => a.id);
    const page2Ids = page2.body.applications.map((a) => a.id);
    expect(page1Ids.some((id) => page2Ids.includes(id))).toBe(false);
  });

  test('search matches company (case-insensitive substring)', async () => {
    await seedApplications();
    const res = await auth(request(app).get('/api/applications?page=1&pageSize=20&search=syn'));
    expect(res.body.applications).toHaveLength(1);
    expect(res.body.applications[0].company).toBe('Synthesia');
  });

  test('sort=company&order=asc sorts alphabetically instead of the date_applied default', async () => {
    await seedApplications();
    const res = await auth(
      request(app).get('/api/applications?page=1&pageSize=20&sort=company&order=asc')
    );
    expect(res.body.applications.map((a) => a.company)).toEqual([
      'Amazon',
      'Monzo',
      'Palantir',
      'Synthesia',
      'Wayve',
    ]);
  });

  test('an unrecognized sort value falls back to the default rather than erroring', async () => {
    await seedApplications();
    const res = await auth(request(app).get('/api/applications?page=1&pageSize=20&sort=nope'));
    expect(res.status).toBe(200);
    expect(res.body.applications).toHaveLength(5);
  });
});

describe('GET /api/applications/:id', () => {
  test('returns 404 for another user\'s application', async () => {
    const created = await auth(request(app).post('/api/applications'))
      .send({ company: 'Monzo', role: 'SWE' });
    const id = created.body.application.id;

    const otherToken = await makeUserToken('other@example.com');
    const res = await request(app)
      .get(`/api/applications/${id}`)
      .set('Authorization', `Bearer ${otherToken}`);

    // 404, not 403: I don't reveal that someone else's row exists.
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/applications/:id', () => {
  test('updates the status without wiping other fields', async () => {
    const created = await auth(request(app).post('/api/applications'))
      .send({ company: 'Monzo', role: 'SWE' });
    const id = created.body.application.id;

    const res = await auth(request(app).put(`/api/applications/${id}`))
      .send({ status: 'interviewing' });

    expect(res.status).toBe(200);
    expect(res.body.application.status).toBe('interviewing');
    expect(res.body.application.company).toBe('Monzo'); // partial update kept this
  });

  test('returns 404 when updating a non-existent application', async () => {
    const res = await auth(request(app).put('/api/applications/99999'))
      .send({ status: 'offer' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/applications/:id', () => {
  test('deletes an application, after which it is gone', async () => {
    const created = await auth(request(app).post('/api/applications'))
      .send({ company: 'Monzo', role: 'SWE' });
    const id = created.body.application.id;

    const del = await auth(request(app).delete(`/api/applications/${id}`));
    expect(del.status).toBe(204);

    const get = await auth(request(app).get(`/api/applications/${id}`));
    expect(get.status).toBe(404);
  });
});
