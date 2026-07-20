// I'm writing my own small validators instead of pulling in a library, so I can
// see and explain exactly what rules run. Each function returns an array of
// error messages. An empty array means the input is valid.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegister(body = {}) {
  const errors = [];

  // Email must be present and look like an email.
  if (!body.email || !EMAIL_RE.test(body.email)) {
    errors.push('A valid email is required');
  }

  // Password must be present and at least 8 characters.
  if (!body.password || String(body.password).length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  return errors;
}

// Must match the ENUM in schema.sql.
const VALID_STATUSES = ['applied', 'interviewing', 'offer', 'rejected', 'accepted'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD

// I validate an application payload. When partial is true (used for updates), I
// only check the fields that are actually present, so a partial update doesn't
// have to include every field.
function validateApplication(body = {}, { partial = false } = {}) {
  const errors = [];
  const present = (field) =>
    body[field] !== undefined && body[field] !== null && String(body[field]).trim() !== '';

  // company and role are required on create; on a partial update I only check
  // them if the caller included them.
  if (!partial || body.company !== undefined) {
    if (!present('company')) errors.push('company is required');
  }
  if (!partial || body.role !== undefined) {
    if (!present('role')) errors.push('role is required');
  }
  // status is optional (defaults to 'applied'), but if given it must be valid.
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  // date_applied is optional (defaults to today), but if given it must be a date.
  if (body.date_applied !== undefined && !DATE_RE.test(body.date_applied)) {
    errors.push('date_applied must be in YYYY-MM-DD format');
  }
  return errors;
}

module.exports = { validateRegister, validateApplication, VALID_STATUSES };
