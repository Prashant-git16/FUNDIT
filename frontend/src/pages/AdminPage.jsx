import { useEffect, useState } from 'react';
import api from '../api';
import { formatRupees, formatDate } from '../utils';

export default function AdminPage() {
  const [tab, setTab] = useState('pending'); // 'pending' | 'active' | 'all' | 'users'
  const [campaigns, setCampaigns] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appConfig, setAppConfig] = useState(null);
  const [msg, setMsg] = useState(null);

  // Modal / Inspection state
  const [inspectCampaign, setInspectCampaign] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { campaignId, action: 'approve' | 'review' | 'reject' | 'close' | 'delete' }
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    setLoading(true);
    Promise.all([
      api.get('/api/admin/campaigns'),
      api.get('/api/admin/users'),
      api.get('/api/config').catch(() => null),
    ])
      .then(([camData, usrData, cfg]) => {
        setCampaigns(camData.campaigns || []);
        setUsers(usrData.users || []);
        if (cfg) setAppConfig(cfg);
      })
      .catch((err) => setMsg({ type: 'error', text: err.message }))
      .finally(() => setLoading(false));
  }

  async function handleModerationSubmit(e) {
    e.preventDefault();
    if (!actionModal) return;

    const { campaignId, action } = actionModal;
    if ((action === 'reject' || action === 'review') && !actionReason.trim()) {
      alert(`Please enter a remark explaining why you are putting this campaign in ${action}.`);
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.post(`/api/admin/campaigns/${campaignId}/moderate`, {
        action,
        reason: actionReason.trim() || undefined,
      });

      setMsg({ type: 'success', text: res.message || `Campaign ${action}d successfully.` });
      setActionModal(null);
      setActionReason('');
      setInspectCampaign(null);
      loadData();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  // Filter campaigns by current tab
  const pendingCampaigns = campaigns.filter((c) => c.status === 'pending' || c.status === 'review');
  const activeCampaigns = campaigns.filter((c) => c.status === 'active');
  const displayedCampaigns =
    tab === 'pending' ? pendingCampaigns : tab === 'active' ? activeCampaigns : campaigns;

  function getStatusBadge(status) {
    switch (status) {
      case 'pending':
        return <span className="badge badge-warning">🟡 Pending Review</span>;
      case 'review':
        return <span className="badge badge-warning" style={{ background: '#fef3c7', color: '#92400e' }}>🟠 Proof Requested</span>;
      case 'active':
        return <span className="badge badge-success">🟢 Live & Active</span>;
      case 'rejected':
        return <span className="badge badge-error">🔴 Rejected</span>;
      case 'closed':
        return <span className="badge badge-neutral">🔒 Closed</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  }

  return (
    <div className="container" style={{ padding: 'var(--space-8) var(--space-6) var(--space-16)' }}>
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800 }}>🛡️ Platform Admin Portal</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Review submitted campaigns, verify organizer KYC & proof documents, and manage platform safety.
        </p>
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
                {appConfig.storage?.provider === 's3' ? '🟢 AWS S3 Connected' : '💾 Local Disk Storage'}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                {appConfig.storage?.bucket ? `${appConfig.storage.bucket} (${appConfig.storage.region})` : 'backend/uploads/'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="dashboard__tabs">
        <button
          className={`dashboard__tab${tab === 'pending' ? ' active' : ''}`}
          onClick={() => setTab('pending')}
          style={{ position: 'relative' }}
        >
          📋 Pending Approvals ({pendingCampaigns.length})
          {pendingCampaigns.length > 0 && (
            <span style={{ marginLeft: 6, padding: '2px 8px', borderRadius: 10, background: 'var(--color-accent)', color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>
              {pendingCampaigns.length}
            </span>
          )}
        </button>
        <button className={`dashboard__tab${tab === 'active' ? ' active' : ''}`} onClick={() => setTab('active')}>
          Active Campaigns ({activeCampaigns.length})
        </button>
        <button className={`dashboard__tab${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>
          All Campaigns ({campaigns.length})
        </button>
        <button className={`dashboard__tab${tab === 'users' ? ' active' : ''}`} onClick={() => setTab('users')}>
          Users ({users.length})
        </button>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : tab === 'users' ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Occupation</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.phone ? `🇮🇳 ${u.phone}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td>{u.occupation || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
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
      ) : (
        <div className="table-wrap">
          {displayedCampaigns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-12) 0', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>✨</div>
              <p>No campaigns found in this view.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Campaign Details</th>
                  <th>Organizer & KYC</th>
                  <th>Target & Raised</th>
                  <th>Proof Docs</th>
                  <th>Status</th>
                  <th>Decision Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedCampaigns.map((c) => (
                  <tr key={c.id}>
                    <td style={{ maxWidth: 260 }}>
                      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                        {c.imageUrl && (
                          <img
                            src={c.imageUrl}
                            alt={c.title}
                            style={{ width: 60, height: 48, objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
                          />
                        )}
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{c.title}</div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                            {c.category} · Ends {formatDate(c.deadline)}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{c.owner?.name}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{c.owner?.email}</div>
                      {c.phone && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-dark)' }}>📞 {c.phone}</div>}
                      {c.govIdNumber && (
                        <div style={{ fontSize: 'var(--text-xs)', marginTop: 2, background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4, display: 'inline-block' }}>
                          🆔 {c.govIdType || 'ID'}: {c.govIdNumber}
                        </div>
                      )}
                    </td>

                    <td>
                      <div style={{ fontWeight: 700 }}>{formatRupees(c.raisedAmount)}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Goal: {formatRupees(c.targetAmount)}</div>
                    </td>

                    <td>
                      {c.proofDocuments && c.proofDocuments.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {c.proofDocuments.map((doc, idx) => (
                            <a
                              key={idx}
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '2px 8px', fontSize: 'var(--text-xs)', border: '1px solid var(--border-default)', justifyContent: 'flex-start' }}
                            >
                              📎 Proof #{idx + 1} {doc.isPdf ? '(PDF)' : '(Image)'}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>No extra proof</span>
                      )}
                    </td>

                    <td>
                      {getStatusBadge(c.status)}
                      {c.adminRemarks && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4, maxWidth: 180 }}>
                          <em>Note: {c.adminRemarks}</em>
                        </div>
                      )}
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        {/* Quick View */}
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ border: '1px solid var(--border-default)' }}
                          onClick={() => setInspectCampaign(c)}
                        >
                          👁️ Inspect
                        </button>

                        {/* Approval workflow buttons */}
                        {c.status !== 'active' && (
                          <button
                            className="btn btn-primary btn-sm"
                            title="Approve and make public"
                            onClick={() => setActionModal({ campaignId: c.id, action: 'approve', title: c.title })}
                          >
                            ✅ Approve
                          </button>
                        )}

                        {(c.status === 'pending' || c.status === 'active') && (
                          <button
                            className="btn btn-warning btn-sm"
                            title="Request more proof documents"
                            onClick={() => setActionModal({ campaignId: c.id, action: 'review', title: c.title })}
                          >
                            📝 Request Proof
                          </button>
                        )}

                        {c.status !== 'rejected' && c.status !== 'closed' && (
                          <button
                            className="btn btn-danger btn-sm"
                            title="Reject campaign with remarks"
                            onClick={() => setActionModal({ campaignId: c.id, action: 'reject', title: c.title })}
                          >
                            ❌ Reject
                          </button>
                        )}

                        {c.status === 'active' && (
                          <button
                            className="btn btn-ghost btn-sm"
                            title="Close campaign"
                            onClick={() => setActionModal({ campaignId: c.id, action: 'close', title: c.title })}
                          >
                            🔒 Close
                          </button>
                        )}

                        <button
                          className="btn btn-danger btn-sm"
                          title="Delete campaign"
                          onClick={() => setActionModal({ campaignId: c.id, action: 'delete', title: c.title })}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── Inspect Modal ──────────────────────────────────────────────────────── */}
      {inspectCampaign && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }}>
          <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', maxWidth: 680, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 'var(--space-6)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
              <div>
                <span className="badge badge-info">{inspectCampaign.category}</span>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, marginTop: 'var(--space-2)' }}>{inspectCampaign.title}</h2>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setInspectCampaign(null)}>✕ Close</button>
            </div>

            {inspectCampaign.imageUrl && (
              <img
                src={inspectCampaign.imageUrl}
                alt="Campaign Cover"
                style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}
              />
            )}

            <div style={{ background: 'var(--bg-elevated)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
              <h4 style={{ fontWeight: 700, marginBottom: 'var(--space-2)' }}>Organizer KYC Details</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                <div><strong>Name:</strong> {inspectCampaign.owner?.name}</div>
                <div><strong>Email:</strong> {inspectCampaign.owner?.email}</div>
                <div><strong>Mobile:</strong> {inspectCampaign.phone || 'Not provided'}</div>
                <div><strong>ID:</strong> {inspectCampaign.govIdType}: {inspectCampaign.govIdNumber || 'Not provided'}</div>
                <div style={{ gridColumn: '1 / -1' }}><strong>Address:</strong> {inspectCampaign.address || 'Not provided'}</div>
              </div>
            </div>

            <div style={{ marginBottom: 'var(--space-4)' }}>
              <h4 style={{ fontWeight: 700, marginBottom: 'var(--space-1)' }}>Campaign Story</h4>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{inspectCampaign.description}</p>
            </div>

            {inspectCampaign.proofDocuments && inspectCampaign.proofDocuments.length > 0 && (
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <h4 style={{ fontWeight: 700, marginBottom: 'var(--space-2)' }}>Attached Proof Documents ({inspectCampaign.proofDocuments.length})</h4>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  {inspectCampaign.proofDocuments.map((doc, idx) => (
                    <a
                      key={idx}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                    >
                      📄 Open Proof #{idx + 1} {doc.isPdf ? '(PDF)' : '(Image)'}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', borderTop: '1px solid var(--border-light)', paddingTop: 'var(--space-4)' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setActionModal({ campaignId: inspectCampaign.id, action: 'approve', title: inspectCampaign.title });
                  setInspectCampaign(null);
                }}
              >
                ✅ Approve & Publish
              </button>
              <button
                className="btn btn-warning"
                onClick={() => {
                  setActionModal({ campaignId: inspectCampaign.id, action: 'review', title: inspectCampaign.title });
                  setInspectCampaign(null);
                }}
              >
                📝 Request More Proof
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  setActionModal({ campaignId: inspectCampaign.id, action: 'reject', title: inspectCampaign.title });
                  setInspectCampaign(null);
                }}
              >
                ❌ Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Action Confirmation Modal ──────────────────────────────────────────── */}
      {actionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 16 }}>
          <form
            onSubmit={handleModerationSubmit}
            style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', maxWidth: 480, width: '100%', padding: 'var(--space-6)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
          >
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, textTransform: 'capitalize' }}>
              {actionModal.action === 'approve'
                ? '✅ Approve Campaign'
                : actionModal.action === 'review'
                ? '📝 Request More Proof'
                : actionModal.action === 'reject'
                ? '❌ Reject Campaign'
                : `${actionModal.action} Campaign`}
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 'var(--space-2) 0 var(--space-4)' }}>
              Campaign: <strong>{actionModal.title}</strong>
            </p>

            <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="form-label">
                {actionModal.action === 'review'
                  ? 'Remarks / What proof documents should the owner provide? *'
                  : actionModal.action === 'reject'
                  ? 'Reason for rejection (sent to organizer) *'
                  : 'Remarks (Optional)'}
              </label>
              <textarea
                className="form-textarea"
                rows={3}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                required={actionModal.action === 'review' || actionModal.action === 'reject'}
                placeholder={
                  actionModal.action === 'review'
                    ? 'e.g. Please upload the official hospital treatment estimate signed by medical superintendent.'
                    : actionModal.action === 'reject'
                    ? 'e.g. Government ID details could not be verified.'
                    : 'Optional internal or donor notes'
                }
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => { setActionModal(null); setActionReason(''); }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`btn btn-${actionModal.action === 'approve' ? 'primary' : actionModal.action === 'review' ? 'warning' : 'danger'}`}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing…' : `Confirm ${actionModal.action}`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
