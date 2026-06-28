// =============================================================================
// SCORING (§4) + TRUST MODEL (§3) + OPPORTUNITY FILTERS (§5)
// =============================================================================
//   HotspotScore(h, m) = Σ_s [ frequency(s, h, m) × photoability(s) ]
// normalized 0–100 across hotspots for that month. Multiply, don't add — a bird
// must be both PRESENT and SHOOTABLE to contribute.
//
// Trust shrinkage: a sparse hotspot's score is pulled toward 0 before ranking,
// so an Exploratory/Inferred spot never outranks a Documented one on the
// strength of thin data. The shrink factor is shown in the UI.
// =============================================================================

import { SPECIES } from '../data/species.js';
import { frequency, seasonality, habitatAffinity } from './inference.js';

// --- Trust tags (§3) --------------------------------------------------------
// Driven by checklist count N for the month. Without real N (build script not
// run), a hotspot is "Inferred": the whole row came from the model.
export const TRUST = {
  documented:  { key: 'documented',  label: 'Documented',  color: '#2e7d32', blurb: 'Heavy eBird coverage — frequencies are trustworthy.' },
  opportunity: { key: 'opportunity', label: 'Opportunity', color: '#1565c0', blurb: 'Thin coverage, but a similar nearby hotspot anchors the estimate.' },
  exploratory: { key: 'exploratory', label: 'Exploratory', color: '#8e24aa', blurb: 'Thin coverage and no good neighbour — genuinely unknown.' },
  thin:        { key: 'thin',        label: 'Thin',        color: '#9e9e9e', blurb: 'Well covered, but little photographable diversity — "people looked, it’s barren."' },
  inferred:    { key: 'inferred',    label: 'Inferred',    color: '#b8860b', blurb: 'No eBird histogram loaded yet — this row is the habitat/season model. Run the build script for real data.' },
};

const DOCUMENTED_N = 30;   // ≥ ~30 checklists/month bin ⇒ trustworthy (§3)
const THIN_SCORE = 25;     // normalized score below this + high N ⇒ "Thin"

/** Total checklists for a hotspot in a month (null if no real effort data). */
export function checklistN(hotspot, monthIdx) {
  const n = hotspot.checklistsByMonth?.[monthIdx];
  return typeof n === 'number' ? n : null;
}

/**
 * Raw (un-normalized) photographer score for a hotspot in a month, plus the
 * per-species contributions used by the detail matrix.
 */
export function rawHotspotScore(hotspot, monthIdx, species = SPECIES) {
  let raw = 0;
  let anyInferred = false;
  const contributions = [];
  for (const s of species) {
    const f = frequency(s, hotspot, monthIdx);
    if (f.inferred) anyInferred = true;
    const contrib = f.value * s.photoability;
    if (contrib > 0) {
      contributions.push({ species: s, freq: f, photoability: s.photoability, contrib });
    }
    raw += contrib;
  }
  contributions.sort((a, b) => b.contrib - a.contrib);
  // How many *photographable* species this month are still on the model (their
  // freq is modeled, not eBird). Drives the "N inferred" chip — note this only
  // counts contributing species, so out-of-season modeled species don't inflate
  // it and a fully-real row shows no chip at all.
  const inferredCount = contributions.filter((c) => c.freq.inferred).length;
  return { raw, contributions, anyInferred, inferredCount };
}

/** Trust shrinkage factor 0–1 from checklist count N (James–Stein style). */
export function shrinkFactor(n) {
  if (n == null) return 0.7;                 // unknown effort ⇒ modest discount
  // Approaches 1 as N grows past the "documented" threshold.
  return n / (n + DOCUMENTED_N);
}

/**
 * Rank all hotspots for a month. Returns rows with normalized 0–100 score,
 * trust tag, N, top species, and the raw contributions for the detail view.
 */
export function rankHotspots(hotspots, monthIdx, opts = {}) {
  const species = opts.species || SPECIES;
  const rows = hotspots.map((h) => {
    const { raw, contributions, anyInferred, inferredCount } = rawHotspotScore(h, monthIdx, species);
    const n = checklistN(h, monthIdx);
    const shrink = shrinkFactor(n);
    return { hotspot: h, raw, shrunk: raw * shrink, contributions, anyInferred, inferredCount, n, shrink };
  });

  const maxShrunk = Math.max(1e-9, ...rows.map((r) => r.shrunk));
  for (const r of rows) {
    r.score = Math.round((r.shrunk / maxShrunk) * 100);
    r.trust = trustTag(r);
    // "photographable diversity": how many species clear a real-keeper bar.
    r.diversity = r.contributions.filter((c) => c.contrib >= 0.15).length;
  }
  rows.sort((a, b) => b.score - a.score);
  return rows;
}

function trustTag(row) {
  // No real frequency data anywhere in the row ⇒ Inferred (honest default).
  if (row.anyInferred && row.n == null) return TRUST.inferred;
  if (row.n == null) return TRUST.exploratory;
  if (row.n >= DOCUMENTED_N) {
    return row.score < THIN_SCORE ? TRUST.thin : TRUST.documented;
  }
  // Low N: Opportunity if a same-habitat neighbour exists, else Exploratory.
  // (Neighbour inheritance is a build-script enrichment; default to Exploratory.)
  return TRUST.exploratory;
}

// --- Opportunity filters (§5) ----------------------------------------------
// All four are filters/sorts over the SAME score, not separate datasets.
export const FILTERS = {
  all: {
    key: 'all', label: 'All', hint: 'Every hotspot, ranked by photographer score this month.',
    apply: (rows) => rows,
  },
  shootNow: {
    key: 'shootNow', label: 'Shoot Now',
    hint: 'High score + trustworthy coverage this month — go now.',
    apply: (rows) => rows
      .filter((r) => r.score >= 60 && (r.trust === TRUST.documented))
      .concat(rows.filter((r) => r.score >= 60 && r.trust !== TRUST.documented))
      .filter((r, i, a) => a.indexOf(r) === i),
  },
  underrated: {
    key: 'underrated', label: 'Underrated',
    hint: 'High photographable potential but thin coverage — untapped & promising.',
    apply: (rows) => rows
      .filter((r) => r.raw >= medianRaw(rows) && (r.n == null || r.n < DOCUMENTED_N))
      .sort((a, b) => b.raw - a.raw),
  },
  beDocumenter: {
    key: 'beDocumenter', label: 'Be the Documenter',
    hint: 'Low coverage + good habitat — your uploads would own the record.',
    apply: (rows) => rows
      .filter((r) => (r.n == null || r.n < DOCUMENTED_N) && r.contributions.length >= 5)
      .sort((a, b) => a.shrink - b.shrink || b.raw - a.raw),
  },
  thin: {
    key: 'thin', label: 'Skip / Thin',
    hint: 'Well covered but little to shoot — skip these (only earnable with real N).',
    apply: (rows) => rows.filter((r) => r.trust === TRUST.thin),
  },
};

function medianRaw(rows) {
  const xs = rows.map((r) => r.raw).sort((a, b) => a - b);
  return xs.length ? xs[Math.floor(xs.length / 2)] : 0;
}

// --- Species-centric query (§5 "search a species") -------------------------
/** Best places & months to photograph one species across the box. */
export function bestForSpecies(species, hotspots) {
  const perHotspot = hotspots.map((h) => {
    const months = Array.from({ length: 12 }, (_, m) => {
      const f = frequency(species, h, m);
      return { monthIdx: m, ...f, shootScore: f.value * species.photoability };
    });
    const best = months.reduce((a, b) => (b.shootScore > a.shootScore ? b : a), months[0]);
    return { hotspot: h, months, best };
  });
  perHotspot.sort((a, b) => b.best.shootScore - a.best.shootScore);
  return perHotspot;
}

export { seasonality, habitatAffinity };
