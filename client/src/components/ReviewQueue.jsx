import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

const STATUSES = ['applied', 'interviewing', 'offer', 'rejected', 'accepted'];

// One candidate, shown as an editable form rather than static text. This is
// how "accept" and "edit-then-approve" both work through the same UI: the
// fields are always editable, pre-filled with whatever the LLM extracted (or
// blank if it couldn't tell). Accepting sends whatever's currently in the
// fields, so fixing a blank role before hitting Accept IS the edit flow --
// there's no separate edit mode.
//
// A candidate reconciled against an application the user already has
// (candidate.matched_application_id is set) gets a different, simpler form:
// company/role already matched, so there's nothing to edit there -- only the
// proposed status can move, and accepting advances the existing application
// instead of creating a new one.
function CandidateRow({ candidate, onAccept, onDismiss }) {
  const isStatusUpdate = candidate.matched_application_id != null;
  const [company, setCompany] = useState(candidate.company || '');
  const [role, setRole] = useState(candidate.role || '');
  const [status, setStatus] = useState(candidate.status || 'applied');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleAccept(e) {
    e.preventDefault();
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
    <li className="candidate-row">
      {isStatusUpdate && (
        <p className="candidate-update-note">
          Status update for <strong>{candidate.company}</strong> — {candidate.role}
        </p>
      )}
      <form className="candidate-form" onSubmit={handleAccept}>
        {!isStatusUpdate && (
          <>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company"
              required
            />
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Role"
              required
            />
          </>
        )}
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="candidate-confidence" title="How confident the LLM was in this extraction">
          {Math.round(candidate.confidence * 100)}% confidence
        </span>
        <button type="submit" className="btn-primary" disabled={busy}>
          Accept
        </button>
        <button type="button" className="btn-ghost" onClick={handleDismiss} disabled={busy}>
          Dismiss
        </button>
      </form>
      {error && <span className="error">{error}</span>}
    </li>
  );
}

// The Gmail review queue. Sits between the sync pipeline and applications --
// nothing here is written to applications until the user hits Accept.
function ReviewQueue({ onApplicationCreated }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/candidates');
      setCandidates(data.candidates);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSync() {
    setError('');
    setSyncing(true);
    try {
      await api.post('/sync/gmail');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  async function handleAccept(id, overrides) {
    await api.post(`/candidates/${id}/accept`, overrides);
    setCandidates((prev) => prev.filter((c) => c.id !== id));
    onApplicationCreated?.();
  }

  async function handleDismiss(id) {
    await api.post(`/candidates/${id}/dismiss`);
    setCandidates((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading) return null;

  return (
    <div className="review-queue">
      <div className="review-queue-head">
        <h2>Review queue{candidates.length > 0 ? ` (${candidates.length})` : ''}</h2>
        <button className="btn-ghost" onClick={handleSync} disabled={syncing}>
          {syncing ? 'Syncing...' : 'Sync Gmail now'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {candidates.length === 0 ? (
        <p className="muted">No candidates waiting for review.</p>
      ) : (
        <ul className="candidate-list">
          {candidates.map((c) => (
            <CandidateRow key={c.id} candidate={c} onAccept={handleAccept} onDismiss={handleDismiss} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default ReviewQueue;
