import { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, setAuthToken } from './api';

// Same shape and same job as client/src/AuthContext.jsx -- owns auth state
// and session persistence. Only the storage mechanism differs: SecureStore
// (native encrypted storage) instead of localStorage, since SecureStore's
// API is async where localStorage's is synchronous.
const AuthContext = createContext(null);
const TOKEN_KEY = 'landed_token';
const USER_KEY = 'landed_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore a saved session on launch, same reasoning as the web app: don't
  // flash the login screen before I know whether one exists.
  useEffect(() => {
    (async () => {
      const [token, savedUser] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ]);
      if (token && savedUser) {
        setAuthToken(token);
        setUser(JSON.parse(savedUser));
      }
      setLoading(false);
    })();
  }, []);

  async function persistSession(data) {
    setAuthToken(data.token);
    setUser(data.user);
    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
  }

  async function login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    await persistSession(data);
  }

  async function register(email, password) {
    // Same as the web app: register doesn't return a token, so log in right
    // after -- from the user's point of view, registering logs them in.
    await api.post('/auth/register', { email, password });
    await login(email, password);
  }

  async function logout() {
    setAuthToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  }

  const value = { user, loading, login, register, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
