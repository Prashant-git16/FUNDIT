import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function CompleteProfilePage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = location.state?.from || '/dashboard';

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [occupation, setOccupation] = useState(user?.occupation || '');
  const [address, setAddress] = useState(user?.address || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!occupation.trim()) {
      setError('Please specify your occupation or profession.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.put('/api/auth/profile', {
        name: name.trim(),
        phone: cleanPhone,
        occupation: occupation.trim(),
        address: address.trim(),
      });

      login(data.user);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Could not update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page" style={{ padding: 'var(--space-12) var(--space-4)' }}>
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>🤝</div>
          <h1 className="auth-title" style={{ fontSize: '1.75rem' }}>Complete Your Profile</h1>
          <p className="auth-subtitle">
            Welcome to Fundit! Please share a few details so our community and campaign organizers know who you are.
          </p>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-5)' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Priya Sharma"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mobile Number *</label>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0 12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: 'var(--text-secondary)',
              }}>
                🇮🇳 +91
              </span>
              <input
                type="tel"
                className="form-input"
                style={{ flex: 1 }}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                maxLength={12}
                placeholder="98765 43210"
              />
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
              Used for important donation receipts & campaign updates. Kept private.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Occupation / Profession *</label>
            <input
              type="text"
              className="form-input"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              required
              placeholder="e.g. Software Engineer, Doctor, Teacher, Student, Social Worker"
            />
          </div>

          <div className="form-group">
            <label className="form-label">City / Address (Optional)</label>
            <input
              type="text"
              className="form-input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Bengaluru, Karnataka"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ marginTop: 'var(--space-2)', width: '100%', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? 'Saving Profile…' : 'Save & Continue to Fundit →'}
          </button>
        </form>
      </div>
    </div>
  );
}
