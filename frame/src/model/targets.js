// =============================================================================
// TARGET BIRDS — a personal, on-device list of the species YOU want to shoot.
// =============================================================================
// Frame's photographer score is Σ frequency × photoability across ALL curated
// species, with one fixed photoability rating for everyone. This layer lets a
// user pick their own targets so the ranking reflects THEIR birds, not the
// generic "most shootable" set: when targets are active, only the chosen
// species contribute to every score (photoability still weights shootability
// WITHIN your list — a target that's also easy to shoot is the better bet).
//
// State (localStorage, on-device, no account — like theme + regions):
//   frame.targets    JSON array of eBird COMMON NAMEs (the key SPECIES uses)
//   frame.targetsOn  '1' | '0' — the standing "rank my targets" toggle. Lets a
//                    user flip back to all-birds WITHOUT losing their list, so
//                    the mode has an obvious, non-destructive exit.
// A list of 0 species is never "active" — an empty target list can't rank
// anything, so the app quietly behaves as All Birds until the first star.
// =============================================================================

import { SPECIES } from '../data/species.js';

const KEY = 'frame.targets';
const ON_KEY = 'frame.targetsOn';

function read() {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(a) ? a.filter((x) => typeof x === 'string') : [];
  } catch { return []; }
}
function write(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* private mode */ }
}

/** The chosen species' common names, in the order they were added. */
export function getTargets() { return read(); }

/** How many species the user has targeted. */
export function targetCount() { return read().length; }

/** Is this species (by common name) on the target list? */
export function isTarget(name) { return read().includes(name); }

/** Add or remove a species by name; returns the new membership (true = now a target). */
export function toggleTarget(name) {
  const list = read();
  const i = list.indexOf(name);
  if (i >= 0) { list.splice(i, 1); write(list); return false; }
  list.push(name); write(list); return true;
}

export function setTargets(names) { write([...new Set(names)]); }
export function clearTargets() { write([]); }

// --- The standing "rank my targets" toggle (non-destructive exit) -----------
/** Is targeting engaged? Defaults ON, so the first star immediately ranks. */
export function targetsEngaged() {
  try { return localStorage.getItem(ON_KEY) !== '0'; } catch { return true; }
}
export function setEngaged(on) {
  try { localStorage.setItem(ON_KEY, on ? '1' : '0'); } catch { /* private mode */ }
}

/** True when the ranking should actually use the target subset. */
export function targetsActive() { return targetsEngaged() && read().length > 0; }

/**
 * The species set every ranking should score against right now: the target
 * subset when targeting is active (in curated SPECIES order, so the matrix and
 * cards stay stable), else the full curated list.
 */
export function activeSpecies() {
  if (!targetsActive()) return SPECIES;
  const chosen = new Set(read());
  return SPECIES.filter((s) => chosen.has(s.name));
}
