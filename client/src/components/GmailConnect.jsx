import { useState, useEffect } from 'react';
import { api } from '../api';
import { useGmail } from '../GmailContext';

// Small widget: shows whether Gmail is connected and lets the user
// connect/disconnect. Connection status itself lives in GmailContext (not
// this component's own state) so every place that needs it -- the topbar,
// the review queue's empty-state copy, Settings -- shares one source of
// truth instead of independently fetching and possibly disagreeing.
function GmailConnect() {
  const { connected, loading, setConnected, refresh } = useGmail();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Set once, from the ?gmail=... param the OAuth callback redirects back
  // with, since that's the only place a connect attempt can fail server-side.
  const [callbackMessage, setCallbackMessage] = useState('');

  // Read the callback result out of the URL once, then strip it so a refresh
  // doesn't keep re-showing it. Also re-pull real status from the server --
  // the redirect landed on a fresh page load, but GmailContext may have
  // already fetched (and cached "not connected") before this connect
  // attempt finished.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('gmail');
    if (!result) return;

    setCallbackMessage(
      result === 'connected' ? 'Gmail connected.' : "Couldn't connect Gmail. Please try again."
    );
    if (result === 'connected') refresh();
    params.delete('gmail');
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
    window.history.replaceState({}, '', next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConnect() {
    setBusy(true);
    setError('');
    try {
      const data = await api.get('/integrations/gmail/connect');
      // Full redirect, not a fetch: this has to leave the app for Google's
      // consent screen and come back via a real browser navigation.
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm('Disconnect Gmail? Landed will stop scanning your inbox.')) return;
    setBusy(true);
    setError('');
    try {
      await api.del('/integrations/gmail');
      setConnected(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;

  return (
    <div className="gmail-connect">
      {connected ? (
        <>
          <span className="gmail-status">Gmail connected ✓</span>
          <button className="btn-ghost" onClick={handleDisconnect} disabled={busy}>
            Disconnect
          </button>
        </>
      ) : (
        <button className="btn-ghost" onClick={handleConnect} disabled={busy}>
          Connect Gmail
        </button>
      )}
      {callbackMessage && <span className="muted">{callbackMessage}</span>}
      {error && <span className="error">{error}</span>}
    </div>
  );
}

export default GmailConnect;
