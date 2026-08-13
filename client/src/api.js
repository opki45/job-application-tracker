// One place for all my API calls. Components use this instead of calling fetch
// directly, so the headers, JSON parsing, auth token, and error handling live
// in a single spot.

// In development this is empty, so requests go to "/api/..." and Vite's proxy
// forwards them to localhost:3000. In production I set VITE_API_BASE_URL to my
// deployed backend URL, so requests go straight there (no proxy exists in prod).
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// I keep the current token in a module variable. The auth context (next step)
// sets it on login and clears it on logout.
let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

// The core request function. Everything else is a thin wrapper around this.
async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  // If I'm logged in, attach the token the way my backend expects it.
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // 204 No Content (e.g. after a delete) has no body to parse.
  const data = res.status === 204 ? null : await res.json();

  // fetch does NOT throw on 4xx/5xx, so I check res.ok myself and throw, giving
  // callers a single catch-friendly error with the server's message.
  if (!res.ok) {
    const message =
      (data && (data.error || (data.errors && data.errors.join(', ')))) ||
      'Something went wrong';
    throw new Error(message);
  }

  return data;
}

// Convenience wrappers so components read cleanly: api.get('/applications') etc.
export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path, body) => request(path, { method: 'DELETE', body }),
};
