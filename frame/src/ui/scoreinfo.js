// =============================================================================
// ICON INFO — tap the "N species likely" chip (on a card or a hotspot header)
// to see what the bird icons mean and how this spot was worked out. A modal
// <dialog> (Esc / backdrop-click to close), built from a ranked row so it reads
// the same everywhere. Honest by construction: it shows the actual per-guild
// presence behind the icons and the coverage-trust discount, and says plainly
// that the icons are behavioural likelihood, not promises.
// =============================================================================
import { el, pct } from './dom.js';
import { trustBadge } from './badges.js';
import { SPECIES } from '../data/species.js';
import { GUILDS, GUILD_KEYS, facetSvg } from '../data/facets.js';
import { MONTHS, frequency } from '../model/inference.js';
import { targetCount, targetsRankActive } from '../model/targets.js';
import { seenCount, newBirdsActive } from '../model/seen.js';
import { facetsActive } from '../model/facets.js';

const LOTS = 0.5;   // guild Σ frequency ≥ this ⇒ "lots" (bright)
const SOME = 0.05;  // ≥ this ⇒ "some" (subdued)

// Open the icon explainer for a ranked row (from rankHotspots) in a given month.
export function openIconInfo(row, monthName) {
  const h = row.hotspot;
  const monthIdx = Math.max(0, MONTHS.indexOf(monthName));

  // Per-guild presence over ALL species, exactly as the card's icon row draws it.
  const sums = {}, realN = {};
  for (const s of SPECIES) {
    const f = frequency(s, h, monthIdx);
    if (f.value <= 0) continue;
    sums[s.guild] = (sums[s.guild] || 0) + f.value;
    if (!f.inferred) realN[s.guild] = (realN[s.guild] || 0) + 1;
  }
  const lit = GUILD_KEYS.filter((k) => (sums[k] || 0) >= SOME).sort((a, b) => sums[b] - sums[a]);
  const maxSum = Math.max(1e-9, ...lit.map((k) => sums[k]));

  const guildRows = lit.map((k) => {
    const g = sums[k];
    const level = g >= LOTS ? 'lots' : 'some';
    const inferred = !realN[k];
    return el('div.si-row', {}, [
      el('span.si-icon', { class: `fi fi-${level}${inferred ? ' inferred' : ''}`, html: facetSvg(GUILDS[k].icon, 20) }),
      el('span.si-sp', {}, GUILDS[k].label),
      el('span.si-bar', {}, el('i', { style: `width:${Math.round((g / maxSum) * 100)}%` })),
      el('span.si-vals', {}, `${pct(g)}${inferred ? ' *' : ''} · ${level}`),
    ]);
  });

  const shrinkPct = Math.round(row.shrink * 100);

  const body = el('div.si-body', {}, [
    el('p.si-lead', {}, [
      'These icons say ', el('strong', {}, 'which kinds of birds are actually here'),
      ' in ', el('strong', {}, monthName),
      ', from eBird checklist frequencies — ', el('strong', {}, 'behavioural likelihood, not promises'), '.',
    ]),

    targetsRankActive() ? el('p.si-targeting', {}, [
      el('strong', {}, `★ Ranking by presence of your ${targetCount()} target bird${targetCount() === 1 ? '' : 's'}.`),
      ' Only your starred birds are being counted. Turn it off from the ★ bar to count all birds again.',
    ]) : null,
    newBirdsActive() ? el('p.si-targeting', {}, [
      el('strong', {}, '✦ New for me.'),
      ` The ${seenCount()} bird${seenCount() === 1 ? '' : 's'} on your life list are set aside — only birds you haven’t got yet are counted. Turn it off from the ✦ bar.`,
    ]) : null,
    facetsActive() ? el('p.si-targeting', {}, [
      el('strong', {}, '⛃ Filtered.'),
      ' Only birds matching your icon filters are being counted. “Show all birds” on the filter bar clears it.',
    ]) : null,

    el('h3.si-h', {}, 'How bright an icon gets'),
    el('p.si-note', {}, [
      'A group lights up by how often its birds are reported here this month. ',
      el('strong', {}, 'Bright'), ' means its species together clear ', el('strong', {}, '50%'),
      ' of checklists — you’d expect one on roughly every other visit. ',
      el('strong', {}, 'Subdued'), ' means at least ', el('strong', {}, '5%'), '. Faint means barely noted.',
    ]),
    el('p.si-note', {}, [
      'A ', el('strong', {}, 'dashed'), ' icon means the numbers behind it are still the habitat/season ',
      'model, not real eBird data — treat it as a sketch until coverage fills in.',
    ]),

    lit.length ? el('h3.si-h', {}, `Groups here in ${monthName}`) : null,
    lit.length ? el('div.si-contribs', {}, guildRows) : null,
    lit.length ? el('p.si-legend', {}, 'Σ frequency of the group’s species · longer bar = more present. * = still on the habitat/season model.') : null,

    el('h3.si-h', {}, 'Coverage & trust'),
    el('p.si-trust', {}, [trustBadge(row.trust), ' ', row.trust.blurb]),
    el('p.si-note', {}, row.n == null
      ? `No eBird checklist counts are loaded here, so the signal is discounted to about ${shrinkPct}% until real coverage confirms it.`
      : `Based on ${row.n} eBird checklist${row.n === 1 ? '' : 's'} this month. Thin coverage is pulled toward 0 before ranking, so a barely-visited spot can’t out-rank a well-documented one on thin data — here we kept about ${shrinkPct}% of the raw signal.`),
    el('p.si-note.si-dim', {}, 'Colour intensity is scaled within each month, so a July spot and a January spot aren’t on the same absolute scale — each month is its own contest.'),
  ]);

  const dialog = el('dialog.si-dialog', {}, [
    el('button.si-close', { 'aria-label': 'Close', onclick: () => dialog.close() }, '×'),
    el('div.si-head', {}, [
      el('div.si-count', {}, [
        el('span.si-count-num', {}, String(row.diversity)),
        el('span.si-count-cap', {}, row.diversity === 1 ? 'species' : 'species'),
      ]),
      el('div.si-title', {}, [
        el('h2', {}, h.name),
        el('span.si-sub', {}, `${monthName} · likely species & bird groups`),
      ]),
    ]),
    body,
  ]);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}
