const applicationModel = require('../models/applicationModel');
const { validateApplication } = require('../utils/validation');

// Every handler reads the user id from req.user.id, which the authenticate
// middleware set from the verified token. The client never tells me who it is —
// I take it from the token — so a user can only ever act as themselves.

// GET /api/applications            -> list all (dashboard)
// GET /api/applications?status=x   -> list filtered by status
async function list(req, res, next) {
  try {
    const { status } = req.query;
    const applications = await applicationModel.findApplications(req.user.id, { status });
    return res.json({ applications });
  } catch (err) {
    next(err);
  }
}

// GET /api/applications/:id
async function getOne(req, res, next) {
  try {
    const application = await applicationModel.findApplicationById(req.user.id, req.params.id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    return res.json({ application });
  } catch (err) {
    next(err);
  }
}

// POST /api/applications
async function create(req, res, next) {
  try {
    const errors = validateApplication(req.body, { partial: false });
    if (errors.length) {
      return res.status(400).json({ errors });
    }

    const data = {
      company: req.body.company,
      role: req.body.role,
      status: req.body.status || 'applied',
      // Default to today's date (YYYY-MM-DD) if none was given.
      date_applied: req.body.date_applied || new Date().toISOString().slice(0, 10),
      job_description: req.body.job_description ?? null,
      notes: req.body.notes ?? null,
    };

    const application = await applicationModel.createApplication(req.user.id, data);
    return res.status(201).json({ application });
  } catch (err) {
    next(err);
  }
}

// PUT /api/applications/:id  (partial updates allowed)
async function update(req, res, next) {
  try {
    const errors = validateApplication(req.body, { partial: true });
    if (errors.length) {
      return res.status(400).json({ errors });
    }

    // Confirm the row exists AND belongs to this user before updating, so I can
    // return a clean 404 instead of silently doing nothing.
    const existing = await applicationModel.findApplicationById(req.user.id, req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const application = await applicationModel.updateApplication(
      req.user.id,
      req.params.id,
      req.body
    );
    return res.json({ application });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/applications/:id
async function remove(req, res, next) {
  try {
    const deleted = await applicationModel.deleteApplication(req.user.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Application not found' });
    }
    return res.status(204).send(); // 204 No Content: success, nothing to return.
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove };
