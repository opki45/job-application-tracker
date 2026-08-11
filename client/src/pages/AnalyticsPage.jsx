import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { GmailIcon } from '../components/icons';

const STATUSES = ['applied', 'interviewing', 'offer', 'rejected', 'accepted'];
// Same hex values as the status pills/rows everywhere else in the app
// (designs/app-ui-design.png.png) -- one reserved palette, reused, not a
// fresh categorical scheme invented for this page. Validated colorblind-safe
// via the dataviz skill's validator; the contrast WARN it returned for amber/
// green against a light surface is why every bar here carries a direct
// numeric label rather than relying on color alone.
const STATUS_COLOR = {
  applied: '#3b82f6',
  interviewing: '#f59e0b',
  offer: '#10b981',
  rejected: '#ef4444',
  accepted: '#8b5cf6',
};

function monthKey(dateStr) {
  return dateStr.slice(0, 7); // "YYYY-MM-DD" -> "YYYY-MM"
}
function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

// Derived entirely from GET /api/applications -- no new backend. A status
// funnel, an applications-over-time trend, a Gmail-vs-manual split, and a
// response-rate figure.
function AnalyticsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/applications')
      .then((data) => setApplications(data.applications))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    for (const a of applications) counts[a.status] = (counts[a.status] || 0) + 1;
    return counts;
  }, [applications]);

  const maxStatusCount = Math.max(1, ...Object.values(statusCounts));

  const monthly = useMemo(() => {
    const counts = {};
    for (const a of applications) {
      const key = monthKey(a.date_applied);
      counts[key] = (counts[key] || 0) + 1;
    }
    const keys = Object.keys(counts).sort();
    // Last 6 months of activity, so a long history doesn't squeeze the bars
    // unreadably thin.
    return keys.slice(-6).map((key) => ({ key, label: monthLabel(key), count: counts[key] }));
  }, [applications]);

  const maxMonthlyCount = Math.max(1, ...monthly.map((m) => m.count));

  const sourceCounts = useMemo(() => {
    let gmail = 0;
    let manual = 0;
    for (const a of applications) {
      if (a.source === 'email') gmail += 1;
      else manual += 1;
    }
    return { gmail, manual };
  }, [applications]);

  const responseRate = useMemo(() => {
    if (applications.length === 0) return 0;
    const moved = applications.filter((a) => a.status !== 'applied').length;
    return Math.round((moved / applications.length) * 100);
  }, [applications]);

  return (
    <>
      {loading && <p className="muted">Loading...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && applications.length === 0 && (
        <div className="panel-card">
          <p className="muted" style={{ textAlign: 'center', padding: '2rem 0' }}>
            Add some applications to see analytics here.
          </p>
        </div>
      )}

      {!loading && !error && applications.length > 0 && (
        <>
          <div className="stats-grid analytics-summary-grid">
            <div className="stat-card">
              <span className="stat-label">Total applications</span>
              <div className="stat-value">{applications.length}</div>
            </div>
            <div className="stat-card">
              <span className="stat-label">Response rate</span>
              <div className="stat-value">{responseRate}%</div>
              <div className="stat-card-sub">moved past &ldquo;applied&rdquo;</div>
            </div>
            <div className="stat-card">
              <span className="stat-label">From Gmail</span>
              <div className="stat-value">
                {applications.length > 0
                  ? Math.round((sourceCounts.gmail / applications.length) * 100)
                  : 0}
                %
              </div>
              <div className="stat-card-sub">
                {sourceCounts.gmail} auto-imported, {sourceCounts.manual} manual
              </div>
            </div>
          </div>

          <div className="panels-row analytics-charts-row">
            <div className="panel-card">
              <div className="panel-title">Status funnel</div>
              <p className="panel-subtitle">Where applications stand right now.</p>
              <div className="funnel-chart">
                {STATUSES.map((status) => {
                  const count = statusCounts[status];
                  const widthPct = (count / maxStatusCount) * 100;
                  return (
                    <div key={status} className="funnel-row">
                      <span className="funnel-row-label">{status}</span>
                      <div className="funnel-track">
                        <div
                          className="funnel-fill"
                          style={{ width: `${widthPct}%`, background: STATUS_COLOR[status] }}
                        />
                      </div>
                      <span className="funnel-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="panel-card">
              <div className="panel-title">Applications over time</div>
              <p className="panel-subtitle">Last {monthly.length || 0} active months.</p>
              {monthly.length === 0 ? (
                <p className="muted">Not enough data yet.</p>
              ) : (
                <div className="trend-chart">
                  {monthly.map((m) => (
                    <div key={m.key} className="trend-bar-col" title={`${m.label}: ${m.count}`}>
                      <span className="trend-bar-count">{m.count}</span>
                      <div
                        className="trend-bar"
                        style={{ height: `${(m.count / maxMonthlyCount) * 100}%` }}
                      />
                      <span className="trend-bar-label">{m.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="panel-card">
            <div className="panel-title">Source</div>
            <p className="panel-subtitle">Manually added vs. auto-imported from Gmail.</p>
            <div className="source-bars">
              <div className="source-bar-row">
                <span className="source-bar-label">
                  <GmailIcon /> Gmail
                </span>
                <div className="funnel-track">
                  <div
                    className="funnel-fill"
                    style={{
                      width: `${applications.length ? (sourceCounts.gmail / applications.length) * 100 : 0}%`,
                      background: 'var(--primary)',
                    }}
                  />
                </div>
                <span className="funnel-count">{sourceCounts.gmail}</span>
              </div>
              <div className="source-bar-row">
                <span className="source-bar-label">Manual</span>
                <div className="funnel-track">
                  <div
                    className="funnel-fill"
                    style={{
                      width: `${applications.length ? (sourceCounts.manual / applications.length) * 100 : 0}%`,
                      background: 'var(--faint)',
                    }}
                  />
                </div>
                <span className="funnel-count">{sourceCounts.manual}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default AnalyticsPage;
