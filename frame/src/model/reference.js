// =============================================================================
// REFERENCE LOADER — merges REAL static data over the hand-authored scaffold
// =============================================================================
// The batch build script (scripts/build-reference.mjs) writes a JSON file at
// data/reference.json shaped like:
//   {
//     "builtAt": "2026-06-28",
//     "hotspots": {
//       "<hotspotId>": {
//         "locId": "L123456",
//         "freqByMonth": { "<speciesCode>": [12 floats 0–1] },
//         "checklistsByMonth": [12 ints]
//       }
//     }
//   }
// When present, those fields overwrite the nulls in hotspots.js, flipping the
// app from "inferred" to "documented" with no code change. When absent (the
// default until you run the script), everything stays on the inference model.
// =============================================================================

import { HOTSPOTS, HOTSPOTS_BY_ID } from '../data/hotspots.js';

let _meta = { loaded: false, builtAt: null };

export function referenceMeta() { return _meta; }

export async function loadReference() {
  try {
    const res = await fetch('./data/reference.json', { cache: 'no-cache' });
    if (!res.ok) return _meta; // no file yet → stay on inference model
    const data = await res.json();
    let count = 0;
    for (const [id, patch] of Object.entries(data.hotspots || {})) {
      const h = HOTSPOTS_BY_ID[id];
      if (!h) continue;
      if (patch.locId) h.locId = patch.locId;
      if (patch.freqByMonth) h.freqByMonth = patch.freqByMonth;
      if (patch.checklistsByMonth) h.checklistsByMonth = patch.checklistsByMonth;
      count++;
    }
    _meta = { loaded: true, builtAt: data.builtAt || null, count };
  } catch {
    // malformed/missing → silently stay on the model
  }
  return _meta;
}

export { HOTSPOTS };
