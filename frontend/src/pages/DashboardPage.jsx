import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { formatRupees, formatDate, daysLeft, clampPercent } from '../utils';
import { getCategoryLabel } from '../categories';

export default function DashboardPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('campaigns');
  const [donations, setDonations] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/donations/my').catch(() => ({ donations: [] })),
      api.get('/api/campaigns/my/list').catch(() => ({ campaigns: [] })),
    ])
      .then(([donData, camData]) => {
        setDonations(donData.donations || []);
        setCampaigns(camData.campaigns || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const isProfileIncomplete = user && (!user.phone || !user.occupation || !user.address);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="badge badge-success">● Active & Live</span>;
      case 'pending':
        return <span className="badge badge-warning">⏳ Pending Verification</span>;
      case 'review':
        return <span className="badge badge-info" style={{ background: '#e0f2fe', color: '#0369a1' }}>⚠️ Action Needed / Under Review</span>;
      case 'rejected':
        return <span className="badge badge-error">❌ Rejected</span>;
      case 'closed':
        return <span className="badge badge-error">🔒 Closed</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  return (
    <div className="dashboard container" style={{ paddingBottom: 'var(--space-16)' }}>
      {/* Header */}
      <div className="dashboard__header" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <h1 className="dashboard__name" style={{ margin: 0 }}>
            Welcome back, {user?.name?.split(' ')[0] || 'Friend'}! 🌿
          </h1>
          {user?.role === 'admin' && (
            <span className="badge badge-info" style={{ fontSize: '0.8rem' }}>🛡️ Administrator</span>
          )}
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
          {user?.email} {user?.phone ? `· 📞 ${user.phone}` : ''} {user?.occupation ? `· 💼 ${user.occupation}` : ''}
        </p>
      </div>

      {/* Incomplete profile prompt */}
      {isProfileIncomplete && (
        <div
          style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
            border: '1.5px solid #a7f3d0',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-5) var(--space-6)',
            marginBottom: 'var(--space-8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-4)',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, color: '#065f46', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🌱</span> Complete Your Charity Profile
            </div>
            <p style={{ margin: '4px 0 0', color: '#047857', fontSize: '0.9rem' }}>
              Adding your mobile number, occupation, and city verifies your organizer identity and builds trust with donors.
            </p>
          </div>
          <Link to="/complete-profile" className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>
            Complete Profile Now →
          </Link>
        </div>
      )}

      {/* Quick actions & tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div className="dashboard__tabs" style={{ margin: 0 }}>
          <button
            className={`dashboard__tab${tab === 'campaigns' ? ' active' : ''}`}
            onClick={() => setTab('campaigns')}
          >
            My Campaigns ({campaigns.length})
          </button>
          <button
            className={`dashboard__tab${tab === 'donations' ? ' active' : ''}`}
            onClick={() => setTab('donations')}
          >
            My Donations ({donations.length})
          </button>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Link to="/create-campaign" className="btn btn-primary">
            + Start a Campaign
          </Link>
          <Link to="/explore" className="btn btn-outline">
            Browse Causes
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : tab === 'campaigns' ? (
        campaigns.length === 0 ? (
          <div className="empty-state card" style={{ padding: 'var(--space-12) var(--space-6)', textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 'var(--space-3)' }}>🌱</div>
            <div className="empty-state__title" style={{ fontSize: '1.4rem', fontWeight: 800 }}>No campaigns created yet</div>
            <div className="empty-state__message" style={{ margin: 'var(--space-2) auto var(--space-6)' }}>
              Are you raising funds for medical treatment, education, community relief, or animal welfare? Create your first fundraiser in minutes.
            </div>
            <Link to="/create-campaign" className="btn btn-primary btn-lg">
              + Start Your First Fundraiser
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {campaigns.map((c) => {
              const pct = clampPercent(c.progressPercent);
              return (
                <div
                  key={c.id}
                  className="card"
                  style={{
                    padding: 'var(--space-6)',
                    display: 'grid',
                    gridTemplateColumns: '180px 1fr auto',
                    gap: 'var(--space-6)',
                    alignItems: 'center',
                  }}
                >
                  <img
                    src={c.imageUrl || 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=400&q=80'}
                    alt={c.title}
                    style={{
                      width: '100%',
                      height: '120px',
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-elevated)',
                    }}
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                      {getStatusBadge(c.status)}
                      <span className="badge badge-info">{getCategoryLabel(c.category)}</span>
                      {c.proofDocuments && c.proofDocuments.length > 0 && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                          📎 {c.proofDocuments.length} proof document(s)
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                      <Link to={`/campaign/${c.id}`} style={{ color: 'var(--text-primary)' }}>
                        {c.title}
                      </Link>
                    </h3>

                    <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span>Raised: <strong style={{ color: 'var(--color-primary)' }}>{formatRupees(c.raisedAmount)}</strong></span>
                      <span>Target: <strong>{formatRupees(c.targetAmount)}</strong> ({pct}%)</span>
                      <span>Created: {formatDate(c.createdAt)}</span>
                    </div>

                    {/* Status Feedback Notes */}
                    {c.status === 'pending' && (
                      <div style={{ fontSize: '0.85rem', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '6px 12px', borderRadius: 'var(--radius-sm)', marginTop: '4px' }}>
                        ⏳ <strong>Verification In Progress:</strong> Your campaign has been submitted to admin moderation with your proof & KYC. You will be notified once reviewed.
                      </div>
                    )}

                    {c.status === 'review' && (
                      <div style={{ fontSize: '0.85rem', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '8px 12px', borderRadius: 'var(--radius-sm)', marginTop: '4px' }}>
                        ⚠️ <strong>Moderator Feedback:</strong> {c.adminRemarks || 'Please check and update additional proof or details requested.'}
                      </div>
                    )}

                    {c.status === 'rejected' && (
                      <div style={{ fontSize: '0.85rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '8px 12px', borderRadius: 'var(--radius-sm)', marginTop: '4px' }}>
                        ❌ <strong>Campaign Rejected:</strong> {c.adminRemarks || 'This campaign did not meet the verification guidelines.'}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minWidth: '140px' }}>
                    <Link to={`/campaign/${c.id}`} className="btn btn-outline btn-sm" style={{ width: '100%', textAlign: 'center' }}>
                      View Details
                    </Link>
                    {c.status === 'active' && (
                      <Link to={`/campaign/${c.id}/edit`} className="btn btn-ghost btn-sm" style={{ width: '100%', textAlign: 'center' }}>
                        ✏️ Edit
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        donations.length === 0 ? (
          <div className="empty-state card" style={{ padding: 'var(--space-12) var(--space-6)', textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 'var(--space-3)' }}>💚</div>
            <div className="empty-state__title" style={{ fontSize: '1.4rem', fontWeight: 800 }}>No donations made yet</div>
            <div className="empty-state__message" style={{ margin: 'var(--space-2) auto var(--space-6)' }}>
              Explore community causes and touch lives by making your first contribution today.
            </div>
            <Link to="/explore" className="btn btn-primary btn-lg">Explore Campaigns</Link>
          </div>
        ) : (
          <div className="table-wrap card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Anonymous</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Link to={`/campaign/${d.campaign.id}`} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                        {d.campaign.title}
                      </Link>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{formatRupees(d.amount)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatDate(d.createdAt)}</td>
                    <td>
                      <span className={`badge badge-${d.status === 'paid' ? 'success' : d.status === 'failed' ? 'error' : 'warning'}`}>
                        {d.status}
                      </span>
                    </td>
                    <td>{d.isAnonymous ? '✓ Yes' : '– Public'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
