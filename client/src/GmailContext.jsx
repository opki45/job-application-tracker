import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from './api';

// Gmail connection status, shared the same way AuthContext shares the
// logged-in user: several places need to know it (the topbar's
// GmailConnect widget, the dashboard's review queue empty-state copy, the
// Settings page) and I want exactly one fetch + one source of truth, not
// each place re-fetching and possibly disagreeing with the others.
const GmailContext = createContext(null);

export function GmailProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/integrations/gmail/status');
      setConnected(data.connected);
    } catch {
      // GmailConnect's own connect/disconnect actions surface their own
      // errors; this is just a read of current status, so I leave it at
      // its last known value rather than adding a second error UI for it.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = { connected, loading, setConnected, refresh };
  return <GmailContext.Provider value={value}>{children}</GmailContext.Provider>;
}

export function useGmail() {
  return useContext(GmailContext);
}
