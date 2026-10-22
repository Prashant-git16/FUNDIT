/**
 * categories.js — Centralised campaign category definitions.
 *
 * Every part of the application that needs categories imports from here.
 * To add or rename a category, edit only this file.
 */
const CATEGORIES = [
  { id: 'healthcare',      label: 'Healthcare',        icon: '🏥' },
  { id: 'education',       label: 'Education',         icon: '📚' },
  { id: 'disaster_relief', label: 'Disaster Relief',   icon: '🆘' },
  { id: 'animal_welfare',  label: 'Animal Welfare',    icon: '🐾' },
  { id: 'environment',     label: 'Environment',       icon: '🌿' },
  { id: 'shelter_housing', label: 'Shelter & Housing', icon: '🏠' },
];

const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

module.exports = { CATEGORIES, CATEGORY_IDS };
