import { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthToken } from './api';

// The context object itself. Components won't use this directly — they'll use
// the useAuth() hook at the bottom.
const AuthContext = createContext(null);

// The provider holds all auth state and the functions to change it, and makes
// them available to everything rendered inside it (its `children`).
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // While I'm checking localStorage on startup, I don't yet know if the user is
  // logged in. `loading` lets me avoid flashing the login page before I know.
  const [loading, setLoading] = useState(true);

  // Runs once, when the app first mounts: restore a saved session so a page
  // refresh doesn't log the user out.
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setAuthToken(token);          // hand the token to my api module
      setUser(JSON.parse(savedUser)); // restore the user object
    }
    setLoading(false);
  }, []); // empty [] = run only once, on mount

  // Save a session everywhere it needs to live: the api module (for the header),
  // React state (for the UI), and localStorage (to survive refreshes).
  function persistSession(data) {
    setAuthToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  }

  async function login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    persistSession(data);
  }

  async function register(email, password) {
    // My backend's register doesn't return a token, so I log in straight after
    // to get one. From the user's point of view, registering logs them in.
    await api.post('/auth/register', { email, password });
    await login(email, password);
  }

  // The second half of "Continue with Google": the button itself is a plain
  // link straight to the backend (a full browser redirect to Google, not a
  // fetch -- see Login.jsx). By the time control comes back to React, the
  // backend's callback has already run and redirected here with a
  // short-lived one-time ?google_code= in the URL. This trades that code for
  // a real session the same way login()/register() do.
  async function loginWithGoogleCode(code) {
    const data = await api.post('/auth/google/exchange', { code });
    persistSession(data);
  }

  function logout() {
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  // Everything I want to expose to the rest of the app.
  const value = { user, loading, login, register, logout, loginWithGoogleCode };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// The hook components actually call: const { user, login } = useAuth();
export function useAuth() {
  return useContext(AuthContext);
}
