// =============================================================================
// DATA FRESHNESS — how old is the committed eBird histogram data, and how
// honest should the app be about it.
// =============================================================================
// Frame's data is seasonal frequency — WHICH birds, in WHICH months. Those
// patterns hold up for years, so staleness here is gentle, not a cliff: a
// year-old dataset is still a good field guide. But the app must never *pretend*
// to be fresh. Past a horizon it says, calmly, exactly how old it is — the
// "labels stay honest; every failure explains itself" rule from CLAUDE.md.
//
// The signal is the newest `builtAt` across the loaded county files
// (regionMeta().builtAt). This module is the single source of truth for the
// horizons, so the banner, Settings, and any future surface all agree.
// =============================================================================

// First honest whisper: six missed quarters. A late refresh (one or two skipped
// quarters) stays silent — this only speaks when the data is clearly older than
// the normal cadence.
export const AGING_MONTHS = 18;
// A genuine historical snapshot: three years. The app calls itself an archive.
export const ARCHIVED_MONTHS = 36;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Whole months elapsed from an ISO date string (`YYYY-MM-DD`) to `now`. Returns
 * null for a missing/unparseable date. The final month only counts once its day
 * of month is reached, so "built on the 15th" isn't a full month old until the
 * 15th of a later month.
 */
export function monthsSince(builtAt, now = new Date()) {
  if (!builtAt) return null;
  const [y, m, d] = String(builtAt).split('-').map(Number);
  if (!y || !m) return null;
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  if (now.getDate() < (d || 1)) months -= 1;
  return Math.max(0, months);
}

/** "July 2026" from "2026-07-15", or null if unparseable. */
export function monthYear(builtAt) {
  if (!builtAt) return null;
  const [y, m] = String(builtAt).split('-').map(Number);
  if (!y || !m || m < 1 || m > 12) return null;
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/**
 * Freshness verdict for a build date.
 *   tier:  'fresh' | 'aging' | 'archived'
 *   age:   whole months old (null if the date is missing/bad)
 *   label: human month/year of the build ("July 2026")
 * A missing or unparseable date is treated as 'fresh' — we never invent a
 * staleness warning we can't substantiate.
 */
export function freshness(builtAt, now = new Date()) {
  const age = monthsSince(builtAt, now);
  const label = monthYear(builtAt);
  let tier = 'fresh';
  if (age != null && age >= ARCHIVED_MONTHS) tier = 'archived';
  else if (age != null && age >= AGING_MONTHS) tier = 'aging';
  return { tier, age, builtAt, label };
}
