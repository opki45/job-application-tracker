import { useState, useEffect, useRef } from 'react';
import CompanyLogo from './CompanyLogo';
import { NoteIcon, DotsHorizontalIcon, GmailIcon } from './icons';

const STATUSES = ['applied', 'interviewing', 'offer', 'rejected', 'accepted'];

// app.date_applied is a "YYYY-MM-DD" string (dateStrings:true on the pool).
// I build the Date from its parts rather than `new Date(dateString)` --
// the latter parses as UTC midnight, which can display as the PREVIOUS day
// once toLocaleDateString renders it in a timezone behind UTC.
function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// One row in the applications table (plus a second, conditional row directly
// below it holding the notes editor when expanded -- a <tr> is the only way
// to span all columns inside a <table>, so the drawer is a sibling row, not
// a nested block). Receives the application (`app`) and callbacks to change
// status, delete, and save notes.
function ApplicationItem({ app, onStatusChange, onDelete, onSaveNotes }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(app.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [saved, setSaved] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const hasNotes = (app.notes || '').trim().length > 0;

  // Close the actions menu on an outside click, same as any dropdown.
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

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
    <>
      <tr className={`row-${app.status}`}>
        <td>
          <div className="table-company">
            <CompanyLogo company={app.company} />
            <div>
              <div className="company">{app.company}</div>
              <div className="role">{app.role}</div>
            </div>
          </div>
        </td>
        <td className="table-date">{formatDate(app.date_applied)}</td>
        <td>
          <button
            className={`notes-btn${hasNotes ? ' has-notes' : ''}`}
            onClick={() => setExpanded((v) => !v)}
            aria-label={hasNotes ? 'View notes' : 'Add notes'}
            title={hasNotes ? 'View notes' : 'Add notes'}
          >
            <NoteIcon />
          </button>
        </td>
        <td>
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
        </td>
        <td>
          <span className="table-source">
            {app.source === 'email' ? (
              <>
                <GmailIcon /> Gmail
              </>
            ) : (
              'Manual'
            )}
          </span>
        </td>
        <td className="table-actions" ref={menuRef}>
          <button
            className="btn-icon"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Row actions"
          >
            <DotsHorizontalIcon />
          </button>
          {menuOpen && (
            <div className="actions-menu">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(app.id);
                }}
              >
                Delete
              </button>
            </div>
          )}
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={6} style={{ padding: 0 }}>
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
          </td>
        </tr>
      )}
    </>
  );
}

export default ApplicationItem;
