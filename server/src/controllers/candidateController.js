const candidateModel = require('../models/candidateModel');
const applicationModel = require('../models/applicationModel');
const { validateApplication } = require('../utils/validation');

// GET /api/candidates -> the review queue: pending items for this user only.
async function list(req, res, next) {
  try {
    const candidates = await candidateModel.findPendingCandidates(req.user.id);
    return res.json({ candidates });
  } catch (err) {
    next(err);
  }
}

// POST /api/candidates/:id/accept
//
// Body fields are all optional overrides -- this is how "edit-then-approve"
// works (per docs/PHASE2.md): the client can send a corrected company/role/
// status/date_applied and I merge it over whatever the LLM extracted, then
// validate the MERGED result with the same validator /api/applications uses.
// A low-confidence extraction (e.g. a null role, which happens for real --
// see candidate #1 from testing) simply can't be accepted as-is; the API
// returns the same 400 shape the create-application form already handles,
// so the client can prompt for the missing field rather than silently
// writing an incomplete row.
async function accept(req, res, next) {
  try {
    const candidate = await candidateModel.findPendingCandidateById(req.user.id, req.params.id);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const data = {
      company: req.body.company ?? candidate.company,
      role: req.body.role ?? candidate.role,
      status: req.body.status ?? candidate.status ?? 'applied',
      // No email date is stored on the candidate row -- created_at (when the
      // sync detected it) is the closest thing I have unless the user
      // overrides it. dateStrings:true on the pool means this is already a
      // "YYYY-MM-DD HH:MM:SS" string, not a Date object.
      date_applied: req.body.date_applied ?? String(candidate.created_at).slice(0, 10),
      job_description: null,
      notes: `Imported from Gmail (confidence ${candidate.confidence})`,
      source: 'email',
    };

    const errors = validateApplication(data, { partial: false });
    if (errors.length) {
      return res.status(400).json({ errors });
    }

    // Reconciliation (advancing candidate.matched_application_id instead of
    // creating a new application) isn't built yet -- every accept creates a
    // new application for now.
    const application = await applicationModel.createApplication(req.user.id, data);
    await candidateModel.updateCandidateState(req.user.id, req.params.id, 'accepted');

    return res.status(201).json({ application });
  } catch (err) {
    next(err);
  }
}

// POST /api/candidates/:id/dismiss -> mark rejected, never resurface it.
async function dismiss(req, res, next) {
  try {
    const candidate = await candidateModel.findPendingCandidateById(req.user.id, req.params.id);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    await candidateModel.updateCandidateState(req.user.id, req.params.id, 'dismissed');
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, accept, dismiss };
