// =============================================================================
// LIST-DRIVEN RANKING — how your lists and filters shape which birds count.
// =============================================================================
// Hotspots are always ranked by PRESENCE (Σ frequency over a working set of
// species). Three independent, opt-in tools narrow that working set. This
// module resolves ALL of them into a single spec the ranked views pass straight
// to rankHotspots(), so cards, planner, map and hotspot detail all agree:
//
//   default            → every curated species
//   Rank by presence   → only your TARGET species
//   New for me         → drop the species you've already SEEN
//   Facet filters      → keep only species matching your icon filters
//
// They compose (AND): with all on you rank spots by the presence of the
// wanted-facet targets you still NEED. Each tool keeps its own standing bar and
// one-tap exit; none ever edits a list.
// =============================================================================

import { SPECIES } from '../data/species.js';
import { targetsRankActive, targetSubset } from './targets.js';
import { newBirdsActive, isSeen } from './seen.js';
import { facetsActive, applyFacetFilter } from './facets.js';

/**
 * The species set + active modes the ranked views should use right now.
 *   { species, targetsMode, newMode, facetsMode }
 * Scoring is always presence-based; there is no photoability weight any more.
 */
export function rankingSpec() {
  const targetsMode = targetsRankActive();
  const newMode = newBirdsActive();
  const facetsMode = facetsActive();
  let species = targetsMode ? targetSubset() : SPECIES;
  if (newMode) species = species.filter((s) => !isSeen(s.name));
  if (facetsMode) species = applyFacetFilter(species);
  return { species, targetsMode, newMode, facetsMode };
}

/** Any list- or filter-driven mode currently steering the ranking? */
export function anyRankingMode() {
  return targetsRankActive() || newBirdsActive() || facetsActive();
}
