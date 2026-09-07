const userModel = require('./models/userModel');
const applicationModel = require('./models/applicationModel');
const candidateModel = require('./models/candidateModel');
const reminderModel = require('./models/reminderModel');
const processedEmailModel = require('./models/processedEmailModel');
const oauthAccountModel = require('./models/oauthAccountModel');

// The one shared account every "View Demo" visitor lands in. Fixed and
// well-known on purpose -- there's nothing secret about it, and every place
// that needs to recognize "is this the demo account" (here, and
// integrationController's Gmail-connect block) compares against this same
// constant rather than a magic id.
const DEMO_EMAIL = 'demo@landed.app';

function isDemoEmail(email) {
  return email === DEMO_EMAIL;
}

// Idempotent: the first ever demo login on a fresh database creates this
// user; every one after that just finds it. No separate setup script to
// remember to run.
async function findOrCreateDemoUser() {
  const existing = await userModel.findUserByEmail(DEMO_EMAIL);
  if (existing) return existing.id;
  // password_hash stays null, same as a Google-only account -- nothing ever
  // logs into this account with a password, only demoLogin() (see
  // authController.js), which doesn't check one.
  const created = await userModel.createUser({ email: DEMO_EMAIL, passwordHash: null });
  return created.id;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function daysFromNow(n) {
  return daysAgo(-n);
}

// A curated spread: different statuses (including one rejected, one offer,
// one accepted -- the full lifecycle, not just a wall of "applied"), a mix
// of manual and email-sourced rows, and dates computed relative to today so
// the demo never looks frozen in the past.
const SEED_APPLICATIONS = [
  { company: 'Notion', role: 'Software Engineer, New Grad', status: 'interviewing', daysAgo: 12, source: 'email' },
  { company: 'Figma', role: 'Frontend Engineer', status: 'applied', daysAgo: 5, source: 'manual' },
  { company: 'Linear', role: 'Backend Engineer', status: 'offer', daysAgo: 21, source: 'email' },
  { company: 'Stripe', role: 'Software Engineer, New Grad', status: 'rejected', daysAgo: 30, source: 'email' },
  { company: 'Anthropic', role: 'AI Engineer, New Grad', status: 'applied', daysAgo: 3, source: 'manual' },
  { company: 'Vercel', role: 'Full Stack Engineer', status: 'accepted', daysAgo: 40, source: 'email' },
];

// Sitting in the review queue so a visitor can try Accept/Dismiss straight
// away, without ever needing a real Gmail connection. One deliberately has
// role: null -- an honest look at what the extraction pipeline actually
// produces sometimes (see extractApplication.js's prompt), not a
// too-perfect strawman.
const SEED_CANDIDATES = [
  { company: 'Airbnb', role: 'Software Engineer Intern', status: 'applied', confidence: 0.95, daysAgo: 1 },
  { company: 'Discord', role: 'Backend Engineer', status: 'interviewing', confidence: 0.88, daysAgo: 2 },
  { company: 'Shopify', role: null, status: 'interviewing', confidence: 0.72, daysAgo: 1 },
];

const SEED_REMINDERS = [
  { title: 'Follow up with Linear recruiter', dueInDays: 3 },
  { title: 'Prepare for Notion technical interview', dueInDays: 5 },
];

// Wipes and reseeds the demo account's data so every visitor sees the same
// curated state, no matter what a previous visitor clicked around and
// changed. Every delete/create goes through the normal per-user-scoped
// model functions -- this can never touch a real user's data, and no SQL
// is written here (see CLAUDE.md: models/ is the only place that happens).
async function resetDemoData(userId) {
  await candidateModel.deleteAllForUser(userId);
  await applicationModel.deleteAllForUser(userId);
  await reminderModel.deleteAllForUser(userId);
  await processedEmailModel.deleteAllForUser(userId);
  // Just in case a row ever existed -- Gmail connect is blocked for this
  // account (see integrationController.js), but a reset should still leave
  // nothing behind either way.
  await oauthAccountModel.deleteAccount(userId, 'google');

  for (const app of SEED_APPLICATIONS) {
    await applicationModel.createApplication(userId, {
      company: app.company,
      role: app.role,
      status: app.status,
      date_applied: daysAgo(app.daysAgo),
      source: app.source,
    });
  }

  for (const c of SEED_CANDIDATES) {
    await candidateModel.createCandidate(userId, {
      sourceMessageId: `demo-${c.company.toLowerCase()}`,
      company: c.company,
      role: c.role,
      status: c.status,
      confidence: c.confidence,
      emailDate: daysAgo(c.daysAgo),
    });
  }

  for (const r of SEED_REMINDERS) {
    await reminderModel.createReminder(userId, {
      title: r.title,
      due_date: daysFromNow(r.dueInDays),
    });
  }
}

module.exports = { DEMO_EMAIL, isDemoEmail, findOrCreateDemoUser, resetDemoData };
