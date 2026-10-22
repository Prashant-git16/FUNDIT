import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import CampaignCard from '../components/CampaignCard';
import { CATEGORIES } from '../categories';
import api from '../api';

const SORT_OPTIONS = [
  { value: 'newest',       label: 'Newest First' },
  { value: 'most_raised',  label: 'Most Funded' },
  { value: 'ending_soon',  label: 'Ending Soon' },
];

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Read filter state from URL so links and back-button work correctly
  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'newest';
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Debounced search: wait 400 ms after the user stops typing before fetching
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => {
      updateParam('search', searchInput, true);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]); // eslint-disable-line

  function updateParam(key, value, resetPage = false) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    if (resetPage) next.delete('page');
    setSearchParams(next);
  }

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page, sort });
    if (category) params.set('category', category);
    if (search)   params.set('search',   search);

    try {
      const data = await api.get(`/api/campaigns?${params}`);
      setCampaigns(data.campaigns);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, sort, category, search]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  function goToPage(p) { updateParam('page', p); }

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div className="container">
          <h1 className="page-header__title">Explore Campaigns</h1>
          <p className="page-header__subtitle">Discover causes and make a difference today</p>
        </div>
      </div>

      <div className="container" style={{ padding: 'var(--space-8) var(--space-6)' }}>
        {/* ─── Filters ──────────────────────────────────────── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-6)', alignItems: 'center' }}>
          {/* Search */}
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search campaigns…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search campaigns"
            />
          </div>

          {/* Sort */}
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={sort}
            onChange={(e) => updateParam('sort', e.target.value, true)}
            aria-label="Sort campaigns"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Category pills */}
        <div className="category-pills" style={{ marginBottom: 'var(--space-8)' }}>
          <button
            className={`category-pill${!category ? ' active' : ''}`}
            onClick={() => updateParam('category', '', true)}
          >
            <span className="category-pill__icon">✨</span>
            <span>All</span>
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`category-pill${category === cat.id ? ' active' : ''}`}
              onClick={() => updateParam('category', cat.id, true)}
            >
              <span className="category-pill__icon">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Results */}
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : error ? (
          <div className="alert alert-error">{error}</div>
        ) : campaigns.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">🔭</div>
            <div className="empty-state__title">No campaigns found</div>
            <div className="empty-state__message">
              {search || category
                ? 'Try a different search or remove the category filter.'
                : 'Be the first to start a campaign!'}
            </div>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
              Showing {campaigns.length} of {pagination?.total} campaigns
            </p>
            <div className="campaign-grid">
              {campaigns.map((c) => <CampaignCard key={c.id} campaign={c} />)}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="pagination">
                <button
                  className="pagination__btn"
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                  aria-label="Previous page"
                >
                  ‹
                </button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    className={`pagination__btn${p === page ? ' active' : ''}`}
                    onClick={() => goToPage(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className="pagination__btn"
                  disabled={page >= pagination.totalPages}
                  onClick={() => goToPage(page + 1)}
                  aria-label="Next page"
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
