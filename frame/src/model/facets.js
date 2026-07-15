// =============================================================================
// FACET FILTER — a tri-state, on-device filter over the four species facets.
// =============================================================================
// Every guild/size/nest/behavior value is in one of three states:
//   neutral   — ignored (the default; nothing stored)
//   wanted    — must be one of these (within a facet, wanted values OR)
//   excluded  — never these (excluded always subtracts, even from wanted)
// Across facets the rules AND: a species must satisfy EACH facet that has any
// state set. A tap CYCLES neutral → wanted → excluded → neutral, so one gesture
// is one undo step and there is no separate "off" control to hunt for.
//
// The filtered species set flows through the single ranking seam
// (model/lists.js rankingSpec), so it composes with target-birds and
// New-for-me modes automatically. When active it shows a standing bar with a
// one-tap "Show all birds" exit (ui/facetbar.js), like the other modes.
//
// State (localStorage, on-device, no account):
//   frame.facets  JSON { guild:{wader:'wanted',…}, size:{…}, nest:{…}, behavior:{…} }
//                 Only non-neutral values are stored; neutral = key absent.
// =============================================================================

import { SPECIES } from '../data/species.js';
import { FACETS } from '../data/facets.js';

const KEY = 'frame.facets';
const FACET_KEYS = FACETS.map((f) => f.key);

function read() {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (!o || typeof o !== 'object') return {};
    // Keep only known facets and the two valid states.
    const out = {};
    for (const fk of FACET_KEYS) {
      const sub = o[fk];
      if (sub && typeof sub === 'object') {
        const clean = {};
        for (const [vk, st] of Object.entries(sub)) {
          if (st === 'wanted' || st === 'excluded') clean[vk] = st;
        }
        if (Object.keys(clean).length) out[fk] = clean;
      }
    }
    return out;
  } catch { return {}; }
}
function write(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ }
}

/** 'neutral' | 'wanted' | 'excluded' for one facet value. */
export function facetState(facetKey, valueKey) {
  return read()[facetKey]?.[valueKey] || 'neutral';
}

/** Cycle one value neutral → wanted → excluded → neutral. Returns the new state. */
export function cycleFacet(facetKey, valueKey) {
  const state = read();
  const cur = state[facetKey]?.[valueKey] || 'neutral';
  const next = cur === 'neutral' ? 'wanted' : cur === 'wanted' ? 'excluded' : 'neutral';
  const sub = { ...(state[facetKey] || {}) };
  if (next === 'neutral') delete sub[valueKey];
  else sub[valueKey] = next;
  if (Object.keys(sub).length) state[facetKey] = sub;
  else delete state[facetKey];
  write(state);
  return next;
}

/** Turn every facet filter off (the non-destructive "Show all birds" exit). */
export function clearFacets() { write({}); }

/** Any non-neutral value anywhere? */
export function facetsActive() {
  const s = read();
  return Object.keys(s).some((fk) => Object.keys(s[fk]).length > 0);
}

/**
 * Per-facet summary for the standing bar's chips:
 *   [{ facet, wanted: [valueKey…], excluded: [valueKey…] }] for active facets.
 */
export function facetSummary() {
  const s = read();
  return FACET_KEYS.map((fk) => {
    const sub = s[fk] || {};
    const wanted = Object.keys(sub).filter((k) => sub[k] === 'wanted');
    const excluded = Object.keys(sub).filter((k) => sub[k] === 'excluded');
    return (wanted.length || excluded.length) ? { facet: fk, wanted, excluded } : null;
  }).filter(Boolean);
}

/**
 * Does a species survive the current filter?
 *   within a facet: any excluded value the species has ⇒ OUT;
 *                   if any values are wanted, the species must match one;
 *   across facets: every constrained facet must pass (AND).
 */
export function speciesMatchesFacets(s, state = read()) {
  for (const fk of FACET_KEYS) {
    const sub = state[fk];
    if (!sub) continue;
    const val = s[fk];
    if (sub[val] === 'excluded') return false;
    const wanted = Object.keys(sub).filter((k) => sub[k] === 'wanted');
    if (wanted.length && !wanted.includes(val)) return false;
  }
  return true;
}

/** Filter a list of SPECIES objects by the active facet filter. */
export function applyFacetFilter(list = SPECIES) {
  const state = read();
  return list.filter((s) => speciesMatchesFacets(s, state));
}
