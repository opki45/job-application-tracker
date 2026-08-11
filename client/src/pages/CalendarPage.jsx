import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import CompanyLogo from '../components/CompanyLogo';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Builds a "YYYY-MM-DD" key from plain integer parts -- deliberately not
// via a Date object's toISOString(), which is UTC-based and can shift the
// day depending on the browser's local timezone. Matches the plain date
// strings the API already returns (dateStrings:true on the server's pool).
function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Month view of every application, plotted on its date_applied and
// colour-coded by status -- click a day to see what's on it. No new
// backend: this is all derived from GET /api/applications, same data the
// dashboard and Applications page already use.
function CalendarPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    api
      .get('/applications')
      .then((data) => setApplications(data.applications))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const byDate = useMemo(() => {
    const map = {};
    for (const app of applications) {
      (map[app.date_applied] ||= []).push(app);
    }
    return map;
  }, [applications]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed
  const today = new Date();
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const selectedApps = selectedDate ? byDate[selectedDate] || [] : [];

  return (
    <>
      <div className="panel-card">
        {loading && <p className="muted">Loading...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <>
            <div className="calendar-header">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setViewDate(new Date(year, month - 1, 1))}
              >
                ← Prev
              </button>
              <span className="calendar-month-label">{monthLabel}</span>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setViewDate(new Date(year, month + 1, 1))}
              >
                Next →
              </button>
            </div>

            <div className="calendar-grid">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="calendar-weekday">
                  {label}
                </div>
              ))}
              {cells.map((day, i) => {
                if (day === null) return <div key={i} className="calendar-cell calendar-cell-empty" />;
                const key = dateKey(year, month, day);
                const dayApps = byDate[key] || [];
                return (
                  <button
                    key={i}
                    type="button"
                    className={`calendar-cell${key === selectedDate ? ' selected' : ''}${key === todayKey ? ' today' : ''}`}
                    onClick={() => setSelectedDate(key === selectedDate ? null : key)}
                  >
                    <span className="calendar-day-num">{day}</span>
                    {dayApps.length > 0 && (
                      <div className="calendar-dots">
                        {dayApps.slice(0, 3).map((a) => (
                          <span key={a.id} className={`calendar-dot dot-${a.status}`} />
                        ))}
                        {dayApps.length > 3 && (
                          <span className="calendar-more">+{dayApps.length - 3}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {selectedDate && (
        <div className="panel-card">
          <div className="panel-title">
            {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
          {selectedApps.length === 0 ? (
            <p className="muted" style={{ marginTop: '0.75rem' }}>
              No applications on this day.
            </p>
          ) : (
            <ul className="calendar-day-list">
              {selectedApps.map((a) => (
                <li key={a.id} className={`calendar-day-item row-${a.status}`}>
                  <div className="table-company">
                    <CompanyLogo company={a.company} />
                    <div>
                      <div className="company">{a.company}</div>
                      <div className="role">{a.role}</div>
                    </div>
                  </div>
                  <span className={`preview-pill status-${a.status}`}>{a.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

export default CalendarPage;
