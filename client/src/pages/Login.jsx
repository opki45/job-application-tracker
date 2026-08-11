import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import AuthLayout from '../components/AuthLayout';
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon, ArrowRightIcon, GoogleIcon } from '../components/icons';

function Login() {
  const { login, loginWithGoogleCode } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // "Continue with Google" is a full page navigation to the backend and
  // back (see the <a> below), not a fetch -- so this page is also where
  // that round trip finishes. googleCallback on the server redirects here
  // with either ?google_code=<short-lived one-time code> to trade for a
  // real session, or ?google=error if something went wrong.
  const [googleBusy, setGoogleBusy] = useState(false);
  const exchangedRef = useRef(false);

  useEffect(() => {
    const code = searchParams.get('google_code');
    const failed = searchParams.get('google') === 'error';

    if (failed) {
      setError('Google sign-in failed. Please try again.');
      setSearchParams({}, { replace: true });
      return;
    }

    if (code && !exchangedRef.current) {
      exchangedRef.current = true; // StrictMode double-invokes effects; the code is single-use-ish (60s), so only spend it once
      setGoogleBusy(true);
      loginWithGoogleCode(code)
        .then(() => navigate('/'))
        .catch((err) => {
          setError(err.message);
          setSearchParams({}, { replace: true });
        })
        .finally(() => setGoogleBusy(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Your job search,"
      titleAccent="finally organized."
      subtitle="Landed helps you track applications, automatically import emails from Gmail, and never miss an update."
      navPrompt="Already have an account?"
      navTo="/login"
      navLabel="Log in"
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
            placeholder="Password"
            aria-label="Password"
            className="has-right-icon"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
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

        <div className="auth-row">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Remember me
          </label>
          <a
            className="auth-link"
            href="#forgot-password"
            onClick={(e) => e.preventDefault()}
          >
            Forgot password?
          </a>
        </div>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="btn-primary btn-auth-submit" disabled={submitting}>
          {submitting ? (
            'Logging in...'
          ) : (
            <>
              Log in <ArrowRightIcon />
            </>
          )}
        </button>
      </form>

      <div className="auth-divider">
        <span>or continue with</span>
      </div>

      {/* A plain relative URL -- this is a full page navigation (not a
          fetch), so Vite's dev proxy forwards it to the backend the same
          way it does api.js's requests. In a real (non-proxied) deployment
          this needs the deployed backend's origin prefixed, same as
          api.js's requests will. */}
      <a href="/api/auth/google" className="btn-google" aria-disabled={googleBusy}>
        <GoogleIcon /> {googleBusy ? 'Signing in...' : 'Continue with Google'}
      </a>

      <p className="auth-terms">
        By continuing, you agree to our <a href="#terms">Terms</a> and{' '}
        <a href="#privacy">Privacy Policy</a>.
      </p>
    </AuthLayout>
  );
}

export default Login;
