import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const { user } = await api.post('/api/auth/signup', form);
      login(user);
      navigate('/dashboard');
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
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Join thousands helping causes that matter</p>

        {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-5)' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              name="name"
              id="signup-name"
              className="form-input"
              value={form.name}
              onChange={handleChange}
              required
              minLength={2}
              placeholder="Priya Sharma"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              id="signup-email"
              className="form-input"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(min 8 characters)</span></label>
            <input
              type="password"
              name="password"
              id="signup-password"
              className="form-input"
              value={form.password}
              onChange={handleChange}
              required
              minLength={8}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" id="signup-submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          By creating an account you agree to our{' '}
          <Link to="/terms" style={{ color: 'var(--color-primary)' }}>Terms</Link> and{' '}
          <Link to="/privacy" style={{ color: 'var(--color-primary)' }}>Privacy Policy</Link>.
        </p>

        <p style={{ textAlign: 'center', marginTop: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
