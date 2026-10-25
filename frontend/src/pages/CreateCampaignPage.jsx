import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CATEGORIES } from '../categories';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function CreateCampaignPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams(); // present when editing

  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    title: '', category: 'healthcare', description: '',
    targetAmount: '', deadline: '', image: null,
  });
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
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setFetchLoading(false));
  }, [id, isEdit]);

  function handleChange(e) {
    const { name, value, files } = e.target;
    if (name === 'image') {
      setForm((f) => ({ ...f, image: files[0] }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('category', form.category);
    fd.append('description', form.description);
    fd.append('targetAmount', form.targetAmount);
    fd.append('deadline', form.deadline);
    if (form.image) fd.append('image', form.image);

    try {
      if (isEdit) {
        await api.patchForm(`/api/campaigns/${id}`, fd);
        setSuccess('Campaign updated successfully!');
      } else {
        const { campaign } = await api.postForm('/api/campaigns', fd);
        navigate(`/campaign/${campaign.id}`);
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
      <div className="page-header">
        <div className="container">
          <h1 className="page-header__title">{isEdit ? 'Edit Campaign' : 'Start a Fundraiser'}</h1>
          <p className="page-header__subtitle">Tell your story and inspire people to give</p>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 720, padding: 'var(--space-10) var(--space-6)' }}>
        {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-5)' }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom: 'var(--space-5)' }}>{success}</div>}

        <form onSubmit={handleSubmit} encType="multipart/form-data" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
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
              placeholder="e.g. Free medical treatment for 50 children"
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
            <label className="form-label">Description *</label>
            <textarea
              name="description"
              id="campaign-description"
              className="form-textarea"
              value={form.description}
              onChange={handleChange}
              required
              minLength={20}
              rows={8}
              placeholder="Describe your campaign in detail. Why does it matter? How will the funds be used?"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
            <div className="form-group">
              <label className="form-label">Fundraising Goal (₹) *</label>
              <input
                type="number"
                name="targetAmount"
                id="campaign-target"
                className="form-input"
                value={form.targetAmount}
                onChange={handleChange}
                required
                min={100}
                placeholder="e.g. 50000"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Deadline *</label>
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

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
              <label className="form-label" style={{ margin: 0 }}>Campaign Image {isEdit ? '(upload to change)' : '*'}</label>
              {appConfig && (
                <span style={{ fontSize: 'var(--text-xs)', color: appConfig.storage?.provider === 's3' ? 'var(--color-primary)' : 'var(--text-muted)', fontWeight: 600 }}>
                  {appConfig.storage?.provider === 's3'
                    ? `☁️ AWS S3 (${appConfig.storage.bucket} · ${appConfig.storage.region})`
                    : '💾 Local Disk Storage'}
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
              Accepted: JPEG, PNG, WebP · Max 5 MB
            </p>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Launch Campaign')}
            </button>
            <button type="button" className="btn btn-ghost btn-lg" onClick={() => navigate(-1)}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
