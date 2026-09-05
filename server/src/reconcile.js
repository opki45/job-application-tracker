// Reconciliation: deciding whether a job-related extraction is a brand new
// application or a status update on one the user already has. Pure logic,
// no SQL/HTTP here -- syncController calls this once it has both the
// extraction and the user's current applications loaded.

// Status may only move FORWARD: applied < interviewing < offer/rejected <
// accepted. offer and rejected sit at the SAME rank on purpose -- they're
// both "the company decided" outcomes after interviewing, and one must never
// silently overwrite the other through reconciliation (a declined offer
// still needs a human to update it, not an automatic flip to "rejected").
const STATUS_ORDER = { applied: 0, interviewing: 1, offer: 2, rejected: 2, accepted: 3 };

// Lowercase, trim, collapse whitespace, drop punctuation. Deliberately
// simple -- this only has to be good enough to catch the common case ("Monzo"
// vs "Monzo "), not survive genuinely different company-name spellings. A
// wrong match just proposes a candidate a human can dismiss; it never writes
// anywhere on its own.
function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

// Finds an existing application (or pending candidate -- same shape, see
// syncController.js) with the same normalized company AND role. Returns null
// (rather than guessing) if company is missing -- there's nothing to match
// against at all.
//
// When role IS present, it must match exactly (normalized) -- I never want
// to silently fold "Software Engineer" and "Data Engineer" at the same
// company into one row.
//
// When role is MISSING on this extraction (common on short status-update
// emails like an interview invite that never restates the job title), I fall
// back to company alone -- but only when there's exactly ONE existing
// entry at that company. Real users apply to more than one role at the same
// company (this app's own dogfood data has three at once), so with more
// than one candidate I refuse to guess which one a roleless update is about
// rather than risk silently updating the wrong one.
function findMatchingApplication(applications, { company, role }) {
  const normCompany = normalize(company);
  if (!normCompany) return null;

  const sameCompany = applications.filter((app) => normalize(app.company) === normCompany);

  const normRole = normalize(role);
  if (normRole) {
    return sameCompany.find((app) => normalize(app.role) === normRole) || null;
  }
  return sameCompany.length === 1 ? sameCompany[0] : null;
}

// True only if newStatus is strictly later than currentStatus in the order
// above. An unrecognized/missing status never counts as forward.
function isForwardMove(currentStatus, newStatus) {
  if (!newStatus || !(newStatus in STATUS_ORDER)) return false;
  const current = STATUS_ORDER[currentStatus] ?? -1;
  return STATUS_ORDER[newStatus] > current;
}

module.exports = { normalize, findMatchingApplication, isForwardMove, STATUS_ORDER };
