import { Link } from 'react-router-dom';
import { formatRupees, daysLeft, clampPercent } from '../utils';
import { getCategoryLabel } from '../categories';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&q=80';

export default function CampaignCard({ campaign }) {
  const {
    id, title, category, imageUrl, raisedAmount, targetAmount,
    progressPercent, owner, deadline, status,
  } = campaign;

  const isExpiredOrClosed = status === 'expired' || status === 'closed';
  const pct = clampPercent(progressPercent);

  return (
    <Link to={`/campaign/${id}`} style={{ textDecoration: 'none' }}>
      <article className="card campaign-card">
        {/* Image */}
        <div className="campaign-card__image-wrap">
          <img
            src={imageUrl || PLACEHOLDER_IMAGE}
            alt={title}
            loading="lazy"
            onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
          />
          <span className="campaign-card__category-badge">
            {getCategoryLabel(category)}
          </span>
          {isExpiredOrClosed && (
            <span
              className="campaign-card__category-badge"
              style={{ right: 'var(--space-3)', left: 'auto', background: 'rgba(239,68,68,.8)' }}
            >
              {status === 'closed' ? 'Closed' : 'Ended'}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="campaign-card__body">
          <h3 className="campaign-card__title">{title}</h3>
          <p className="campaign-card__owner">by {owner?.name || 'Unknown'}</p>

          {/* Progress bar */}
          <div className="progress-bar-wrap">
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${pct}%` }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              <span>{pct}% funded</span>
              <span>{formatRupees(raisedAmount)} raised</span>
            </div>
          </div>

          {/* Stats */}
          <div className="campaign-card__stats">
            <div>
              <div className="campaign-card__stat-label">Goal</div>
              <div className="campaign-card__stat-value campaign-card__stat-value--accent">
                {formatRupees(targetAmount)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="campaign-card__stat-label">Deadline</div>
              <div className="campaign-card__stat-value" style={{ fontSize: 'var(--text-xs)' }}>
                {daysLeft(deadline)}
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
