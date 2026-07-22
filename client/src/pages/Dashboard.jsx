import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import ApplicationItem from '../components/ApplicationItem';

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

  // Loads applications for the current filter. Wrapped in useCallback so it's a
  // stable function I can safely list in the effect's dependencies AND call from
  // the create handler to refresh the list.
  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const path = statusFilter
        ? `/applications?status=${statusFilter}`
        : '/applications';
      const data = await api.get(path);
      setApplications(data.applications);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // Run it on mount and whenever loadApplications changes (i.e. when the filter changes).
  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    setCreating(true);
    try {
      await api.post('/applications', { company, role });
      setCompany(''); // clear the form
      setRole('');
      await loadApplications(); // refresh the list so the new row appears
    } catch (err) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  }

  // Update one application's status, then refresh the list.
  async function handleStatusChange(id, status) {
    try {
      await api.put(`/applications/${id}`, { status });
      await loadApplications();
    } catch (err) {
      setError(err.message);
    }
  }

  // Delete one application (after a confirm), then refresh the list.
  async function handleDelete(id) {
    if (!window.confirm('Delete this application?')) return;
    try {
      await api.del(`/applications/${id}`);
      await loadApplications();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>My Applications</h1>
        <div>
          <span>{user.email}</span>{' '}
          <button onClick={logout}>Log out</button>
        </div>
      </header>

      {/* Create form */}
      <form onSubmit={handleCreate} style={{ margin: '1rem 0' }}>
        <input
          placeholder="Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          required
        />{' '}
        <input
          placeholder="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
        />{' '}
        <button type="submit" disabled={creating}>
          {creating ? 'Adding...' : 'Add application'}
        </button>
        {formError && <span style={{ color: 'crimson' }}> {formError}</span>}
      </form>

      {/* Filter */}
      <label>
        Filter by status:{' '}
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      {/* List states */}
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {!loading && !error && applications.length === 0 && <p>No applications yet.</p>}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {applications.map((app) => (
          <ApplicationItem
            key={app.id}
            app={app}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
          />
        ))}
      </ul>
    </div>
  );
}

export default Dashboard;
