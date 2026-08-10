import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

// Small self-contained widget: shows whether Gmail is connected and lets the
// user connect/disconnect. No email reading happens yet -- this is just the
// OAuth on/off switch (Phase 2, step 1 of docs/PHASE2.md's build order).
function GmailConnect() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Set once, from the ?gmail=... param the OAuth callback redirects back
  // with, since that's the only place a connect attempt can fail server-side.
  const [callbackMessage, setCallbackMessage] = useState('');

  const loadStatus = useCallback(async () => {
    try {
      const data = await api.get('/integrations/gmail/status');
      setConnected(data.connected);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Read the callback result out of the URL once, then strip it so a refresh
  // doesn't keep re-showing it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('gmail');
    if (!result) return;

    setCallbackMessage(
      result === 'connected' ? 'Gmail connected.' : "Couldn't connect Gmail. Please try again."
    );
    params.delete('gmail');
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
    window.history.replaceState({}, '', next);
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
