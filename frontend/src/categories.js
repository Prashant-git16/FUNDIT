/**
 * categories.js — Frontend mirror of the backend category list.
 * Kept in sync with backend/categories.js.
 */
export const CATEGORIES = [
  { id: 'healthcare',      label: 'Healthcare',        icon: '🏥' },
  { id: 'education',       label: 'Education',         icon: '📚' },
  { id: 'disaster_relief', label: 'Disaster Relief',   icon: '🆘' },
  { id: 'animal_welfare',  label: 'Animal Welfare',    icon: '🐾' },
  { id: 'environment',     label: 'Environment',       icon: '🌿' },
  { id: 'shelter_housing', label: 'Shelter & Housing', icon: '🏠' },
];

export function getCategoryLabel(id) {
  return CATEGORIES.find((c) => c.id === id)?.label || id;
}
export function getCategoryIcon(id) {
  return CATEGORIES.find((c) => c.id === id)?.icon || '📌';
}
