import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { CATEGORIES } from '../categories';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const GOV_ID_TYPES = [
  'Aadhaar Card',
  'PAN Card',
  'Voter ID Card',
  'Passport',
  'Driving License',
  'Government Issued Employee ID',
];

export default function CreateCampaignPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams(); // present when editing

  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(null);

  const [form, setForm] = useState({
    title: '',
    category: 'healthcare',
    description: '',
    targetAmount: '',
    deadline: '',
    image: null,
    govIdType: 'Aadhaar Card',
    govIdNumber: '',
    phone: user?.phone || '',
    address: user?.address || '',
  });

  const [proofFiles, setProofFiles] = useState([]);
  const [appConfig, setAppConfig] = useState(null);

  useEffect(() => {
    api.get('/api/config')
      .then(setAppConfig)
      .catch((err) => console.warn('[config] error:', err.message));
  }, []);

  // Load existing data when editing
  useEffect(() => {
    if (!isEdit) return;
    api.get(`/api/campaigns/${id}`)
      .then(({ campaign }) => {
        setForm({
          title: campaign.title,
          category: campaign.category,
          description: campaign.description,
          targetAmount: campaign.targetAmount,
          deadline: campaign.deadline ? campaign.deadline.slice(0, 10) : '',
          image: null,
          govIdType: campaign.govIdType || 'Aadhaar Card',
          govIdNumber: campaign.govIdNumber || '',
          phone: campaign.phone || user?.phone || '',
          address: campaign.address || user?.address || '',
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setFetchLoading(false));
  }, [id, isEdit, user]);

  function handleChange(e) {
    const { name, value, files } = e.target;
    if (name === 'image') {
      setForm((f) => ({ ...f, image: files[0] }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  }

  function handleProofFilesChange(e) {
    const selected = Array.from(e.target.files).slice(0, 3);
    setProofFiles(selected);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmittedSuccess(null);

    if (!isEdit && !form.image) {
      setError('Please choose a main cover image for your campaign.');
      return;
    }

    if (!form.govIdNumber.trim()) {
      setError('Please provide a valid Government ID number.');
      return;
    }

    const cleanPhone = form.phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!form.address.trim()) {
      setError('Please provide your residential or organization address.');
      return;
    }

    setLoading(true);

    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('category', form.category);
    fd.append('description', form.description);
    fd.append('targetAmount', form.targetAmount);
    fd.append('deadline', form.deadline);
    fd.append('govIdType', form.govIdType);
    fd.append('govIdNumber', form.govIdNumber.trim());
    fd.append('phone', cleanPhone);
    fd.append('address', form.address.trim());

    if (form.image) {
      fd.append('image', form.image);
    }

    // Append 2-3 proof documents if provided
    proofFiles.forEach((file) => {
      fd.append('proofDocuments', file);
    });

    try {
      if (isEdit) {
        await api.patchForm(`/api/campaigns/${id}`, fd);
        setSubmittedSuccess({
          title: 'Campaign Updated!',
          message: 'Your campaign changes have been saved.',
        });
        setTimeout(() => navigate(`/campaign/${id}`), 2000);
      } else {
        const res = await api.postForm('/api/campaigns', fd);
        setSubmittedSuccess({
          title: '🎉 Campaign Submitted for Admin Review!',
          message: res.message || 'Your campaign has been sent to the Admin Portal for verification. It will be publicly published once approved.',
          campaignId: res.campaign?.id,
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Minimum deadline: tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDeadline = tomorrow.toISOString().slice(0, 10);

  if (fetchLoading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <>
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)', borderBottom: '1px solid var(--border-light)' }}>
        <div className="container">
          <span className="badge badge-success" style={{ marginBottom: 'var(--space-2)' }}>🕊️ Verified Charity & Helping Platform</span>
          <h1 className="page-header__title" style={{ color: 'var(--text-primary)' }}>{isEdit ? 'Edit Campaign' : 'Start a Fundraiser'}</h1>
          <p className="page-header__subtitle" style={{ color: 'var(--text-secondary)' }}>
            Tell your story with full transparency. Every campaign is reviewed by administrators before going live.
          </p>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 780, padding: 'var(--space-10) var(--space-6) var(--space-20)' }}>
        {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-6)' }}>{error}</div>}

        {submittedSuccess ? (
          <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center', background: 'var(--bg-elevated)', border: '2px solid var(--color-primary-light)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}>📋</div>
            <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--color-primary-dark)' }}>{submittedSuccess.title}</h2>
            <p style={{ marginTop: 'var(--space-3)', color: 'var(--text-secondary)', fontSize: 'var(--text-base)', lineHeight: 1.7, maxWidth: 600, margin: 'var(--space-3) auto 0' }}>
              {submittedSuccess.message}
            </p>
            <div style={{ marginTop: 'var(--space-8)', display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/dashboard" className="btn btn-primary btn-lg">
                Go to My Dashboard →
              </Link>
              <Link to="/explore" className="btn btn-outline btn-lg">
                Explore Other Causes
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} encType="multipart/form-data" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
            
            {/* Section 1: Campaign Story */}
            <div className="card" style={{ padding: 'var(--space-6)' }}>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span>🌱</span> Step 1: Campaign Details
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Campaign Title *</label>
                  <input
                    type="text"
                    name="title"
                    id="campaign-title"
                    className="form-input"
                    value={form.title}
                    onChange={handleChange}
                    required
                    minLength={5}
                    maxLength={200}
                    placeholder="e.g. Free Eye Surgery for 50 Underprivileged Children"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    name="category"
                    id="campaign-category"
                    className="form-select"
                    value={form.category}
                    onChange={handleChange}
                    required
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Description & Story *</label>
                  <textarea
                    name="description"
                    id="campaign-description"
                    className="form-textarea"
                    value={form.description}
                    onChange={handleChange}
                    required
                    minLength={20}
                    rows={6}
                    placeholder="Explain why this cause needs help, who will benefit, and how each rupee will be responsibly spent."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
                  <div className="form-group">
                    <label className="form-label">Target Goal (₹) *</label>
                    <input
                      type="number"
                      name="targetAmount"
                      id="campaign-target"
                      className="form-input"
                      value={form.targetAmount}
                      onChange={handleChange}
                      required
                      min={100}
                      placeholder="e.g. 250000"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Fundraiser Deadline *</label>
                    <input
                      type="date"
                      name="deadline"
                      id="campaign-deadline"
                      className="form-input"
                      value={form.deadline}
                      onChange={handleChange}
                      required
                      min={minDeadline}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Main Image & Proof Documents */}
            <div className="card" style={{ padding: 'var(--space-6)' }}>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span>🖼️</span> Step 2: Cover Photo & Supporting Proof
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)', flexWrap: 'wrap' }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      Main Front Cover Image {isEdit ? '(upload to change)' : '*'}
                    </label>
                    {appConfig && (
                      <span style={{ fontSize: 'var(--text-xs)', color: appConfig.storage?.provider === 's3' ? 'var(--color-primary)' : 'var(--text-muted)', fontWeight: 600 }}>
                        {appConfig.storage?.provider === 's3'
                          ? `☁️ AWS S3 (${appConfig.storage.bucket})`
                          : '💾 Local Storage'}
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    name="image"
                    id="campaign-image"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleChange}
                    required={!isEdit}
                  />
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Accepted: JPEG, PNG, WebP · Max 5 MB. This will be the hero picture displayed on your campaign card.
                  </p>
                </div>

                <div className="form-group" style={{ background: 'var(--bg-elevated)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-default)' }}>
                  <label className="form-label">
                    Supporting Proof Documents / Receipts (Optional · Up to 3 files)
                  </label>
                  <input
                    type="file"
                    name="proofDocuments"
                    id="campaign-proof-docs"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    multiple
                    onChange={handleProofFilesChange}
                  />
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                    Accepted: JPEG, PNG, WebP, or PDF (e.g. Hospital treatment estimate, NGO registration, student fees bill, quotation).
                  </p>

                  {proofFiles.length > 0 && (
                    <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      {proofFiles.map((f, i) => (
                        <span key={i} className="badge badge-info" style={{ fontSize: 'var(--text-xs)' }}>
                          📎 {f.name} ({(f.size / 1024).toFixed(0)} KB)
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Identity & KYC Verification (Mandatory for Admin Approval) */}
            <div className="card" style={{ padding: 'var(--space-6)', border: '1px solid #bbf7d0', background: '#fcfdfd' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <span style={{ fontSize: '1.25rem' }}>🛡️</span>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                  Step 3: Organizer KYC & Trust Verification
                </h3>
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                To protect donors from fraud, Fundit administrators require one valid Government ID and verified contact details before approving any campaign.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
                  <div className="form-group">
                    <label className="form-label">Government ID Type *</label>
                    <select
                      name="govIdType"
                      className="form-select"
                      value={form.govIdType}
                      onChange={handleChange}
                      required
                    >
                      {GOV_ID_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Government ID Number *</label>
                    <input
                      type="text"
                      name="govIdNumber"
                      className="form-input"
                      value={form.govIdNumber}
                      onChange={handleChange}
                      required
                      placeholder="e.g. XXXX-XXXX-1234 or ABCDE1234F"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Organizer Mobile Number *</label>
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
                      name="phone"
                      className="form-input"
                      style={{ flex: 1 }}
                      value={form.phone}
                      onChange={handleChange}
                      required
                      placeholder="9876543210"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Residential / Organization Address *</label>
                  <textarea
                    name="address"
                    className="form-textarea"
                    rows={2}
                    value={form.address}
                    onChange={handleChange}
                    required
                    placeholder="Enter full address including city and pincode"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ flex: 1, minWidth: 200, justifyContent: 'center' }}
                disabled={loading}
              >
                {loading
                  ? 'Submitting for Review…'
                  : isEdit
                  ? 'Save Campaign Changes'
                  : '🚀 Submit Campaign for Admin Review'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-lg"
                onClick={() => navigate(-1)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
