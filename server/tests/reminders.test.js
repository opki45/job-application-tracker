const request = require('supertest');
const app = require('../src/app');
const { resetDatabase, pool } = require('./helpers');

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

const auth = (req) => req.set('Authorization', `Bearer ${token}`);

describe('Reminders require authentication', () => {
  test.each([
    ['get', '/api/reminders'],
    ['post', '/api/reminders'],
    ['put', '/api/reminders/1'],
    ['delete', '/api/reminders/1'],
  ])('%s %s returns 401 without a token', async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/reminders', () => {
  test('creates a standalone reminder (no linked application)', async () => {
    const res = await auth(request(app).post('/api/reminders')).send({
      title: 'Follow up with recruiter',
      due_date: '2026-09-01',
    });

    expect(res.status).toBe(201);
    expect(res.body.reminder).toMatchObject({
      title: 'Follow up with recruiter',
      due_date: '2026-09-01',
      done: 0,
      application_id: null,
    });
  });

  test('creates a reminder linked to one of my own applications', async () => {
    const app1 = await auth(request(app).post('/api/applications')).send({
      company: 'Monzo',
      role: 'Graduate Engineer',
    });

    const res = await auth(request(app).post('/api/reminders')).send({
      title: 'Follow up on Monzo',
      due_date: '2026-09-01',
      application_id: app1.body.application.id,
    });

    expect(res.status).toBe(201);
    expect(res.body.reminder.application_id).toBe(app1.body.application.id);
    expect(res.body.reminder.application_company).toBe('Monzo');
  });

  test('404s when linked to another user\'s application (not a leaked 400/403)', async () => {
    const otherToken = await makeUserToken('other@example.com');
    const otherApp = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ company: 'Amazon', role: 'SDE' });

    const res = await auth(request(app).post('/api/reminders')).send({
      title: 'Follow up',
      due_date: '2026-09-01',
      application_id: otherApp.body.application.id,
    });

    expect(res.status).toBe(404);
  });

  test('400s without a title', async () => {
    const res = await auth(request(app).post('/api/reminders')).send({ due_date: '2026-09-01' });
    expect(res.status).toBe(400);
  });

  test('400s on a malformed due_date', async () => {
    const res = await auth(request(app).post('/api/reminders')).send({
      title: 'Follow up',
      due_date: 'next tuesday',
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/reminders', () => {
  test('lists only my own reminders, not-done first then soonest due', async () => {
    const otherToken = await makeUserToken('other@example.com');
    await request(app)
      .post('/api/reminders')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'Not mine', due_date: '2026-09-01' });

    await auth(request(app).post('/api/reminders')).send({ title: 'Later', due_date: '2026-09-10' });
    await auth(request(app).post('/api/reminders')).send({ title: 'Sooner', due_date: '2026-09-05' });

    const res = await auth(request(app).get('/api/reminders'));
    expect(res.status).toBe(200);
    expect(res.body.reminders).toHaveLength(2);
    expect(res.body.reminders.map((r) => r.title)).toEqual(['Sooner', 'Later']);
  });
});

describe('PUT /api/reminders/:id', () => {
  test('toggling done is a valid partial update', async () => {
    const created = await auth(request(app).post('/api/reminders')).send({
      title: 'Follow up',
      due_date: '2026-09-01',
    });

    const res = await auth(request(app).put(`/api/reminders/${created.body.reminder.id}`)).send({
      done: true,
    });

    expect(res.status).toBe(200);
    expect(res.body.reminder.done).toBe(1);
    expect(res.body.reminder.title).toBe('Follow up'); // untouched
  });

  test('404s for another user\'s reminder', async () => {
    const created = await auth(request(app).post('/api/reminders')).send({
      title: 'Follow up',
      due_date: '2026-09-01',
    });
    const otherToken = await makeUserToken('other@example.com');

    const res = await request(app)
      .put(`/api/reminders/${created.body.reminder.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ done: true });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/reminders/:id', () => {
  test('deletes my reminder', async () => {
    const created = await auth(request(app).post('/api/reminders')).send({
      title: 'Follow up',
      due_date: '2026-09-01',
    });

    const res = await auth(request(app).delete(`/api/reminders/${created.body.reminder.id}`));
    expect(res.status).toBe(204);

    const list = await auth(request(app).get('/api/reminders'));
    expect(list.body.reminders).toHaveLength(0);
  });

  test('404s for another user\'s reminder', async () => {
    const created = await auth(request(app).post('/api/reminders')).send({
      title: 'Follow up',
      due_date: '2026-09-01',
    });
    const otherToken = await makeUserToken('other@example.com');

    const res = await request(app)
      .delete(`/api/reminders/${created.body.reminder.id}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(404);
  });
});

describe('Deleting a linked application unlinks (not deletes) the reminder', () => {
  test('reminder survives with application_id set to null', async () => {
    const application = await auth(request(app).post('/api/applications')).send({
      company: 'Monzo',
      role: 'Graduate Engineer',
    });
    const reminder = await auth(request(app).post('/api/reminders')).send({
      title: 'Follow up on Monzo',
      due_date: '2026-09-01',
      application_id: application.body.application.id,
    });

    await auth(request(app).delete(`/api/applications/${application.body.application.id}`));

    const list = await auth(request(app).get('/api/reminders'));
    expect(list.body.reminders).toHaveLength(1);
    expect(list.body.reminders[0].id).toBe(reminder.body.reminder.id);
    expect(list.body.reminders[0].application_id).toBeNull();
  });
});
