const reminderModel = require('../models/reminderModel');
const applicationModel = require('../models/applicationModel');
const { validateReminder } = require('../utils/validation');

// If a reminder names a specific application, that application has to
// actually belong to this user -- otherwise a client could probe another
// user's application ids by watching which ones 201/404 here. Returns an
// error-response object to send, or null if the check passed (no
// application_id given, or it's valid).
async function checkApplicationOwnership(userId, applicationId) {
  if (!applicationId) return null;
  const app = await applicationModel.findApplicationById(userId, applicationId);
  if (!app) return { status: 404, body: { error: 'Application not found' } };
  return null;
}

// GET /api/reminders
async function list(req, res, next) {
  try {
    const reminders = await reminderModel.findReminders(req.user.id);
    return res.json({ reminders });
  } catch (err) {
    next(err);
  }
}

// POST /api/reminders
async function create(req, res, next) {
  try {
    const errors = validateReminder(req.body, { partial: false });
    if (errors.length) {
      return res.status(400).json({ errors });
    }

    const ownershipError = await checkApplicationOwnership(req.user.id, req.body.application_id);
    if (ownershipError) {
      return res.status(ownershipError.status).json(ownershipError.body);
    }

    const reminder = await reminderModel.createReminder(req.user.id, {
      title: req.body.title,
      due_date: req.body.due_date,
      application_id: req.body.application_id ?? null,
    });
    return res.status(201).json({ reminder });
  } catch (err) {
    next(err);
  }
}

// PUT /api/reminders/:id (partial updates allowed -- e.g. just { done: true })
async function update(req, res, next) {
  try {
    const errors = validateReminder(req.body, { partial: true });
    if (errors.length) {
      return res.status(400).json({ errors });
    }

    const existing = await reminderModel.findReminderById(req.user.id, req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    const ownershipError = await checkApplicationOwnership(req.user.id, req.body.application_id);
    if (ownershipError) {
      return res.status(ownershipError.status).json(ownershipError.body);
    }

    const reminder = await reminderModel.updateReminder(req.user.id, req.params.id, req.body);
    return res.json({ reminder });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/reminders/:id
async function remove(req, res, next) {
  try {
    const deleted = await reminderModel.deleteReminder(req.user.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Reminder not found' });
    }
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
