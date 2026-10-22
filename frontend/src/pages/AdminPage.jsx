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

  useEffect(() => {
    Promise.all([
      api.get('/api/admin/campaigns'),
      api.get('/api/admin/users'),
    ])
      .then(([camData, usrData]) => {
        setCampaigns(camData.campaigns);
        setUsers(usrData.users);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function moderate(campaignId, action) {
    if (!reason.trim()) { setMsg({ type: 'error', text: 'Please provide a reason.' }); return; }
    try {
      await api.post(`/api/admin/campaigns/${campaignId}/moderate`, { action, reason });
      setMsg({ type: 'success', text: `Campaign ${action}d successfully.` });
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
                      {c.status === 'active' && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setModerating(c.id)}
                        >
                          Moderate
                        </button>
                      )}
                    </td>
                  </tr>
                  {/* Inline moderation panel */}
                  {moderating === c.id && (
                    <tr key={`mod-${c.id}`}>
                      <td colSpan={7} style={{ background: 'var(--bg-elevated)' }}>
                        <div style={{ padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                          <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Reason for action</label>
                            <input
                              type="text"
                              className="form-input"
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              placeholder="Describe why you are taking this action"
                            />
                          </div>
                          <button className="btn btn-danger btn-sm" onClick={() => moderate(c.id, 'close')}>Close</button>
                          <button className="btn btn-danger btn-sm" onClick={() => moderate(c.id, 'delete')}>Delete</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setModerating(null)}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}
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
