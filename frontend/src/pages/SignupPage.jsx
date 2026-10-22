import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
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

  /* Password strength indicator */
  function strengthLevel(pw) {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score; // 0-5
  }

  const strength = strengthLevel(form.password);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][strength] || '';
  const strengthColor = ['', '#ef4444', '#f59e0b', '#eab308', '#22c55e', '#16a34a'][strength] || '#e2e8f0';

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
            <label className="form-label">
              Password <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(min 8 characters)</span>
            </label>
            <div className="password-wrapper">
              <input
                type={showPw ? 'text' : 'password'}
                name="password"
                id="signup-password"
                className="form-input"
                value={form.password}
                onChange={handleChange}
                required
                minLength={8}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>

            {/* Strength bar — shows once user starts typing */}
            {form.password.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 4,
                        background: i <= strength ? strengthColor : '#e2e8f0',
                        transition: 'background 0.3s',
                      }}
                    />
                  ))}
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: strengthColor, marginTop: 4, fontWeight: 600 }}>
                  {strengthLabel}
                </p>
              </div>
            )}
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
