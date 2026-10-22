import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: 'var(--space-8)',
    }}>
      <div style={{ fontSize: '5rem', marginBottom: 'var(--space-5)' }}>🗺️</div>
      <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: 800, marginBottom: 'var(--space-4)' }}>
        404 — Page Not Found
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-lg)', marginBottom: 'var(--space-8)', maxWidth: 400 }}>
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link to="/" className="btn btn-primary btn-lg">Go Home</Link>
        <Link to="/explore" className="btn btn-outline btn-lg">Explore Campaigns</Link>
      </div>
    </div>
  );
}
