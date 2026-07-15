// =============================================================================
// PHOTO-FIRST RANKING (v24) — the transparent "shootable" half of the ranking.
// =============================================================================
// Frame's documented identity is "ranked by photographic opportunity: present
// AND shootable". v23 removed the old hidden per-species 0–1 photoability (one
// hand-picked guess per bird buried in a single number) and left presence only.
// This module restores the "shootable" half HONESTLY:
//
//   shootability(s) = SHOOT_BEHAVIOR[s.behavior] × SHOOT_SIZE[s.size]
//
// Both inputs are the species' published, checkable facets (the same icons on
// every card), and the two mapping tables below are global, visible and shown
// in the score explainer — there is no per-species judgment call anywhere.
//
//   behavior — how much of the bird's presence you can actually shoot:
//     a bird in the open is a subject; an in-and-out bird costs patience;
//     a skulker is mostly a heard-not-photographed tick.
//   size     — how much frame it fills at telephoto reach: a Great Egret is a
//     subject at 30 m, a kinglet is a dot. Large birds keep full weight; the
//     penalty grows as the subject shrinks.
//
// The weight shapes ORDER and colour intensity only. The "N birds likely"
// headline and every displayed frequency stay pure presence — facts don't
// change, the sort does. Photo-first is the app's DEFAULT posture; a standing
// chip on the ranked views announces it and offers the one-tap exit ("count
// every bird equally"), and the v22 "rank by target presence" toggle keeps its
// promised frequency-only contract (photo-first stands aside while it's on —
// model/lists.js enforces that composition).
// =============================================================================

import { BEHAVIORS, SIZES } from '../data/facets.js';

// How much of the bird's presence is a real photo chance. Global, documented,
// rendered in the explainer — never a hidden per-species number.
export const SHOOT_BEHAVIOR = { open: 1.0, mixed: 0.6, skulker: 0.25 };

// Frame-filling weight at telephoto reach (the app's home kit is ~375 mm
// equivalent). Large and very large birds are full-weight subjects.
export const SHOOT_SIZE = { xs: 0.5, s: 0.7, m: 0.85, l: 1.0, xl: 1.0 };

const KEY = 'frame.photoFirst'; // '0' = off; anything else (or absent) = on

/** Is photo-first ranking on? Default ON — Frame is a photographer's tool. */
export function photoFirstOn() {
  try { return localStorage.getItem(KEY) !== '0'; } catch { return true; }
}

export function setPhotoFirst(on) {
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* private mode */ }
}

/** The 0–1 shootability weight for a species (1 = full-weight subject). */
export function shootability(s) {
  return (SHOOT_BEHAVIOR[s.behavior] ?? 1) * (SHOOT_SIZE[s.size] ?? 1);
}

/**
 * The weight, unpacked for explainers:
 *   { w, behavior: { label, w }, size: { label, w } }
 */
export function shootFactors(s) {
  const bw = SHOOT_BEHAVIOR[s.behavior] ?? 1;
  const sw = SHOOT_SIZE[s.size] ?? 1;
  return {
    w: bw * sw,
    behavior: { label: BEHAVIORS[s.behavior]?.label || s.behavior, w: bw },
    size: { label: SIZES[s.size]?.label || s.size, w: sw },
  };
}

/** ×-format for UI copy: 1 → "×1", 0.6 → "×0.6", 0.25 → "×0.25". */
export function xw(w) {
  return '×' + (Math.round(w * 100) / 100).toString();
}
