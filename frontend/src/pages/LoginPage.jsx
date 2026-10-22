import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user } = await api.post('/api/auth/login', { email, password });
      login(user);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--color-primary)', display: 'block', marginBottom: 'var(--space-6)' }}>
          🤝 Fundit
        </Link>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your Fundit account</p>

        {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-5)' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              id="login-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              id="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" id="login-submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="auth-divider">or</div>

        <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          Google sign-in is available once configured. See SETUP.md.
        </p>

        <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Create one</Link>
        </p>

        {/* Dev-only seed credentials hint */}
        {import.meta.env.DEV && (
          <div className="alert alert-info" style={{ marginTop: 'var(--space-5)', fontSize: 'var(--text-xs)' }}>
            <div><strong>Dev seed accounts:</strong></div>
            <div>admin@fundit.in / Password1!</div>
            <div>priya@example.com / Password1!</div>
          </div>
        )}
      </div>
    </div>
  );
}
