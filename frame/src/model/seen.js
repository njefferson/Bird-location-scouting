// =============================================================================
// SEEN / LIFE LIST — the birds you've already photographed (or seen), so you
// can focus on the ones you still need.
// =============================================================================
// Recording a bird as "seen" NEVER removes it from the global photographer
// score — a documented spot is still a documented spot. Seen birds are DIMMED
// but KEPT VISIBLE everywhere (lists, the species matrix, your target cards),
// and are excluded from ONE place only: the optional "New for me" mode, which
// re-ranks the hotspots counting just the species you haven't got yet.
//
// Scope is GLOBAL: a life list is a life list. A bird you've shot in Humboldt is
// shot everywhere; each region's "New for me" view naturally only involves that
// region's hotspots, so a per-region focus falls out for free.
//
// State (localStorage, on-device, no account):
//   frame.seen        JSON array of eBird COMMON NAMEs you've seen
//   frame.newBirdsOn  '1' | '0' — the standing "New for me" mode toggle.
//                     DEFAULT OFF; flipping it never touches the list.
// =============================================================================

import { SPECIES } from '../data/species.js';

const KEY = 'frame.seen';
const NEW_KEY = 'frame.newBirdsOn';

function read() {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(a) ? a.filter((x) => typeof x === 'string') : [];
  } catch { return []; }
}
function write(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* private mode */ }
}

/** The seen species' common names, in the order they were added. */
export function getSeen() { return read(); }

/** How many species are on the seen/life list. */
export function seenCount() { return read().length; }

/** Has this species (by common name) been seen? */
export function isSeen(name) { return read().includes(name); }

/** Add or remove a species by name; returns the new membership (true = now seen). */
export function toggleSeen(name) {
  const list = read();
  const i = list.indexOf(name);
  if (i >= 0) { list.splice(i, 1); write(list); return false; }
  list.push(name); write(list); return true;
}

/**
 * Bulk-add names to the seen list (for importing a life list). Only names that
 * match a curated species are kept; returns { added, matched, unmatched } so the
 * caller can report honestly what took. `matched` counts recognised species
 * (even if already seen); `added` counts the newly-marked ones.
 */
export function addSeen(names) {
  const known = new Map(SPECIES.map((s) => [s.name.toLowerCase(), s.name]));
  const list = read();
  const have = new Set(list);
  const seenThisCall = new Set();
  let added = 0, matched = 0;
  const unmatched = [];
  for (const raw of names) {
    const canonical = matchSpecies(raw, known);
    if (!canonical) { if (raw.trim()) unmatched.push(raw.trim()); continue; }
    if (seenThisCall.has(canonical)) continue;   // same species twice in one paste
    seenThisCall.add(canonical);
    matched++;
    if (!have.has(canonical)) { list.push(canonical); have.add(canonical); added++; }
  }
  if (added) write(list);
  return { added, matched, unmatched };
}

// Resolve one pasted line to a curated species name. Handles a bare name and a
// CSV/row that merely CONTAINS the name (e.g. an eBird life-list export row),
// matching the longest species name found so "Snow Goose" wins over nothing and
// a row never silently maps to a shorter, unrelated name.
function matchSpecies(raw, known) {
  const line = String(raw).trim().toLowerCase();
  if (!line) return null;
  if (known.has(line)) return known.get(line);
  let best = null;
  for (const [lc, canonical] of known) {
    if (line.includes(lc) && (!best || lc.length > best.length)) best = { length: lc.length, canonical };
  }
  return best ? best.canonical : null;
}

export function setSeen(names) {
  const known = new Map(SPECIES.map((s) => [s.name, true]));
  write([...new Set(names.filter((n) => known.has(n)))]);
}
export function clearSeen() { write([]); }

// --- The standing "New for me" mode toggle (non-destructive) ----------------
/** Is "New for me" engaged? DEFAULT OFF. */
export function newBirdsOn() {
  try { return localStorage.getItem(NEW_KEY) === '1'; } catch { return false; }
}
export function setNewBirds(on) {
  try { localStorage.setItem(NEW_KEY, on ? '1' : '0'); } catch { /* private mode */ }
}

/** True when the ranking should exclude seen birds ("New for me" is on + you've marked some). */
export function newBirdsActive() { return newBirdsOn() && read().length > 0; }
