import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { api } from '../api';
import GmailConnect from '../components/GmailConnect';

const THEMES = ['light', 'dark', 'system'];

function SettingsPage() {
  const { user, logout } = useAuth();

  // Change password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);
    setPwSaving(true);
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setPwSuccess(true);
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  }

  // Delete account -- password AND a typed "DELETE" confirmation, since this
  // is irreversible (every application/candidate/OAuth token cascades away
  // with the user row).
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function handleDeleteAccount(e) {
    e.preventDefault();
    if (deleteConfirmText !== 'DELETE') {
      setDeleteError('Type DELETE (in capitals) to confirm.');
      return;
    }
    setDeleteError('');
    setDeleting(true);
    try {
      await api.del('/auth/me', { password: deletePassword });
      logout();
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  }

  const { theme, setTheme } = useTheme();

  return (
    <>
      <div className="panel-card">
        <div className="panel-title">Account</div>
        <p className="panel-subtitle">{user.email}</p>
      </div>

      <div className="panel-card">
        <div className="panel-title">Gmail integration</div>
        <p className="panel-subtitle">
          Connect Gmail so Landed can automatically detect job application emails.
        </p>
        <div style={{ marginTop: '1rem' }}>
          <GmailConnect />
        </div>
      </div>

      <div className="panel-card">
        <div className="panel-title">Appearance</div>
        <p className="panel-subtitle">System matches your OS/browser setting.</p>
        <div className="theme-options">
          {THEMES.map((t) => (
            <button
              key={t}
              type="button"
              className={`theme-option${theme === t ? ' active' : ''}`}
              onClick={() => setTheme(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-card">
        <div className="panel-title">Change password</div>
        {/* Reuses the same stacked labelled-field form style as the
            dashboard's "Add an application" card and the reminders form. */}
        <form className="add-app-form" onSubmit={handleChangePassword}>
          <div>
            <label className="field-label" htmlFor="current-password">
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="new-password">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={pwSaving}>
            {pwSaving ? 'Saving...' : 'Update password'}
          </button>
          {pwError && <span className="error">{pwError}</span>}
          {pwSuccess && <span className="notes-saved">Password updated ✓</span>}
        </form>
      </div>

      <div className="panel-card danger-zone">
        <div className="panel-title">Danger zone</div>
        <p className="panel-subtitle">
          Deleting your account permanently removes every application, candidate, and connected
          integration. This can&rsquo;t be undone.
        </p>
        <form className="add-app-form" onSubmit={handleDeleteAccount}>
          <div>
            <label className="field-label" htmlFor="delete-password">
              Password
            </label>
            <input
              id="delete-password"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="delete-confirm">
              Type DELETE to confirm
            </label>
            <input
              id="delete-confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-danger" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete my account'}
          </button>
          {deleteError && <span className="error">{deleteError}</span>}
        </form>
      </div>
    </>
  );
}

export default SettingsPage;
