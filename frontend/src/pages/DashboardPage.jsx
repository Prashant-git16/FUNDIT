import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { formatRupees, formatDate, daysLeft } from '../utils';
import { getCategoryLabel } from '../categories';
import CampaignCard from '../components/CampaignCard';

export default function DashboardPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('donations');
  const [donations, setDonations] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/donations/my'),
      api.get(`/api/campaigns?limit=50`),
    ])
      .then(([donData, camData]) => {
        setDonations(donData.donations);
        // Filter to campaigns owned by this user
        setCampaigns(camData.campaigns.filter((c) => c.owner?.id === user.id));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user.id]);

  return (
    <div className="dashboard container">
      <div className="dashboard__header">
        <h1 className="dashboard__name">Welcome, {user.name.split(' ')[0]}!</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{user.email}</p>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-8)', flexWrap: 'wrap' }}>
        <Link to="/create-campaign" className="btn btn-primary">+ New Campaign</Link>
        <Link to="/explore" className="btn btn-outline">Browse Campaigns</Link>
      </div>

      {/* Tabs */}
      <div className="dashboard__tabs">
        <button className={`dashboard__tab${tab === 'donations' ? ' active' : ''}`} onClick={() => setTab('donations')}>
          My Donations ({donations.length})
        </button>
        <button className={`dashboard__tab${tab === 'campaigns' ? ' active' : ''}`} onClick={() => setTab('campaigns')}>
          My Campaigns ({campaigns.length})
        </button>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : tab === 'donations' ? (
        donations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">💳</div>
            <div className="empty-state__title">No donations yet</div>
            <div className="empty-state__message">Find a campaign that resonates with you and make your first donation!</div>
            <Link to="/explore" className="btn btn-primary">Explore Campaigns</Link>
          </div>
        ) : (
          <div className="table-wrap">
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
                    <td style={{ fontWeight: 700 }}>{formatRupees(d.amount)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatDate(d.createdAt)}</td>
                    <td>
                      <span className={`badge badge-${d.status === 'paid' ? 'success' : d.status === 'failed' ? 'error' : 'warning'}`}>
                        {d.status}
                      </span>
                    </td>
                    <td>{d.isAnonymous ? '✓' : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        campaigns.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">🚀</div>
            <div className="empty-state__title">No campaigns yet</div>
            <div className="empty-state__message">Ready to make a difference? Start your first fundraiser!</div>
            <Link to="/create-campaign" className="btn btn-primary">Start a Fundraiser</Link>
          </div>
        ) : (
          <div className="campaign-grid">
            {campaigns.map((c) => <CampaignCard key={c.id} campaign={c} />)}
          </div>
        )
      )}
    </div>
  );
}
