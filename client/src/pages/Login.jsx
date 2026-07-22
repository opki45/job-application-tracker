import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // One piece of state per field (controlled inputs), plus UI state for the
  // error message and whether a request is in flight.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();     // stop the browser's default full-page form submit
    setError('');
    setSubmitting(true);
    try {
      await login(email, password); // calls my backend via the auth context
      navigate('/');                // success -> go to the dashboard
    } catch (err) {
      setError(err.message);        // e.g. "Invalid credentials"
    } finally {
      setSubmitting(false);         // re-enable the button either way
    }
  }

  return (
    <div>
      <h1>Log in</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <p style={{ color: 'crimson' }}>{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Logging in...' : 'Log in'}
        </button>
      </form>
      <p>
        No account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
}

export default Login;
