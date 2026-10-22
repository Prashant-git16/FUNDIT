import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import CampaignCard from '../components/CampaignCard';
import { CATEGORIES } from '../categories';
import api from '../api';
import { formatRupees } from '../utils';

const STATS = [
  { value: '₹2.4Cr+', label: 'Raised' },
  { value: '1,200+', label: 'Campaigns' },
  { value: '45,000+', label: 'Donors' },
];

const HOW_IT_WORKS = [
  { icon: '✏️', title: 'Create a Campaign', desc: 'Set your goal, tell your story, and upload images in minutes.' },
  { icon: '📣', title: 'Share & Spread', desc: 'Share with your network. Every share increases your reach.' },
  { icon: '💳', title: 'Receive Donations', desc: 'Supporters donate securely via Razorpay. Funds go to your account.' },
  { icon: '📊', title: 'Stay Transparent', desc: 'Post expense reports so donors can see where funds are used.' },
];

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  useEffect(() => {
    api.get('/api/campaigns?limit=6&sort=most_raised')
      .then(({ campaigns }) => setFeatured(campaigns))
      .catch(console.error)
      .finally(() => setLoadingFeatured(false));
  }, []);

  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────── */}
      <section className="hero">
        <div className="container hero__inner">
          <div>
            <h1 className="hero__title">
              Fund the causes<br />
              <em>you believe in</em>
            </h1>
            <p className="hero__subtitle">
              Fundit is India's transparent crowdfunding platform. Start a campaign for healthcare, education, disaster relief, and more — or support one today.
            </p>
            <div className="hero__cta">
              <Link to="/explore" className="btn btn-accent btn-lg">
                🔍 Explore Campaigns
              </Link>
              <Link to="/create-campaign" className="btn btn-outline btn-lg" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)' }}>
                + Start a Fundraiser
              </Link>
            </div>

            <div className="hero__stats">
              {STATS.map((s) => (
                <div key={s.label}>
                  <div className="hero__stat-value">{s.value}</div>
                  <div className="hero__stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right side visual card stack */}
          <div className="hero__visual" aria-hidden="true">
            <div className="card" style={{ padding: 'var(--space-4)', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)', color: '#fff' }}>
              <div style={{ fontSize: 'var(--text-sm)', opacity: 0.6, marginBottom: 'var(--space-2)' }}>Latest campaign</div>
              <div style={{ fontWeight: 700 }}>Free Eye Surgery for Children</div>
              <div style={{ marginTop: 'var(--space-3)', background: 'rgba(255,255,255,.15)', borderRadius: '999px', height: 6 }}>
                <div style={{ width: '71%', height: '100%', background: 'var(--color-accent-light)', borderRadius: '999px' }} />
              </div>
              <div style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)', opacity: 0.6 }}>71% funded · ₹1,78,000 raised</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Categories ────────────────────────────────────── */}
      <section className="section" style={{ paddingBottom: 'var(--space-8)' }}>
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Browse by <span>Category</span></h2>
          </div>
          <div className="category-pills">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                to={`/explore?category=${cat.id}`}
                className="category-pill"
              >
                {cat.icon} {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Featured campaigns ─────────────────────────────── */}
      <section className="section" style={{ paddingTop: 'var(--space-8)' }}>
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Featured <span>Campaigns</span></h2>
            <Link to="/explore" className="btn btn-outline btn-sm">View All →</Link>
          </div>

          {loadingFeatured ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : featured.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">📭</div>
              <div className="empty-state__title">No campaigns yet</div>
              <div className="empty-state__message">Be the first to start a campaign!</div>
              <Link to="/create-campaign" className="btn btn-primary">Start a Fundraiser</Link>
            </div>
          ) : (
            <div className="campaign-grid">
              {featured.map((c) => <CampaignCard key={c.id} campaign={c} />)}
            </div>
          )}
        </div>
      </section>

      {/* ─── How it works ────────────────────────────────────── */}
      <section className="section" style={{ background: 'var(--bg-elevated)' }}>
        <div className="container">
          <div className="section-header" style={{ justifyContent: 'center' }}>
            <h2 className="section-title" style={{ textAlign: 'center' }}>How <span>Fundit</span> Works</h2>
          </div>
          <div className="steps-grid">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.title} className="step-card">
                <div className="step-icon">{step.icon}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ──────────────────────────────────────── */}
      <section className="section" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: '#fff', marginBottom: 'var(--space-4)' }}>
            Ready to make a difference?
          </h2>
          <p style={{ color: 'rgba(255,255,255,.8)', marginBottom: 'var(--space-8)', fontSize: 'var(--text-lg)' }}>
            Start your fundraiser today or discover campaigns that need your support.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/create-campaign" className="btn btn-accent btn-lg">Start a Fundraiser</Link>
            <Link to="/explore" className="btn btn-lg" style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: '1px solid rgba(255,255,255,.3)' }}>Browse Campaigns</Link>
          </div>
        </div>
      </section>
    </>
  );
}
