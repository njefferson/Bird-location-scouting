// =============================================================================
// TARGET BIRDS — a personal, on-device list of the species YOU want to shoot.
// =============================================================================
// Starring a bird is INFORMATIONAL by default: it pins the species to your list
// and the app tells you WHERE and WHEN to find it (best hotspots + peak months)
// — it does NOT re-rank the hotspots and photoability never enters. Starred
// species are surfaced, not "judged".
//
// One OPTIONAL toggle changes that: "rank by presence" ranks the hotspots by how
// OFTEN your targets are reported there (frequency only — never photoability).
// That's the whole knob. (This deliberately reverses the old v21 behaviour,
// where targets were photoability-weighted; stars are informational now.)
//
// State (localStorage, on-device, no account — like theme + regions):
//   frame.targets      JSON array of eBird COMMON NAMEs (the key SPECIES uses)
//   frame.targetsRank  '1' | '0' — the standing "rank by target presence" toggle.
//                      DEFAULT OFF: stars inform, they don't re-rank. Flipping it
//                      on/off never touches the list, so the mode has an obvious,
//                      non-destructive exit.
// A list of 0 species can't rank or inform anything, so an empty list is never
// "active" — the app just behaves as All Birds until the first star.
// =============================================================================

import { SPECIES } from '../data/species.js';

const KEY = 'frame.targets';
const RANK_KEY = 'frame.targetsRank';

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

// --- The standing "rank by target presence" toggle (non-destructive) --------
/** Is presence-ranking engaged? DEFAULT OFF — stars inform, they don't re-rank. */
export function targetsRankOn() {
  try { return localStorage.getItem(RANK_KEY) === '1'; } catch { return false; }
}
export function setTargetsRank(on) {
  try { localStorage.setItem(RANK_KEY, on ? '1' : '0'); } catch { /* private mode */ }
}

/** True when the ranking should actually rank hotspots by target presence. */
export function targetsRankActive() { return targetsRankOn() && read().length > 0; }

/**
 * The chosen species as SPECIES objects, in curated SPECIES order (so the matrix
 * and cards stay stable). Used both for the presence ranking and for the
 * informational "where & when" cards on your list.
 */
export function targetSubset() {
  const chosen = new Set(read());
  return SPECIES.filter((s) => chosen.has(s.name));
}
