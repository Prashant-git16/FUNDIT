import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { formatRupees, daysLeft, formatDate, clampPercent } from '../utils';
import { getCategoryLabel } from '../categories';
import { useAuth } from '../context/AuthContext';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=900&q=80';

export default function CampaignDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Donation flow state
  const [donationAmount, setDonationAmount] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [donating, setDonating] = useState(false);
  const [donationMsg, setDonationMsg] = useState(null);

  // Expense form state
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseImg, setExpenseImg] = useState(null);
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [expenseMsg, setExpenseMsg] = useState(null);
  const [appConfig, setAppConfig] = useState(null);

  useEffect(() => {
    api.get('/api/config')
      .then(setAppConfig)
      .catch((err) => console.warn('[config] error:', err.message));
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/campaigns/${id}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (error)   return <div className="container" style={{ padding: 'var(--space-16) 0' }}><div className="alert alert-error">{error}</div></div>;
  if (!data)   return null;

  const { campaign, donors, expenses, totalExpenses, spendingPercent } = data;
  const pct = clampPercent(campaign.progressPercent);
  const remainingGoal = Math.max(0, parseFloat(campaign.targetAmount) - parseFloat(campaign.raisedAmount));
  const isFullyFunded = remainingGoal <= 0;
  const isExpiredOrClosed = campaign.status === 'expired' || campaign.status === 'closed' || isFullyFunded;
  const isOwner = user?.id === campaign.owner?.id;
  const canDonate = user && campaign.status === 'active' && !isExpiredOrClosed;

  // ─── Razorpay donation flow ───────────────────────────────────────────────

  async function handleDonate() {
    if (!user) { navigate('/login'); return; }
    const amount = parseFloat(donationAmount);
    if (!amount || amount < 10) {
      setDonationMsg({ type: 'error', text: 'Minimum donation is ₹10' });
      return;
    }
    if (amount > remainingGoal) {
      setDonationMsg({
        type: 'error',
        text: `Donation cannot exceed the remaining goal of ${formatRupees(remainingGoal)}`,
      });
      return;
    }
    setDonating(true);
    setDonationMsg(null);
    try {
      const order = await api.post('/api/donations/create-order', {
        campaignId: campaign.id,
        amount,
        isAnonymous,
      });

      // If in dev simulation mode (no Razorpay credentials in backend)
      if (order.simulated) {
        await api.post('/api/donations/verify', {
          razorpayOrderId: order.orderId,
          razorpayPaymentId: `pay_sim_${Date.now()}`,
          razorpaySignature: 'simulated_signature',
        });
        setDonationMsg({
          type: 'success',
          text: `🎉 (Demo Mode) Thank you! Your donation of ${formatRupees(amount)} was recorded successfully.`,
        });
        const fresh = await api.get(`/api/campaigns/${id}`);
        setData(fresh);
        setDonating(false);
        return;
      }

      // Load Razorpay script dynamically if not already loaded
      if (!window.Razorpay) {
        await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Fundit',
        description: `Donation to: ${campaign.title}`,
        order_id: order.orderId,
        handler: async (response) => {
          try {
            await api.post('/api/donations/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setDonationMsg({ type: 'success', text: `🎉 Thank you! Your donation of ${formatRupees(amount)} was successful.` });
            // Refresh campaign data to show updated raised amount
            const fresh = await api.get(`/api/campaigns/${id}`);
            setData(fresh);
          } catch (err) {
            setDonationMsg({ type: 'error', text: err.message });
          }
        },
        prefill: { name: user.name, email: user.email },
        theme: { color: '#0f766e' },
        modal: {
          ondismiss: () => setDonating(false),
        },
      });
      rzp.open();
    } catch (err) {
      setDonationMsg({ type: 'error', text: err.message });
    } finally {
      setDonating(false);
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  // ─── Close campaign ───────────────────────────────────────────────────────

  async function handleCloseCampaign() {
    if (!confirm('Are you sure you want to close this campaign? It will no longer accept donations.')) return;
    try {
      await api.post(`/api/campaigns/${campaign.id}/close`);
      const fresh = await api.get(`/api/campaigns/${id}`);
      setData(fresh);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeleteCampaign() {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) return;
    try {
      await api.delete(`/api/campaigns/${campaign.id}`);
      navigate('/explore');
    } catch (err) {
      alert(err.message);
    }
  }

  // ─── Add expense ──────────────────────────────────────────────────────────

  async function handleAddExpense(e) {
    e.preventDefault();
    setSubmittingExpense(true);
    setExpenseMsg(null);
    const fd = new FormData();
    fd.append('amount', expenseAmount);
    fd.append('description', expenseDesc);
    if (expenseImg) fd.append('image', expenseImg);

    try {
      const result = await api.postForm(`/api/expenses/${campaign.id}`, fd);
      setExpenseMsg({ type: 'success', text: result.warning || 'Expense entry added.' });
      setExpenseAmount(''); setExpenseDesc(''); setExpenseImg(null);
      const fresh = await api.get(`/api/campaigns/${id}`);
      setData(fresh);
    } catch (err) {
      setExpenseMsg({ type: 'error', text: err.message });
    } finally {
      setSubmittingExpense(false);
    }
  }

  return (
    <div className="campaign-detail">
      <div className="container">
        {/* Status notification banner for pending/review/rejected */}
        {campaign.status === 'pending' && (
          <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', color: '#92400e', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-6)', marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span style={{ fontSize: '1.5rem' }}>⏳</span>
            <div>
              <strong>Pending Moderator Verification:</strong> This campaign is currently under review by our admin team along with the submitted government ID and proof documents. It will be published publicly upon approval.
            </div>
          </div>
        )}

        {campaign.status === 'review' && (
          <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', color: '#1e40af', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-6)', marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div>
              <strong>Action Needed (Under Review):</strong> {campaign.adminRemarks || 'The moderator has requested additional verification or documentation.'}
            </div>
          </div>
        )}

        {campaign.status === 'rejected' && (
          <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', color: '#991b1b', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-6)', marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span style={{ fontSize: '1.5rem' }}>❌</span>
            <div>
              <strong>Campaign Rejected:</strong> {campaign.adminRemarks || 'This campaign was not approved by moderation.'}
            </div>
          </div>
        )}

        {/* Breadcrumb */}
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-5)' }}>
          <Link to="/explore">Explore</Link> › {campaign.title}
        </div>

        <div className="campaign-detail__grid">
          {/* ─── Left column ──────────────────── */}
          <div>
            <img
              src={campaign.imageUrl || PLACEHOLDER}
              alt={campaign.title}
              className="campaign-detail__image"
              onError={(e) => { e.target.src = PLACEHOLDER; }}
            />

            <div style={{ marginTop: 'var(--space-6)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="badge badge-info">{getCategoryLabel(campaign.category)}</span>
              {campaign.status === 'pending' && <span className="badge badge-warning">⏳ Pending Approval</span>}
              {campaign.status === 'review' && <span className="badge badge-info" style={{ background: '#e0f2fe', color: '#0369a1' }}>⚠️ Under Review</span>}
              {campaign.status === 'rejected' && <span className="badge badge-error">❌ Rejected</span>}
              {campaign.status === 'active' && (
                isFullyFunded ? (
                  <span className="badge badge-success">🎉 Goal Reached</span>
                ) : isExpiredOrClosed ? (
                  <span className="badge badge-error">{campaign.status === 'closed' ? 'Campaign Closed' : 'Campaign Ended'}</span>
                ) : (
                  <span className="badge badge-success">● Active</span>
                )
              )}
            </div>

            <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginTop: 'var(--space-4)', lineHeight: 1.3 }}>
              {campaign.title}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', margin: 'var(--space-3) 0', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', flexWrap: 'wrap' }}>
              <span>by <strong>{campaign.owner?.name}</strong></span>
              <span>·</span>
              <span>Created {formatDate(campaign.createdAt)}</span>
              {campaign.govIdType && (
                <>
                  <span>·</span>
                  <span style={{ color: '#047857', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    🛡️ KYC Verified Organizer
                  </span>
                </>
              )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: 'var(--space-6) 0' }} />

            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>About this campaign</h2>
            <p className="campaign-detail__description" style={{ whiteSpace: 'pre-line' }}>{campaign.description}</p>

            {/* Organizer Trust & KYC Card */}
            <div style={{ marginTop: 'var(--space-8)', background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', border: '1.5px solid #a7f3d0', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                  🛡️
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#065f46', margin: 0 }}>
                    Verified Organizer & Trust Check
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#047857' }}>
                    Government Identity & Contact verified by Fundit Moderation Team
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)', fontSize: '0.9rem', color: '#065f46', marginTop: 'var(--space-3)', background: 'rgba(255,255,255,0.7)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <strong>Organizer:</strong> {campaign.owner?.name}
                </div>
                {(isOwner || user?.role === 'admin') && campaign.phone ? (
                  <div>
                    <strong>Mobile Contact:</strong> {campaign.phone}
                  </div>
                ) : (
                  <div>
                    <strong>Mobile Contact:</strong> 🔒 Verified by Admin (Protected)
                  </div>
                )}
                {campaign.govIdType && (
                  <div>
                    <strong>Gov ID:</strong> {campaign.govIdType.toUpperCase()} (Verified)
                  </div>
                )}
                {campaign.address && (
                  <div>
                    <strong>Location:</strong> {campaign.address}
                  </div>
                )}
              </div>

              {/* Proof Documents List */}
              {campaign.proofDocuments && campaign.proofDocuments.length > 0 && (
                <div style={{ marginTop: 'var(--space-5)' }}>
                  <div style={{ fontWeight: 700, color: '#065f46', fontSize: '0.95rem', marginBottom: 'var(--space-2)' }}>
                    📄 Supporting Proof Documents ({campaign.proofDocuments.length})
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                    {campaign.proofDocuments.map((doc, idx) => (
                      <a
                        key={idx}
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#fff',
                          border: '1px solid #a7f3d0',
                          padding: '8px 14px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.85rem',
                          color: '#047857',
                          fontWeight: 600,
                          textDecoration: 'none',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        <span>{doc.isPdf ? '📑' : '🖼️'}</span>
                        <span>{doc.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#059669' }}>↗</span>
                      </a>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: 'var(--space-2)' }}>
                    ✓ Submitted to moderation for authenticity & legitimacy verification
                  </div>
                </div>
              )}
            </div>

            {/* Owner & Admin actions */}
            {(isOwner || user?.role === 'admin') && (
              <div style={{ marginTop: 'var(--space-8)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                {isOwner && campaign.status === 'active' && (
                  <Link to={`/campaign/${campaign.id}/edit`} className="btn btn-outline btn-sm">✏️ Edit Campaign</Link>
                )}
                {isOwner && campaign.status === 'active' && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowExpenseForm((v) => !v)}>
                    📋 Add Expense Report
                  </button>
                )}
                {campaign.status === 'active' && (
                  <button className="btn btn-warning btn-sm" onClick={handleCloseCampaign}>
                    🔒 Close Campaign
                  </button>
                )}
                <button className="btn btn-danger btn-sm" onClick={handleDeleteCampaign}>
                  🗑️ Delete Campaign
                </button>
              </div>
            )}

            {/* Expense form */}
            {showExpenseForm && (
              <form onSubmit={handleAddExpense} style={{ marginTop: 'var(--space-6)', background: 'var(--bg-elevated)', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <h3 style={{ fontWeight: 700 }}>Add Expense Report</h3>
                {expenseMsg && <div className={`alert alert-${expenseMsg.type}`}>{expenseMsg.text}</div>}
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input type="number" className="form-input" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} required min="1" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} required minLength={5} />
                </div>
                <div className="form-group">
                  <label className="form-label">Receipt / Bill Image (optional)</label>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setExpenseImg(e.target.files[0])} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={submittingExpense}>
                  {submittingExpense ? 'Saving…' : 'Save Expense Entry'}
                </button>
              </form>
            )}

            {/* ─── Expenses ─────────────────────────────────── */}
            {expenses && expenses.length > 0 && (
              <div style={{ marginTop: 'var(--space-8)' }}>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                  Expense Reports
                </h2>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
                  Submitted by the campaign owner as evidence of fund usage. Not independently audited.
                </p>
                {/* Spending progress */}
                <div style={{ marginBottom: 'var(--space-5)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-1)', color: 'var(--text-secondary)' }}>
                    <span>Reported spending</span>
                    <span>{formatRupees(totalExpenses)} of {formatRupees(campaign.raisedAmount)} raised ({spendingPercent}%)</span>
                  </div>
                  <div className="progress-bar-track">
                    <div className="progress-bar-fill progress-bar-fill--expense" style={{ width: `${spendingPercent}%` }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  {expenses.map((exp) => (
                    <div key={exp.id} className="card" style={{ padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
                      {exp.proofImageUrl && (
                        <img src={exp.proofImageUrl} alt="Receipt" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-accent-dark)' }}>{formatRupees(exp.amount)}</div>
                        <div style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>{exp.description}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>{formatDate(exp.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Donors ───────────────────────────────────── */}
            <div style={{ marginTop: 'var(--space-8)' }}>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-5)' }}>
                Recent Supporters
              </h2>
              {donors.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>Be the first to support this campaign!</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {donors.map((d, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}>
                      <span><strong>{d.donorName}</strong></span>
                      <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{formatRupees(d.amount)}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{formatDate(d.donatedAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─── Right column (sticky donation card) ─────────── */}
          <div className="campaign-detail__sticky">
            <div className="donation-card">
              <div className="donation-card__amount">{formatRupees(campaign.raisedAmount)}</div>
              <div className="donation-card__target">raised of {formatRupees(campaign.targetAmount)} goal</div>

              <div className="progress-bar-wrap" style={{ marginTop: 'var(--space-4)' }}>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <span>{pct}% funded</span>
                  <span>{donors.length} supporter{donors.length !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', margin: 'var(--space-4) 0', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                <span>⏰ {daysLeft(campaign.deadline)}</span>
                <span>🎯 {isFullyFunded ? 'Goal reached!' : `${formatRupees(remainingGoal)} to go`}</span>
              </div>

              {/* Donation form */}
              {campaign.status !== 'active' ? (
                <div className="alert alert-warning" style={{ marginTop: 'var(--space-2)' }}>
                  ⏳ <strong>Verification In Progress:</strong> This campaign is currently under review by our admin team. Donations will be activated immediately once verified.
                </div>
              ) : isFullyFunded ? (
                <div className="alert alert-success" style={{ marginTop: 'var(--space-2)' }}>
                  🎉 <strong>Goal Achieved!</strong> This campaign has reached 100% of its funding goal. Thank you to all supporters!
                </div>
              ) : isExpiredOrClosed ? (
                <div className="alert alert-info" style={{ marginTop: 'var(--space-2)' }}>
                  This campaign is no longer accepting donations.
                </div>
              ) : (
                <>
                  {donationMsg && (
                    <div className={`alert alert-${donationMsg.type}`} style={{ marginBottom: 'var(--space-4)' }}>
                      {donationMsg.text}
                    </div>
                  )}
                  <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                      <label className="form-label" style={{ margin: 0 }}>Donation Amount (₹)</label>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Max: {formatRupees(remainingGoal)}</span>
                    </div>
                    <input
                      type="number"
                      className="form-input"
                      placeholder={`Min ₹10 · Max ₹${Math.floor(remainingGoal).toLocaleString()}`}
                      value={donationAmount}
                      onChange={(e) => setDonationAmount(e.target.value)}
                      min={10}
                      max={remainingGoal}
                    />
                  </div>

                  {/* Quick amount buttons capped at remainingGoal */}
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
                    {[100, 500, 1000, 5000].filter((a) => a <= remainingGoal).map((a) => (
                      <button
                        key={a}
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ border: '1px solid var(--border-default)' }}
                        onClick={() => setDonationAmount(String(a))}
                      >
                        ₹{a.toLocaleString()}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ border: '1px solid var(--color-primary)', color: 'var(--color-primary)', fontWeight: 600 }}
                      onClick={() => setDonationAmount(String(Math.floor(remainingGoal)))}
                    >
                      Donate Remaining ({formatRupees(remainingGoal)})
                    </button>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
                    Donate anonymously
                  </label>

                  {user ? (
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                      onClick={handleDonate}
                      disabled={donating}
                    >
                      {donating ? 'Processing…' : '💳 Donate Now'}
                    </button>
                  ) : (
                    <Link to="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                      Login to Donate
                    </Link>
                  )}
                  {appConfig?.hasRazorpay ? (
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-dark)', textAlign: 'center', marginTop: 'var(--space-3)', fontWeight: 600 }}>
                      🔒 Secured by Razorpay Gateway · Active ({appConfig.razorpayKeyId ? `${appConfig.razorpayKeyId.slice(0, 12)}…` : 'Test Mode'})
                    </p>
                  ) : (
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center', marginTop: 'var(--space-3)' }}>
                      🔒 Secured by Razorpay · Demo simulated mode
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
