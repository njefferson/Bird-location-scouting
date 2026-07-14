// =============================================================================
// SCORE INFO — tap any score to see what it means and how it was worked out.
// A modal <dialog> (Esc / backdrop-click to close) built from a ranked row, so
// it works the same from the Ranking cards, the Planner cells and a hotspot's
// detail header. Honest by construction: it shows the actual species behind the
// number and the coverage-trust discount, not a hand-wave.
// =============================================================================
import { el, pct } from './dom.js';
import { trustBadge } from './badges.js';
import { targetsActive, targetCount } from '../model/targets.js';

// Open the explainer for a ranked row (from rankHotspots) in a given month.
export function openScoreInfo(row, monthName) {
  const h = row.hotspot;
  const top = row.contributions.slice(0, 6);
  const maxContrib = Math.max(1e-9, ...row.contributions.map((c) => c.contrib));
  const shrinkPct = Math.round(row.shrink * 100);

  const contribRows = top.map((c) => el('div.si-row', {}, [
    el('span.si-sp', {}, c.species.name + (c.freq.inferred ? ' *' : '')),
    el('span.si-bar', {}, el('i', { style: `width:${Math.round((c.contrib / maxContrib) * 100)}%` })),
    el('span.si-vals', {}, `${pct(c.freq.value)} × ${c.photoability.toFixed(2)}`),
  ]));

  const body = el('div.si-body', {}, [
    el('p.si-lead', {}, [
      'A photographer’s score from ', el('strong', {}, '0–100'), ' for ', el('strong', {}, monthName),
      '. ', el('strong', {}, '100'), ' is the best hotspot in your region this month; every other score is scaled against it.',
    ]),
    targetsActive() ? el('p.si-targeting', {}, [
      el('strong', {}, `★ Ranking your ${targetCount()} target bird${targetCount() === 1 ? '' : 's'}.`),
      ' Only the species on your list count toward this score — turn it off from the ★ bar to rank all birds again.',
    ]) : null,
    el('p.si-formula', {}, 'score  ∝  Σ  frequency × photoability'),
    el('p.si-note', {}, [
      'For each bird, two things must both be true — so we ', el('strong', {}, 'multiply'),
      ', never add: how often it’s reported here this month (', el('em', {}, 'frequency'),
      '), and how shootable it is (', el('em', {}, 'photoability'), '). A common bird you can’t get near and a stunning bird that’s never here both add little.',
    ]),

    top.length ? el('h3.si-h', {}, `Top of this ${monthName} score`) : null,
    top.length ? el('div.si-contribs', {}, contribRows) : null,
    top.length ? el('p.si-legend', {}, 'frequency × photoability · longer bar = more of the score. * = a value still on the habitat/season model.') : null,

    el('h3.si-h', {}, 'Coverage & trust'),
    el('p.si-trust', {}, [trustBadge(row.trust), ' ', row.trust.blurb]),
    el('p.si-note', {}, row.n == null
      ? `No eBird checklist counts are loaded here, so the raw signal is discounted to about ${shrinkPct}% until real coverage confirms it.`
      : `Based on ${row.n} eBird checklist${row.n === 1 ? '' : 's'} this month. Thin coverage is pulled toward 0 before ranking, so a barely-visited spot can’t out-rank a well-documented one on thin data — here we kept about ${shrinkPct}% of the raw signal.`),
    el('p.si-note.si-dim', {}, 'Scores are normalized within each month, so a July 80 and a January 80 aren’t the same bird count — each month is its own contest.'),
  ]);

  const dialog = el('dialog.si-dialog', {}, [
    el('button.si-close', { 'aria-label': 'Close', onclick: () => dialog.close() }, '×'),
    el('div.si-head', {}, [
      el('div.si-score', { style: `--s:${row.score}` }, [
        el('span.si-score-num', {}, String(row.score)),
        el('span.si-score-cap', {}, 'score'),
      ]),
      el('div.si-title', {}, [
        el('h2', {}, h.name),
        el('span.si-sub', {}, `${monthName} · photographer’s score`),
      ]),
    ]),
    body,
  ]);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}
