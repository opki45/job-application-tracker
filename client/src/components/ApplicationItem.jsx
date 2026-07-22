import { useState } from 'react';

const STATUSES = ['applied', 'interviewing', 'offer', 'rejected', 'accepted'];

// One row. Receives the application (`app`) and callbacks to change status,
// delete, and save notes. Holds a little local UI state: whether the company
// logo failed to load, whether the notes drawer is open, and the notes text.
function ApplicationItem({ app, onStatusChange, onDelete, onSaveNotes }) {
  const [logoError, setLogoError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(app.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [saved, setSaved] = useState(false);

  const initial = app.company.charAt(0).toUpperCase();
  // Guess the company's domain from its name and fetch its favicon from Google.
  // Reliable and free; for known companies it returns the real brand icon. If
  // the request ever fails, onError falls back to the coloured initial.
  const domain = app.company.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
  const logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  const hasNotes = (app.notes || '').trim().length > 0;

  async function handleSaveNotes() {
    setSavingNotes(true);
    setSaved(false);
    try {
      await onSaveNotes(app.id, notes);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSavingNotes(false);
    }
  }

  return (
    <li className={`app-item row-${app.status}`}>
      <div className="app-row">
        <div className={`avatar${logoError ? '' : ' has-logo'}`}>
          {logoError ? (
            initial
          ) : (
            <img src={logoUrl} alt="" onError={() => setLogoError(true)} />
          )}
        </div>

        <div className="app-main">
          <div className="company">{app.company}</div>
          <div className="role">{app.role}</div>
        </div>

        <div className="app-spacer" />

        <div className="app-meta">
          <span className="app-date">applied {app.date_applied}</span>

          <button
            className={`notes-btn${hasNotes ? ' has-notes' : ''}`}
            onClick={() => setExpanded((v) => !v)}
          >
            {hasNotes ? '📝 Notes' : 'Notes'}
          </button>

          <select
            className={`status-select status-${app.status}`}
            value={app.status}
            onChange={(e) => onStatusChange(app.id, e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <button
            className="btn-icon"
            onClick={() => onDelete(app.id)}
            title="Delete application"
            aria-label="Delete application"
          >
            ✕
          </button>
        </div>
      </div>

      {expanded && (
        <div className="app-notes">
          <textarea
            placeholder="Add notes — recruiter name, next steps, interview dates..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="notes-actions">
            <button
              className="btn-primary btn-sm"
              onClick={handleSaveNotes}
              disabled={savingNotes}
            >
              {savingNotes ? 'Saving...' : 'Save notes'}
            </button>
            {saved && <span className="notes-saved">Saved ✓</span>}
          </div>
        </div>
      )}
    </li>
  );
}

export default ApplicationItem;
