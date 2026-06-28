// =============================================================================
// FREQUENCY — REAL when available, otherwise a TRANSPARENT INFERENCE MODEL
// =============================================================================
// The spec forbids fabricated numbers (§0). It explicitly ALLOWS "inferred"
// values as long as they are labelled and the inference rule is shown (§3, §6).
// This module is that rule, in code. Every value it returns carries:
//   { value, inferred: <bool>, rule: <human string>, source: 'ebird'|'model' }
//
// Resolution order for frequency(species, hotspot, month):
//   1. If the hotspot has REAL histogram data for that species/month
//      (hotspot.freqByMonth, loaded by the build script) → use it, inferred:false.
//   2. Otherwise compute the model estimate, inferred:true.
//
// THE MODEL (deliberately simple and inspectable):
//   freq = abundance(s) × habitatAffinity(s, hotspot) × seasonality(s, month)
//   - abundance         : species prior, 0–1 (how common in the box overall)
//   - habitatAffinity   : MAX over the hotspot's habitats of the species'
//                         affinity for that habitat (a bird needs one suitable
//                         habitat, not all of them)
//   - seasonality       : 0–1 monthly presence from the species' status curve
//                         (or its explicit `monthly` override)
//   Multiplied, not added: a bird must be present (season) AND in a habitat it
//   uses AND generally common to score. This mirrors the spec's "multiply" rule.
// =============================================================================

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Status → 12-month presence curve (Jan..Dec), 0–1. Hand-tuned, documented.
const STATUS_CURVES = {
  //          J    F    M    A    M    J    J    A    S    O    N    D
  resident: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
  winter:   [1.0, 1.0, 0.8, 0.4, 0.1, 0.0, 0.0, 0.0, 0.1, 0.5, 0.9, 1.0],
  summer:   [0.0, 0.0, 0.2, 0.7, 1.0, 1.0, 1.0, 0.9, 0.5, 0.1, 0.0, 0.0],
  migrant:  [0.1, 0.1, 0.3, 0.8, 0.9, 0.3, 0.2, 0.3, 0.8, 0.7, 0.2, 0.1],
};

export const STATUS_LABEL = {
  resident: 'Year-round resident',
  winter: 'Winter visitor (Nov–Mar)',
  summer: 'Summer breeder (Apr–Aug)',
  migrant: 'Migrant (spring & fall passage)',
};

/** Seasonal presence 0–1 for a species in a month (0=Jan..11=Dec). */
export function seasonality(species, monthIdx) {
  if (Array.isArray(species.monthly)) return clamp01(species.monthly[monthIdx]);
  const curve = STATUS_CURVES[species.status] || STATUS_CURVES.resident;
  return curve[monthIdx];
}

/** Best-matching habitat affinity 0–1 for a species at a hotspot. */
export function habitatAffinity(species, hotspot) {
  let best = 0;
  for (const hab of hotspot.habitats) {
    const a = species.habitats[hab] || 0;
    if (a > best) best = a;
  }
  return best;
}

/**
 * Frequency of `species` at `hotspot` in month `monthIdx` (0–11).
 * Returns { value, inferred, source, rule }.
 */
export function frequency(species, hotspot, monthIdx) {
  // 1) Real data path (populated by scripts/build-reference.mjs).
  const real = hotspot.freqByMonth?.[species.code]?.[monthIdx];
  if (typeof real === 'number') {
    return {
      value: clamp01(real),
      inferred: false,
      source: 'ebird',
      rule: 'eBird histogram frequency (share of checklists reporting this species this month).',
    };
  }

  // 2) Inference model.
  const a = species.abundance ?? 0.5;
  const h = habitatAffinity(species, hotspot);
  const s = seasonality(species, monthIdx);
  const value = clamp01(a * h * s);
  return {
    value,
    inferred: true,
    source: 'model',
    rule: `inferred = abundance(${a.toFixed(2)}) × habitat(${h.toFixed(2)}) × season(${s.toFixed(2)}) = ${value.toFixed(2)}`,
  };
}

/** 12-month frequency series for a species at a hotspot (for sparklines). */
export function frequencySeries(species, hotspot) {
  return MONTHS.map((_, m) => frequency(species, hotspot, m));
}

export function clamp01(x) {
  if (typeof x !== 'number' || Number.isNaN(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
