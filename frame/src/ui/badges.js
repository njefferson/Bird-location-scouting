// Shared badge / chip renderers.
import { el } from './dom.js';

export function trustBadge(trust) {
  return el('span.badge', {
    title: trust.blurb,
    style: `--c:${trust.color}`,
  }, trust.label);
}

export function inferredChip(count, rule) {
  if (!count) return null; // every photographable species this month is real eBird
  return el('span.chip.inferred', {
    title: rule || `${count} of this month's photographable species are estimated from the habitat/season model — the rest are eBird data.`,
  }, `${count} inferred`);
}

/** Live "seen in last N days" badge (from the eBird overlay). */
export function liveBadge(daysAgo) {
  if (daysAgo == null) return null;
  const txt = daysAgo === 0 ? 'seen today' : `seen ${daysAgo}d ago`;
  // Honesty: the overlay is one query around the active region's center
  // (~30 km), so this says a top species was reported somewhere in the area —
  // not at this hotspot.
  return el('span.badge.live', { title: 'One of this card’s top species was reported to eBird in the area (somewhere around the active region, not necessarily this hotspot).' }, txt);
}

export function nBadge(n) {
  if (n == null) return el('span.chip.dim', { title: 'No eBird checklist counts loaded — run the build script.' }, 'no coverage data');
  return el('span.chip', { title: `${n} eBird checklists were submitted here this month — more checklists means more trustworthy frequencies.` }, `${n} checklists`);
}
