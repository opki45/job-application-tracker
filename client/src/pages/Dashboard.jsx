import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import Logo from '../components/Logo';
import ApplicationItem from '../components/ApplicationItem';
import GmailConnect from '../components/GmailConnect';
import ReviewQueue from '../components/ReviewQueue';
import Sidebar from '../components/Sidebar';
import {
  UserCircleIcon,
  ChevronDownIcon,
  LogoutIcon,
  FolderIcon,
  PaperPlaneIcon,
  PeopleIcon,
  BadgeCheckIcon,
  PlusIcon,
  FolderOpenIcon,
} from '../components/icons';

const STATUSES = ['applied', 'interviewing', 'offer', 'rejected', 'accepted'];

// Static decorative squiggles for the stat cards -- there's no historical
// time-series behind these (the API only ever returns current counts), so
// this is the same kind of "shape of a trend" flourish the login page's
// product preview uses, not a real chart.
const SPARK_POINTS = ['0,14 12,10 24,13 36,5 48,8 60,2', '0,10 12,13 24,7 36,11 48,4 60,9'];

function Dashboard() {
  const { user, logout } = useAuth();

  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState(''); // '' = all
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create-form state.
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const companyInputRef = useRef(null);

  // Review queue state lives here (not inside ReviewQueue) so the pending
  // count can also drive the sidebar badge, matching the reference design.
  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [candidatesError, setCandidatesError] = useState('');

  // Gmail connection status also lives here (not inside GmailConnect) so
  // ReviewQueue's empty state can tell "not connected yet" apart from
  // "connected, just nothing pending" -- two different messages.
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailStatusLoading, setGmailStatusLoading] = useState(true);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/applications');
      setApplications(data.applications);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCandidates = useCallback(async () => {
    setCandidatesLoading(true);
    try {
      const data = await api.get('/candidates');
      setCandidates(data.candidates);
    } catch (err) {
      setCandidatesError(err.message);
    } finally {
      setCandidatesLoading(false);
    }
  }, []);

  const loadGmailStatus = useCallback(async () => {
    try {
      const data = await api.get('/integrations/gmail/status');
      setGmailConnected(data.connected);
    } catch {
      // GmailConnect's own connect/disconnect actions surface their own
      // errors; this is just a read of current status, so I leave it at
      // its last known value rather than adding a second error UI for it.
    } finally {
      setGmailStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
    loadCandidates();
    loadGmailStatus();
  }, [loadApplications, loadCandidates, loadGmailStatus]);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    setCreating(true);
    try {
      await api.post('/applications', { company, role });
      setCompany('');
      setRole('');
      await loadApplications();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(id, status) {
    try {
      await api.put(`/applications/${id}`, { status });
      await loadApplications();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this application?')) return;
    try {
      await api.del(`/applications/${id}`);
      await loadApplications();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaveNotes(id, notes) {
    await api.put(`/applications/${id}`, { notes });
    await loadApplications();
  }

  async function handleSyncGmail() {
    setCandidatesError('');
    setSyncing(true);
    try {
      await api.post('/sync/gmail');
      await loadCandidates();
    } catch (err) {
      setCandidatesError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  async function handleAcceptCandidate(id, overrides) {
    await api.post(`/candidates/${id}/accept`, overrides);
    setCandidates((prev) => prev.filter((c) => c.id !== id));
    await loadApplications();
  }

  async function handleDismissCandidate(id) {
    await api.post(`/candidates/${id}/dismiss`);
    setCandidates((prev) => prev.filter((c) => c.id !== id));
  }

  function focusAddApplicationForm() {
    companyInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    companyInputRef.current?.focus();
  }

  // Derived data (computed on each render from state — no extra state needed).
  const counts = applications.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});
  const visible = statusFilter
    ? applications.filter((a) => a.status === statusFilter)
    : applications;

  return (
    <div>
      <header className="topbar">
        <Logo />
        <div className="topbar-right">
          <GmailConnect
            connected={gmailConnected}
            loading={gmailStatusLoading}
            onConnectedChange={setGmailConnected}
          />
          <div className="topbar-user">
            <UserCircleIcon />
            {user.email}
            <ChevronDownIcon />
          </div>
          <button className="btn-logout" onClick={logout}>
            <LogoutIcon /> Logout
          </button>
        </div>
      </header>

      <div className="app-body">
        <Sidebar
          reviewQueueCount={candidates.length}
          hasActivity={applications.length > 0 || candidates.length > 0}
        />

        <main className="main-content">
          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card stat-total">
              <div className="stat-card-head">
                <span className="stat-label">Total</span>
                <span className="stat-icon-badge">
                  <FolderIcon />
                </span>
              </div>
              <div className="stat-value">{applications.length}</div>
              <svg className="stat-spark" viewBox="0 0 60 18" preserveAspectRatio="none" aria-hidden="true">
                <polyline points={SPARK_POINTS[0]} />
              </svg>
            </div>
            <div className="stat-card stat-applied">
              <div className="stat-card-head">
                <span className="stat-label">Applied</span>
                <span className="stat-icon-badge">
                  <PaperPlaneIcon />
                </span>
              </div>
              <div className="stat-value">{counts.applied || 0}</div>
              <svg className="stat-spark" viewBox="0 0 60 18" preserveAspectRatio="none" aria-hidden="true">
                <polyline points={SPARK_POINTS[1]} />
              </svg>
            </div>
            <div className="stat-card stat-interviewing">
              <div className="stat-card-head">
                <span className="stat-label">Interviewing</span>
                <span className="stat-icon-badge">
                  <PeopleIcon />
                </span>
              </div>
              <div className="stat-value">{counts.interviewing || 0}</div>
              <svg className="stat-spark" viewBox="0 0 60 18" preserveAspectRatio="none" aria-hidden="true">
                <polyline points={SPARK_POINTS[0]} />
              </svg>
            </div>
            <div className="stat-card stat-offer">
              <div className="stat-card-head">
                <span className="stat-label">Offers</span>
                <span className="stat-icon-badge">
                  <BadgeCheckIcon />
                </span>
              </div>
              <div className="stat-value">{(counts.offer || 0) + (counts.accepted || 0)}</div>
              <svg className="stat-spark" viewBox="0 0 60 18" preserveAspectRatio="none" aria-hidden="true">
                <polyline points={SPARK_POINTS[1]} />
              </svg>
            </div>
          </div>

          <div className="panels-row">
            {/* Add an application */}
            <div className="panel-card">
              <div className="panel-title">Add an application</div>
              <p className="panel-subtitle">Manually add a job to keep your search organized.</p>
              <form className="add-app-form" onSubmit={handleCreate}>
                <div>
                  <label className="field-label" htmlFor="add-company">
                    Company name
                  </label>
                  <input
                    id="add-company"
                    ref={companyInputRef}
                    placeholder="e.g. Linear"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="add-role">
                    Role
                  </label>
                  <input
                    id="add-role"
                    placeholder="e.g. Product Designer"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn-primary btn-add-application" disabled={creating}>
                  {creating ? (
                    'Adding...'
                  ) : (
                    <>
                      Add application <PlusIcon />
                    </>
                  )}
                </button>
                {formError && <span className="error">{formError}</span>}
              </form>
            </div>

            <ReviewQueue
              candidates={candidates}
              loading={candidatesLoading}
              syncing={syncing}
              error={candidatesError}
              gmailConnected={gmailConnected}
              onSync={handleSyncGmail}
              onAccept={handleAcceptCandidate}
              onDismiss={handleDismissCandidate}
            />
          </div>

          {/* Your applications */}
          <div className="panel-card">
            <div className="panel-head-row">
              <span className="panel-title">Your applications</span>
            </div>
            <div className="filter-row">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <span>{visible.length} results</span>
            </div>

            {/* loading only gates the FIRST load's placeholder text -- once
                there's data, later refetches (e.g. after saving notes or
                changing a status) must not unmount the table, or every
                ApplicationItem loses its local state (an open notes drawer,
                mid-edit text) on every save. */}
            {loading && applications.length === 0 && <p className="muted">Loading...</p>}
            {error && <p className="error">{error}</p>}

            {!error && !loading && applications.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <FolderOpenIcon />
                </div>
                <div className="empty-state-title">No applications yet</div>
                <p className="empty-state-sub">
                  Add your first application manually or connect Gmail to automatically import
                  from your inbox.
                </p>
                <button type="button" className="btn-primary" onClick={focusAddApplicationForm}>
                  Add your first application
                </button>
              </div>
            )}

            {!error && applications.length > 0 && visible.length === 0 && (
              <p className="muted" style={{ textAlign: 'center', padding: '2.5rem 0' }}>
                No applications with status &ldquo;{statusFilter}&rdquo;.
              </p>
            )}

            {!error && visible.length > 0 && (
              <div className="applications-panel-scroll">
                <table className="applications-table">
                  <thead>
                    <tr>
                      <th>Company / Role</th>
                      <th>Date applied</th>
                      <th>Notes</th>
                      <th>Status</th>
                      <th>Source</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((app) => (
                      <ApplicationItem
                        key={app.id}
                        app={app}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                        onSaveNotes={handleSaveNotes}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
