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

// Finds an existing application with the same normalized company AND role,
// per docs/PHASE2.md. Returns null (rather than guessing) if either side of
// the extraction is missing -- an extraction with no company/role can't be
// meaningfully matched against anything.
function findMatchingApplication(applications, { company, role }) {
  const normCompany = normalize(company);
  const normRole = normalize(role);
  if (!normCompany || !normRole) return null;

  return (
    applications.find(
      (app) => normalize(app.company) === normCompany && normalize(app.role) === normRole
    ) || null
  );
}

// True only if newStatus is strictly later than currentStatus in the order
// above. An unrecognized/missing status never counts as forward.
function isForwardMove(currentStatus, newStatus) {
  if (!newStatus || !(newStatus in STATUS_ORDER)) return false;
  const current = STATUS_ORDER[currentStatus] ?? -1;
  return STATUS_ORDER[newStatus] > current;
}

module.exports = { normalize, findMatchingApplication, isForwardMove, STATUS_ORDER };
