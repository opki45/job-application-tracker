// One place for all API calls -- mirrors client/src/api.js's shape closely
// (get/post/put/del, attaches the JWT, throws on non-2xx) so anyone familiar
// with the web app's fetch wrapper recognizes this immediately. The real
// difference is where the token lives: the web app uses localStorage, this
// uses expo-secure-store (native encrypted storage) via AuthContext, which
// calls setAuthToken() the same way the web AuthContext does.

// A phone can't reach "localhost" and mean the dev machine -- that's the
// phone itself. EXPO_PUBLIC_API_URL must be your dev machine's LAN IP (see
// mobile/README.md). EXPO_PUBLIC_* vars are inlined by Metro at bundle time,
// same mechanism the web client uses for VITE_API_BASE_URL.
const API_BASE = process.env.EXPO_PUBLIC_API_URL;

if (!API_BASE) {
  console.warn(
    'EXPO_PUBLIC_API_URL is not set -- every API call will fail. See mobile/README.md.'
  );
}

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = res.status === 204 ? null : await res.json();

  if (!res.ok) {
    const message =
      (data && (data.error || (data.errors && data.errors.join(', ')))) ||
      'Something went wrong';
    throw new Error(message);
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path, body) => request(path, { method: 'DELETE', body }),
};
