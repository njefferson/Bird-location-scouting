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
  return el('span.badge.live', { title: 'From the live eBird recent-observations overlay.' }, txt);
}

export function nBadge(n) {
  if (n == null) return el('span.chip.dim', { title: 'No eBird checklist counts loaded — run the build script.' }, 'no coverage data');
  return el('span.chip', { title: `${n} eBird checklists were submitted here this month — more checklists means more trustworthy frequencies.` }, `${n} checklists`);
}
