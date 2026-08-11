import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import ApplicationItem from '../components/ApplicationItem';
import { FolderOpenIcon } from '../components/icons';

const STATUSES = ['applied', 'interviewing', 'offer', 'rejected', 'accepted'];
const PAGE_SIZE = 10;
const SORT_OPTIONS = [
  { value: 'date_applied', label: 'Date applied' },
  { value: 'company', label: 'Company' },
  { value: 'role', label: 'Role' },
  { value: 'status', label: 'Status' },
];

// The full applications management view -- everything the Dashboard's own
// summary table has, plus what only makes sense with a dedicated page:
// search, sortable columns, and real backend pagination (GET
// /api/applications?page=... on the same endpoint the dashboard uses
// unpaginated).
function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('date_applied');
  const [order, setOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Debounce the search box -- one request ~300ms after typing stops, not
  // one per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), sort, order });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const data = await api.get(`/applications?${params.toString()}`);
      setApplications(data.applications);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, sort, order, search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(id, status) {
    try {
      await api.put(`/applications/${id}`, { status });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this application?')) return;
    try {
      await api.del(`/applications/${id}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaveNotes(id, notes) {
    await api.put(`/applications/${id}`, { notes });
    await load();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="panel-card">
        <div className="panel-head-row">
          <span className="panel-title">Applications</span>
          <span className="muted">{total} results</span>
        </div>

        <div className="filter-row applications-filter-row">
          <input
            className="applications-search"
            placeholder="Search company or role..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                Sort: {o.label}
              </option>
            ))}
          </select>
          <select value={order} onChange={(e) => setOrder(e.target.value)}>
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>

        {loading && applications.length === 0 && <p className="muted">Loading...</p>}
        {error && <p className="error">{error}</p>}

        {!error && !loading && total === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FolderOpenIcon />
            </div>
            <div className="empty-state-title">
              {search || statusFilter ? 'No matching applications' : 'No applications yet'}
            </div>
            <p className="empty-state-sub">
              {search || statusFilter
                ? 'Try a different search or filter.'
                : 'Add your first one from the dashboard.'}
            </p>
          </div>
        )}

        {!error && applications.length > 0 && (
          <>
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
                  {applications.map((app) => (
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

            <div className="pagination-row">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </button>
              <span className="muted">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
  );
}

export default ApplicationsPage;
