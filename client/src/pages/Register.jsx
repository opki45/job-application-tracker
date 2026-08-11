import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import AuthLayout from '../components/AuthLayout';
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon, ArrowRightIcon, GoogleIcon } from '../components/icons';

// Mirrors Login.jsx's form structure (icon fields, Google button, terms
// text) -- this used to be an older, plainer form (bare <label>Email<input/>
// pattern, no icons/Google/terms) left behind when Login.jsx was redesigned
// against the reference. AuthLayout's badge/title/tab-switcher already
// serves as this page's heading, so there's no separate "Create your
// account" heading here, same as Login doesn't have one either.
function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Track every application"
      titleAccent="in one place."
      subtitle="Landed keeps your job hunt organised — applied, interviewing, offers — all in one clean dashboard."
      navPrompt="Already have an account?"
      navTo="/login"
      navLabel="Sign in"
    >
      <form onSubmit={handleSubmit}>
        <div className="input-icon-field">
          <MailIcon className="input-icon-glyph" />
          <input
            type="email"
            placeholder="Email address"
            aria-label="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="input-icon-field">
          <LockIcon className="input-icon-glyph" />
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password (min. 8 characters)"
            aria-label="Password"
            className="has-right-icon"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <button
            type="button"
            className="input-icon-toggle"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="btn-primary btn-auth-submit" disabled={submitting}>
          {submitting ? (
            'Creating account...'
          ) : (
            <>
              Create account <ArrowRightIcon />
            </>
          )}
        </button>
      </form>

      <div className="auth-divider">
        <span>or continue with</span>
      </div>

      {/* See the matching comment on Login.jsx's Google link. */}
      <a href="/api/auth/google" className="btn-google">
        <GoogleIcon /> Continue with Google
      </a>

      <p className="auth-terms">
        By continuing, you agree to our <a href="#terms">Terms</a> and{' '}
        <a href="#privacy">Privacy Policy</a>.
      </p>
    </AuthLayout>
  );
}

export default Register;
