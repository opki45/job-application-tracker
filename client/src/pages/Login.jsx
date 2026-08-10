import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import AuthLayout from '../components/AuthLayout';
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon, ArrowRightIcon, GoogleIcon } from '../components/icons';

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

      <button type="button" className="btn-google">
        <GoogleIcon /> Continue with Google
      </button>

      <p className="auth-terms">
        By continuing, you agree to our <a href="#terms">Terms</a> and{' '}
        <a href="#privacy">Privacy Policy</a>.
      </p>
    </AuthLayout>
  );
}

export default Login;
