// Shared badge / chip renderers.
import { el } from './dom.js';

export function trustBadge(trust) {
  return el('span.badge', {
    title: trust.blurb,
    style: `--c:${trust.color}`,
  }, trust.label);
}

export function inferredChip(rule) {
  return el('span.chip.inferred', {
    title: rule || 'Estimated from the habitat/season model — not eBird data.',
  }, 'inferred');
}

/** Live "seen in last N days" badge (from the eBird overlay). */
export function liveBadge(daysAgo) {
  if (daysAgo == null) return null;
  const txt = daysAgo === 0 ? 'seen today' : `seen ${daysAgo}d ago`;
  return el('span.badge.live', { title: 'From the live eBird recent-observations overlay.' }, txt);
}

export function nBadge(n) {
  if (n == null) return el('span.chip.dim', { title: 'No eBird effort data loaded — run the build script.' }, 'N: —');
  return el('span.chip', { title: `${n} checklists this month (eBird effort).` }, `N: ${n}`);
}
