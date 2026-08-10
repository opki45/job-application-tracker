import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import Logo from '../components/Logo';
import ApplicationItem from '../components/ApplicationItem';
import GmailConnect from '../components/GmailConnect';
import ReviewQueue from '../components/ReviewQueue';

const STATUSES = ['applied', 'interviewing', 'offer', 'rejected', 'accepted'];

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

  // Load ALL applications once; I compute the stats and the filtered view from
  // this single list, so the stat cards always reflect the full picture.
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

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

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
        <div className="user">
          <GmailConnect />
          <span className="email">{user.email}</span>
          <button className="btn-ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <div className="container">
        <h1 className="page-title">Your applications</h1>
        <p className="page-subtitle">Track every role from applied to offer.</p>

        {/* Stats */}
        <div className="stats">
          <div className="stat accent">
            <div className="num">{applications.length}</div>
            <div className="label">Total</div>
          </div>
          <div className="stat">
            <div className="num">{counts.applied || 0}</div>
            <div className="label">Applied</div>
          </div>
          <div className="stat">
            <div className="num">{counts.interviewing || 0}</div>
            <div className="label">Interviewing</div>
          </div>
          <div className="stat">
            <div className="num">{(counts.offer || 0) + (counts.accepted || 0)}</div>
            <div className="label">Offers</div>
          </div>
        </div>

        {/* Create form — the primary action, made prominent */}
        <div className="create-hero">
          <div className="create-hero-head">
            <span className="create-hero-icon">+</span>
            <div>
              <div className="create-hero-title">Add an application</div>
              <div className="create-hero-sub">Log a new role you've applied to.</div>
            </div>
          </div>
          <form className="create-form" onSubmit={handleCreate}>
            <input
              placeholder="Company (e.g. Monzo)"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
            />
            <input
              placeholder="Role (e.g. Graduate Engineer)"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Adding...' : 'Add application'}
            </button>
            {formError && <span className="error">{formError}</span>}
          </form>
        </div>

        <ReviewQueue onApplicationCreated={loadApplications} />

        {/* List header + filter */}
        <div className="list-head">
          <h2>
            {statusFilter ? `${statusFilter} (${visible.length})` : `All (${applications.length})`}
          </h2>
          <div className="toolbar">
            <label htmlFor="status-filter">Filter:</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* States */}
        {loading && <p className="muted">Loading...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && applications.length === 0 && (
          <div className="empty">
            <div className="empty-icon">📮</div>
            <p>No applications yet. Add your first one above.</p>
          </div>
        )}
        {!loading && !error && applications.length > 0 && visible.length === 0 && (
          <p className="muted">No applications with status “{statusFilter}”.</p>
        )}

        <ul className="app-list">
          {visible.map((app) => (
            <ApplicationItem
              key={app.id}
              app={app}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              onSaveNotes={handleSaveNotes}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Dashboard;
