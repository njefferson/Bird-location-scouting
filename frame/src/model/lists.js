// =============================================================================
// LIST-DRIVEN RANKING — how your Target and Seen lists shape the hotspot score.
// =============================================================================
// Two independent, opt-in modes sit on top of the default photographer score.
// This module resolves BOTH into a single spec the ranked views pass straight to
// rankHotspots(), so cards, planner, map and hotspot detail all agree:
//
//   default            → every curated species, Σ frequency × photoability
//   Rank by presence   → only your TARGET species, Σ frequency (no photoability)
//   New for me         → drop the species you've already SEEN from the set
//
// They compose. With both on you rank spots by the presence of the targets you
// still NEED — target subset, minus seen, presence-scored. Each mode keeps its
// own standing bar and its own one-tap exit; neither ever edits a list.
// =============================================================================

import { SPECIES } from '../data/species.js';
import { targetsRankActive, targetSubset } from './targets.js';
import { newBirdsActive, isSeen } from './seen.js';

/**
 * The species set + scoring mode the ranked views should use right now.
 *   { species, presenceOnly, targetsMode, newMode }
 */
export function rankingSpec() {
  const targetsMode = targetsRankActive();
  const newMode = newBirdsActive();
  let species = targetsMode ? targetSubset() : SPECIES;
  const presenceOnly = targetsMode;
  if (newMode) species = species.filter((s) => !isSeen(s.name));
  return { species, presenceOnly, targetsMode, newMode };
}

/** Any list-driven mode currently steering the ranking? */
export function anyRankingMode() {
  return targetsRankActive() || newBirdsActive();
}
