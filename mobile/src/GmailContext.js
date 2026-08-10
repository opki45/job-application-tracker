import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { api } from './api';

// Same shared-status idea as client/src/GmailContext.jsx: the Home screen's
// connect button, the Review Queue's empty-state copy, and anything else
// that cares about Gmail status all read one source of truth.
//
// IMPORTANT trade-off, worth being upfront about: connecting reuses the
// EXISTING web OAuth flow (GOOGLE_REDIRECT_URI -> the backend's callback ->
// a redirect to CLIENT_URL, a web page). There's no custom URL scheme
// wired up on the Google/backend side to deep-link back into this app when
// that finishes, so after completing consent in the browser the user has to
// manually switch back to Expo Go. `refresh()` re-checks status whenever
// this screen regains focus, which covers that gap well enough for a v1 --
// a real native deep-link (a mobile-specific Google OAuth client, or
// CLIENT_URL awareness of which flow started it) is future work, not
// something to fake here.
const GmailContext = createContext(null);

export function GmailProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/integrations/gmail/status');
      setConnected(data.connected);
    } catch {
      // Non-critical read; leave at the last known value.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function connect() {
    const data = await api.get('/integrations/gmail/connect');
    await WebBrowser.openBrowserAsync(data.url);
    // The browser flow doesn't report back to this app directly (see the
    // note above) -- re-check status now in case the user already finished
    // and switched back quickly, but don't assume it succeeded.
    await refresh();
  }

  async function disconnect() {
    await api.del('/integrations/gmail');
    setConnected(false);
  }

  const value = { connected, loading, refresh, connect, disconnect };
  return <GmailContext.Provider value={value}>{children}</GmailContext.Provider>;
}

export function useGmail() {
  return useContext(GmailContext);
}
