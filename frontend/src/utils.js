/** Reusable formatting helpers used across the application. */

/** Format a number as Indian Rupees */
export function formatRupees(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Return a human-readable relative date, e.g. "3 days left" or "Ended 2 days ago" */
export function daysLeft(deadline) {
  const now = new Date();
  const end = new Date(deadline);
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `Ended ${Math.abs(diff)} day${Math.abs(diff) !== 1 ? 's' : ''} ago`;
  if (diff === 0) return 'Last day!';
  return `${diff} day${diff !== 1 ? 's' : ''} left`;
}

/** Format a date string to "dd Mon yyyy" */
export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Clamp a percentage to 0–100 for display without altering actual values. */
export function clampPercent(pct) {
  return Math.min(Math.max(Math.round(pct), 0), 100);
}
