import { useState } from 'react';
import CompanyLogo from './CompanyLogo';
import { EnvelopeOpenIcon } from './icons';

const STATUSES = ['applied', 'interviewing', 'offer', 'rejected', 'accepted'];

// One candidate, shown as an editable card. This is how "accept" and
// "edit-then-approve" both work through the same UI: fields are always
// editable, pre-filled with whatever the LLM extracted (or blank if it
// couldn't tell). Accepting sends whatever's currently in the fields, so
// fixing a blank role before hitting Accept IS the edit flow.
//
// A candidate reconciled against an application the user already has
// (candidate.matched_application_id set) gets a simpler, read-only
// company/role display -- there's nothing to edit there, only the proposed
// status can move, and accepting advances the existing application instead
// of creating a new one.
function CandidateCard({ candidate, onAccept, onDismiss }) {
  const isStatusUpdate = candidate.matched_application_id != null;
  const [company, setCompany] = useState(candidate.company || '');
  const [role, setRole] = useState(candidate.role || '');
  const [status, setStatus] = useState(candidate.status || 'applied');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleAccept() {
    setError('');
    setBusy(true);
    try {
      await onAccept(candidate.id, isStatusUpdate ? { status } : { company, role, status });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function handleDismiss() {
    setError('');
    setBusy(true);
    try {
      await onDismiss(candidate.id);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <li className={`candidate-card ${isStatusUpdate ? 'tag-update' : 'tag-new'}`}>
      <span className="candidate-tag">
        {isStatusUpdate ? 'Status update for existing application' : 'New application (AI detected)'}
      </span>

      <div className="candidate-body">
        <div className="candidate-main">
          <CompanyLogo company={candidate.company} />
          {isStatusUpdate ? (
            <div className="candidate-info">
              <b>{candidate.company}</b>
              <small>{candidate.role}</small>
            </div>
          ) : (
            <div className="candidate-info">
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company"
                aria-label="Company"
              />
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Role"
                aria-label="Role"
              />
            </div>
          )}
        </div>

        <select
          className={`status-select candidate-status-select status-${status}`}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <span className="candidate-confidence">
          {Math.round(candidate.confidence * 100)}% confidence
        </span>

        <div className="candidate-actions">
          <button type="button" className="btn-accept" onClick={handleAccept} disabled={busy}>
            Accept
          </button>
          <button type="button" className="btn-dismiss" onClick={handleDismiss} disabled={busy}>
            Dismiss
          </button>
        </div>
      </div>
      {error && <p className="error candidate-error">{error}</p>}
    </li>
  );
}

// The Gmail review queue panel. Sits between the sync pipeline and
// applications -- nothing here is written to applications until the user
// hits Accept. Fully controlled by the parent (Dashboard) so the pending
// count can also drive the sidebar badge.
function ReviewQueue({ candidates, loading, syncing, error, gmailConnected, onSync, onAccept, onDismiss }) {
  return (
    <div className="panel-card">
      <div className="panel-head-row">
        <div className="panel-head-left">
          <span className="panel-title">Review queue</span>
          <span className="count-badge">{candidates.length}</span>
        </div>
        <button type="button" className="btn-primary btn-sync" onClick={onSync} disabled={syncing}>
          {syncing ? 'Syncing...' : 'Sync Gmail now'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {!loading && candidates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <EnvelopeOpenIcon />
          </div>
          {gmailConnected ? (
            <>
              <div className="empty-state-title">Gmail connected</div>
              <p className="empty-state-sub">
                Press Sync Gmail now to scan your inbox for job application emails.
              </p>
            </>
          ) : (
            <>
              <div className="empty-state-title">No candidates waiting for review</div>
              <p className="empty-state-sub">
                Connect Gmail and we&rsquo;ll scan your inbox for job application emails.
              </p>
            </>
          )}
        </div>
      ) : (
        <ul className="candidate-list">
          {candidates.map((c) => (
            <CandidateCard key={c.id} candidate={c} onAccept={onAccept} onDismiss={onDismiss} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default ReviewQueue;
