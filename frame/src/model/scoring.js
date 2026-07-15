// =============================================================================
// OPPORTUNITY RANKING (§4) + TRUST MODEL (§3) + OPPORTUNITY FILTERS (§5)
// =============================================================================
//   opportunity(h, m) = Σ_s frequency(s, h, m) × weigh(s)   over the working set
// With photo-first on (the default), weigh() is the transparent facet-derived
// shootability from model/photo.js — present AND shootable, the app's stated
// job. With it off (or in target-presence mode) weigh is 1 and this is plain
// presence. The old HIDDEN per-species photoability stays gone (v23): the
// weight is a global, visible formula over the bird's published facets.
//
// `vis` is that presence total, trust-shrunk and normalized 0–100 — used ONLY
// to drive CSS colour intensity (pins, planner cells), never shown as a number.
// `diversity` is the honest headline: how many species clear a 5%-of-checklists
// bar this month ("N species likely").
//
// Trust shrinkage: a sparse hotspot's presence is pulled toward 0 before
// ranking, so an Exploratory/Inferred spot never outranks a Documented one on
// the strength of thin data. The shrink factor is shown in the UI.
// =============================================================================

import { SPECIES } from '../data/species.js';
import { frequency, seasonality, habitatAffinity } from './inference.js';

// A species "counts" toward diversity when it's reported on ≥5% of a month's
// checklists — an honest "you'd likely run into it" bar.
const KEEPER_FREQ = 0.05;

// --- Trust tags (§3) --------------------------------------------------------
// Driven by checklist count N for the month. Without real N (build script not
// run), a hotspot is "Inferred": the whole row came from the model.
export const TRUST = {
  documented:  { key: 'documented',  label: 'Documented',  color: '#3f7d54', blurb: 'Heavy eBird coverage — frequencies are trustworthy.' },
  opportunity: { key: 'opportunity', label: 'Opportunity', color: '#3f77a4', blurb: 'Thin coverage, but a similar nearby hotspot anchors the estimate.' },
  exploratory: { key: 'exploratory', label: 'Exploratory', color: '#8a6bab', blurb: 'Thin coverage and no good neighbour — genuinely unknown.' },
  thin:        { key: 'thin',        label: 'Thin',        color: '#9a8f7c', blurb: 'Well covered, but fewer than 3 species clear 5% of checklists this month — "people looked, it’s barren."' },
  inferred:    { key: 'inferred',    label: 'Inferred',    color: '#a9781f', blurb: 'No eBird histogram loaded yet — this row is the habitat/season model. Run the build script for real data.' },
};

const DOCUMENTED_N = 30;    // ≥ ~30 checklists/month bin ⇒ trustworthy (§3)
const THIN_DIVERSITY = 3;   // well-covered but < 3 keeper species ⇒ "Thin"

/** Total checklists for a hotspot in a month (null if no real effort data). */
export function checklistN(hotspot, monthIdx) {
  const n = hotspot.checklistsByMonth?.[monthIdx];
  return typeof n === 'number' ? n : null;
}

/**
 * Raw (un-normalized) opportunity total for a hotspot in a month, plus the
 * per-species contributions used by the detail views. Each contribution's
 * `contrib` is the species' frequency here this month × `weigh(species)`
 * (photo-first shootability by default; 1 when no weigh fn is given, which is
 * plain presence). `freq` always stays the unweighted fact for display.
 */
export function rawHotspotScore(hotspot, monthIdx, species = SPECIES, weigh = null) {
  let raw = 0;
  let anyInferred = false;
  const contributions = [];
  for (const s of species) {
    const f = frequency(s, hotspot, monthIdx);
    if (f.inferred) anyInferred = true;
    const w = weigh ? weigh(s) : 1;
    const contrib = f.value * w;
    if (contrib > 0) {
      contributions.push({ species: s, freq: f, contrib, weight: w });
    }
    raw += contrib;
  }
  contributions.sort((a, b) => b.contrib - a.contrib);
  // How many present species this month are still on the model (their freq is
  // modeled, not eBird). Drives the "N inferred" chip — only counts contributing
  // species, so out-of-season modeled species don't inflate it and a fully-real
  // row shows no chip at all.
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
 * Rank all hotspots for a month by PHOTOGRAPHIC OPPORTUNITY: presence, weighted
 * by opts.weigh when given (photo-first shootability; omit for plain presence).
 * Returns rows with:
 *   vis        — 0–100 trust-shrunk opportunity intensity (drives CSS colour only)
 *   diversity  — how many species clear the 5%-of-checklists bar ("N likely");
 *                ALWAYS pure presence, never weighted — the headline is a fact
 *   trust, n, contributions — for the badges and detail view.
 */
export function rankHotspots(hotspots, monthIdx, opts = {}) {
  const species = opts.species || SPECIES;
  const weigh = opts.weigh || null;
  // Is the working set narrowed by a list/facet mode? Trust is a COVERAGE fact
  // about the hotspot and must NOT vary with it (see coverageDiversity below).
  const narrowed = species !== SPECIES;
  const rows = hotspots.map((h) => {
    const { raw, contributions, anyInferred, inferredCount } = rawHotspotScore(h, monthIdx, species, weigh);
    const n = checklistN(h, monthIdx);
    const shrink = shrinkFactor(n);
    return { hotspot: h, raw, shrunk: raw * shrink, contributions, anyInferred, inferredCount, n, shrink };
  });

  const maxShrunk = Math.max(1e-9, ...rows.map((r) => r.shrunk));
  for (const r of rows) {
    r.vis = Math.round((r.shrunk / maxShrunk) * 100);
    // "N species likely": how many species clear the keeper bar this month —
    // on their real frequency, so the count never moves with ranking weights.
    r.diversity = r.contributions.filter((c) => c.freq.value >= KEEPER_FREQ).length;
    // Trust (Documented vs Thin) is a fact about the HOTSPOT's coverage, not
    // about the user's lists, so it's decided by the keeper count over the FULL
    // curated species set — identical to r.diversity in the default ranking,
    // but unaffected when a target/facet/new-for-me mode narrows the working
    // set. Without this, starring one target flips every well-covered spot to
    // "Thin" and Skip/Thin recommends skipping the county's best hotspots.
    r.coverageDiversity = narrowed ? coverageDiversity(r.hotspot, monthIdx) : r.diversity;
    r.trust = trustTag(r);
  }
  rows.sort((a, b) => b.shrunk - a.shrunk);
  return rows;
}

/** Keeper-species count over the FULL curated set (coverage, for trust). */
function coverageDiversity(hotspot, monthIdx) {
  let k = 0;
  for (const s of SPECIES) {
    if (frequency(s, hotspot, monthIdx).value >= KEEPER_FREQ) k++;
  }
  return k;
}

function trustTag(row) {
  // No real frequency data anywhere in the row ⇒ Inferred (honest default).
  if (row.anyInferred && row.n == null) return TRUST.inferred;
  if (row.n == null) return TRUST.exploratory;
  if (row.n >= DOCUMENTED_N) {
    // Well-covered but few species clear the keeper bar ⇒ Thin ("people looked,
    // it's barren"). Coverage diversity (full species set), not the possibly
    // narrowed working-set count, decides it.
    return row.coverageDiversity < THIN_DIVERSITY ? TRUST.thin : TRUST.documented;
  }
  // Low N: Opportunity if a same-habitat neighbour exists, else Exploratory.
  // (Neighbour inheritance is a build-script enrichment; default to Exploratory.)
  return TRUST.exploratory;
}

// --- Opportunity filters (§5) ----------------------------------------------
// All four are filters/sorts over the SAME presence ranking, not separate
// datasets. They ask a different question than the facet icons: not "which
// birds", but "where is it worth my time" given coverage.
export const FILTERS = {
  all: {
    key: 'all', label: 'All', hint: 'Every hotspot, ranked by bird presence this month.',
    apply: (rows) => rows,
  },
  shootNow: {
    key: 'shootNow', label: 'Shoot Now',
    hint: 'Lots of birds + trustworthy coverage this month — go now.',
    apply: (rows) => rows
      .filter((r) => r.vis >= 60 && (r.trust === TRUST.documented))
      .concat(rows.filter((r) => r.vis >= 60 && r.trust !== TRUST.documented))
      .filter((r, i, a) => a.indexOf(r) === i),
  },
  underrated: {
    key: 'underrated', label: 'Underrated',
    hint: 'High bird presence but thin coverage — untapped & promising.',
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
    hint: 'Well covered but few birds likely — skip these (only earnable with real N).',
    apply: (rows) => rows.filter((r) => r.trust === TRUST.thin),
  },
};

function medianRaw(rows) {
  const xs = rows.map((r) => r.raw).sort((a, b) => a - b);
  return xs.length ? xs[Math.floor(xs.length / 2)] : 0;
}

// --- Species-centric query (§5 "search a species") -------------------------
/**
 * Best places & months to find one species across the region, ranked by raw
 * FREQUENCY (where/when the bird actually is). Powers the "where & when" on a
 * species page and a starred bird — informational, presence only.
 */
export function bestForSpecies(species, hotspots) {
  const perHotspot = hotspots.map((h) => {
    const months = Array.from({ length: 12 }, (_, m) => {
      const f = frequency(species, h, m);
      return { monthIdx: m, ...f };
    });
    const best = months.reduce((a, b) => (b.value > a.value ? b : a), months[0]);
    return { hotspot: h, months, best };
  });
  perHotspot.sort((a, b) => b.best.value - a.best.value);
  return perHotspot;
}

export { seasonality, habitatAffinity };
