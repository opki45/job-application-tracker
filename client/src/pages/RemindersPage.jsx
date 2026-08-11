import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { BellIcon, PlusIcon, TrashIcon, CheckIcon } from '../components/icons';
import { formatDate } from '../utils/formatDate';

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function ReminderRow({ reminder, overdue, onToggle, onDelete }) {
  return (
    <li className={`reminder-row${reminder.done ? ' done' : ''}${overdue ? ' overdue' : ''}`}>
      <button
        type="button"
        className={`reminder-check${reminder.done ? ' checked' : ''}`}
        onClick={() => onToggle(reminder)}
        aria-label={reminder.done ? 'Mark not done' : 'Mark done'}
      >
        {reminder.done && <CheckIcon />}
      </button>
      <div className="reminder-info">
        <div className="reminder-title">{reminder.title}</div>
        {reminder.application_company && (
          <div className="reminder-app-link">
            {reminder.application_company}
            {reminder.application_role ? ` — ${reminder.application_role}` : ''}
          </div>
        )}
      </div>
      <span className="reminder-date">{formatDate(reminder.due_date)}</span>
      <button
        type="button"
        className="btn-icon"
        onClick={() => onDelete(reminder.id)}
        aria-label="Delete reminder"
      >
        <TrashIcon />
      </button>
    </li>
  );
}

// Full reminders CRUD: standalone or linked to a specific application.
// Not-done ones sort soonest-due-first (matches the API's own ordering);
// overdue ones (due_date before today, still open) are flagged visually.
function RemindersPage() {
  const [reminders, setReminders] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [applicationId, setApplicationId] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/reminders');
      setReminders(data.reminders);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Just for the "link to an application" dropdown -- failing silently is
    // fine here, it just means that dropdown is empty, not a broken page.
    api
      .get('/applications')
      .then((data) => setApplications(data.applications))
      .catch(() => {});
  }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    setCreating(true);
    try {
      await api.post('/reminders', {
        title,
        due_date: dueDate,
        application_id: applicationId || null,
      });
      setTitle('');
      setDueDate('');
      setApplicationId('');
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(reminder) {
    try {
      await api.put(`/reminders/${reminder.id}`, { done: !reminder.done });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this reminder?')) return;
    try {
      await api.del(`/reminders/${id}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const today = todayKey();
  const pending = reminders.filter((r) => !r.done);
  const completed = reminders.filter((r) => r.done);

  return (
    <>
      <div className="panels-row">
        <div className="panel-card">
          <div className="panel-title">New reminder</div>
          <p className="panel-subtitle">Set a follow-up nudge, optionally tied to an application.</p>
          <form className="add-app-form" onSubmit={handleCreate}>
            <div>
              <label className="field-label" htmlFor="reminder-title">
                Title
              </label>
              <input
                id="reminder-title"
                placeholder="e.g. Follow up with recruiter"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="reminder-date">
                Due date
              </label>
              <input
                id="reminder-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="reminder-app">
                Link to application (optional)
              </label>
              <select id="reminder-app" value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
                <option value="">None</option>
                {applications.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.company} — {a.role}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary btn-add-application" disabled={creating}>
              {creating ? (
                'Adding...'
              ) : (
                <>
                  Add reminder <PlusIcon />
                </>
              )}
            </button>
            {formError && <span className="error">{formError}</span>}
          </form>
        </div>

        <div className="panel-card">
          <div className="panel-title">Upcoming{pending.length > 0 ? ` (${pending.length})` : ''}</div>

          {loading && <p className="muted">Loading...</p>}
          {error && <p className="error">{error}</p>}

          {!loading && !error && pending.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">
                <BellIcon />
              </div>
              <div className="empty-state-title">No reminders yet</div>
              <p className="empty-state-sub">Add one to keep track of follow-ups.</p>
            </div>
          )}

          {!loading && pending.length > 0 && (
            <ul className="reminder-list">
              {pending.map((r) => (
                <ReminderRow
                  key={r.id}
                  reminder={r}
                  overdue={r.due_date < today}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      {completed.length > 0 && (
        <div className="panel-card">
          <div className="panel-title">Completed</div>
          <ul className="reminder-list">
            {completed.map((r) => (
              <ReminderRow key={r.id} reminder={r} overdue={false} onToggle={handleToggle} onDelete={handleDelete} />
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export default RemindersPage;
