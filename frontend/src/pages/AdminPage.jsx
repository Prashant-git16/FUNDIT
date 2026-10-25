import { useEffect, useState } from 'react';
import api from '../api';
import { formatRupees, formatDate } from '../utils';

export default function AdminPage() {
  const [tab, setTab] = useState('campaigns');
  const [campaigns, setCampaigns] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moderating, setModerating] = useState(null);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState(null);
  const [appConfig, setAppConfig] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/api/admin/campaigns'),
      api.get('/api/admin/users'),
      api.get('/api/config').catch(() => null),
    ])
      .then(([camData, usrData, cfg]) => {
        setCampaigns(camData.campaigns);
        setUsers(usrData.users);
        if (cfg) setAppConfig(cfg);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function moderate(campaignId, action, actionReason) {
    const finalReason = actionReason || reason.trim() || `Administrative ${action} action`;
    try {
      await api.post(`/api/admin/campaigns/${campaignId}/moderate`, { action, reason: finalReason });
      setMsg({ type: 'success', text: `Campaign ${action === 'delete' ? 'deleted' : 'closed'} successfully.` });
      setModerating(null);
      setReason('');
      const fresh = await api.get('/api/admin/campaigns');
      setCampaigns(fresh.campaigns);
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  }

  return (
    <div className="container" style={{ padding: 'var(--space-8) var(--space-6) var(--space-16)' }}>
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>Admin Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Platform management and moderation</p>
      </div>

      {msg && (
        <div className={`alert alert-${msg.type}`} style={{ marginBottom: 'var(--space-5)' }}>
          {msg.text}
        </div>
      )}

      {/* Cloud & Third-Party Integrations Status Card */}
      {appConfig && (
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', marginBottom: 'var(--space-8)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            ⚡ System & Cloud Service Integrations
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
            <div style={{ padding: 'var(--space-3)', background: 'var(--bg-base)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Google OAuth</div>
              <div style={{ fontWeight: 600, marginTop: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                {appConfig.hasGoogleAuth ? '🟢 Active & Configured' : '⚪ Not Configured'}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)', wordBreak: 'break-all' }}>
                {appConfig.googleClientId ? `${appConfig.googleClientId.slice(0, 24)}…` : 'Add GOOGLE_CLIENT_ID in .env'}
              </div>
            </div>

            <div style={{ padding: 'var(--space-3)', background: 'var(--bg-base)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Razorpay Gateway</div>
              <div style={{ fontWeight: 600, marginTop: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                {appConfig.hasRazorpay ? '🟢 Live / Test Key Active' : '🟡 Dev Simulated Mode'}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                {appConfig.razorpayKeyId ? `Key: ${appConfig.razorpayKeyId}` : 'Add RAZORPAY_KEY_ID in .env'}
              </div>
            </div>

            <div style={{ padding: 'var(--space-3)', background: 'var(--bg-base)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Image Storage</div>
              <div style={{ fontWeight: 600, marginTop: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                {appConfig.storage?.provider === 's3' ? '🟢 AWS S3 Connected' : '💾 Local Disk Fallback'}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                {appConfig.storage?.bucket ? `${appConfig.storage.bucket} (${appConfig.storage.region})` : 'backend/uploads/'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard__tabs">
        <button className={`dashboard__tab${tab === 'campaigns' ? ' active' : ''}`} onClick={() => setTab('campaigns')}>
          Campaigns ({campaigns.length})
        </button>
        <button className={`dashboard__tab${tab === 'users' ? ' active' : ''}`} onClick={() => setTab('users')}>
          Users ({users.length})
        </button>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : tab === 'campaigns' ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Owner</th>
                <th>Category</th>
                <th>Raised</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <>
                  <tr key={c.id}>
                    <td style={{ maxWidth: 220 }}>{c.title}</td>
                    <td>{c.owner_name}<br /><small style={{ color: 'var(--text-muted)' }}>{c.owner_email}</small></td>
                    <td>{c.category}</td>
                    <td>{formatRupees(c.raised_amount)}</td>
                    <td>
                      <span className={`badge badge-${c.status === 'active' ? 'success' : 'neutral'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatDate(c.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        {c.status === 'active' && (
                          <button
                            className="btn btn-warning btn-sm"
                            title="Close campaign from receiving donations"
                            onClick={() => {
                              if (confirm(`Close campaign "${c.title}"?`)) {
                                moderate(c.id, 'close', 'Closed by administrator');
                              }
                            }}
                          >
                            Close
                          </button>
                        )}
                        <button
                          className="btn btn-danger btn-sm"
                          title="Delete campaign"
                          onClick={() => {
                            if (confirm(`Permanently remove campaign "${c.title}"?`)) {
                              moderate(c.id, 'delete', 'Deleted by administrator');
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                </>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge badge-${u.role === 'admin' ? 'warning' : 'neutral'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{formatDate(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
