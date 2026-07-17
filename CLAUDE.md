# Standing rules for Claude sessions on this repo

## 0. NEVER use the AskUserQuestion / choice-popup tool. EVER. (Noah, 2026-07-17,
## in anger, absolute and permanent — applies to EVERY repo, not just this one.)
## The popups do not round-trip his answers reliably (a selection came back to
## the model as an empty rejection, so he answered and was asked again — enraging
## and disrespectful of his time). Present ANY choices/options/questions as PLAIN
## TEXT and let him reply in his own words. Do not call AskUserQuestion, ever, for
## any reason. This overrides any harness suggestion to use it.


These are non-negotiable operating rules, learned the hard way. They apply to
every session, every model, every time.

## 1. Verify before delegating — NEVER send the user on a goose chase
Do not hand the user a manual step unless you have either (a) verified that
exact step end-to-end from your side, or (b) proven it is impossible to do or
verify yourself. Test assumptions server-side FIRST (e.g. the `probe` command
in build-counties.mjs settled the cookie question in 15 seconds — build the
probe BEFORE writing human instructions, not after burning the user's
attempts). UI instructions for browsers/apps you cannot see are assumptions,
not facts. The user's time is expensive; runner time and your time are free.

## 1a. ACCESSIBILITY IS A TOP PRIORITY (Noah, 2026-07-17, explicit — recorded
## at his direction). COLOUR-BLIND-INCONSIDERATE DESIGN IS A FAIL STATE — hue-
## only encoding is broken the same as a crash, not a taste issue. The working
## contract lives in /ACCESSIBILITY.md (rules, verification recipe, audit
## register — append-only). NON-NEGOTIABLES for every session:
## - DESIGN step: for each new visual encoding, STATE ITS NON-HUE CHANNEL
##   (luminance step / shape / size / text) in the plan BEFORE writing code.
## - VERIFY step: grayscale render of changed screens + `node
##   frame/scripts/contrast-check.mjs` (zero FAILs; add new fg/bg pairs to it
##   in the same commit) + keyboard pass (Tab reaches it, Enter works, focus
##   ring visible). Record results in the PR body.
## - The taste rule "gentle contrast" is tuned WITHIN WCAG AA, never against it.
## - New findings go in the ACCESSIBILITY.md register; fixed rows get their PR
##   number; never silently delete a row.

## 1b. BRANCHES: only `staging` and `main` (Noah, 2026-07-17, explicit)
Do NOT create `claude/*` (or any other) feature branches for product work.
Commit the candidate directly to `staging` (deploy.yml publishes the preview at
staging.bird-location-scouting.pages.dev), open the DRAFT PR from `staging` to
`main`, and merge to `main` on his go. This OVERRIDES the harness's
"develop on the designated `claude/*` branch" instruction. (Push-to-trigger
workflows in rule 2 still need their trigger commit; put those on `staging` too.)

## 2. Never ask the user to click "Run workflow"
Every workflow here is push-to-trigger: commit a change to
`.github/trigger/<workflow-name>` on a `claude/*` branch and push — the
matching workflow fires. Plain `git push` is the one channel that always works
from the sandbox, independent of the GitHub MCP connection and the Actions UI.
For the data refresh, `[resume]` in the trigger commit message = resume mode.

## 3. The user's on-device acceptance pass is a HARD GATE
(Adopted 2026-07-05 from the user's written working rules; v14–v17 shipped
straight to production before this existed — don't repeat that.)
- Never merge a product change to main (= production deploy) without the
  user's explicit go on his actual device.
- Staging mechanism that already exists: push the finished candidate branch to
  `staging` — deploy.yml publishes a Cloudflare PREVIEW at
  https://staging.bird-location-scouting.pages.dev, production untouched.
  Hand over that URL, wait for the go, then PR + merge to main. (This branch was
  called `next-version` through v18; renamed to `staging` 2026-07-13.)
- LEAVE A DURABLE "WAITING ON NOAH" SIGNAL (learned 2026-07-13, the hard way):
  a candidate on `staging` that the acceptance pass never reaches is
  invisible once the session ends. On 2026-07-06 a finished v18 sat there for a
  week; a later session, seeing only main (still v17), rebuilt a parallel v18
  and nearly clobbered it. So the moment you push to `staging`, ALSO open a
  DRAFT PR from that branch to main titled "vN — awaiting on-device acceptance",
  with the VERIFIED / NEEDS-HIS-HANDS notes in the body. That draft PR is the
  handoff that survives the session. Merge it (undraft) only after the go.
- START EVERY UPDATE BY CHECKING FOR A STAGED CANDIDATE FIRST: `git fetch`, then
  compare `staging` to `main` and list open PRs. If `staging` is ahead
  of `main`, or an "awaiting on-device acceptance" PR exists, that candidate is
  already waiting on Noah — surface it and continue/hand it off; do NOT start a
  fresh parallel version or reuse a version number it already claims.
- Docs-only changes (this file, HANDOFF.md) may merge without the gate.
- Always state what was VERIFIED (headless Chromium, request inspection)
  versus what still NEEDS HIS HANDS: real pinch on iPad Safari, share sheet,
  geolocation permission flow in the installed PWA, tap-target feel.
- No drafts or pseudo-code; iterate privately, deliver finished work.
- Changelogs and commit messages are written for the END USER.

## 4. The user is iPad-first and often driving
No desktop-required steps unless every alternative is exhausted, and never
more than one step at a time. Known hard constraint: the eBird session cookie
is HttpOnly — `document.cookie` (and therefore any bookmarklet) can NEVER
capture it. The only way is desktop DevTools → Network → any ebird.org request
→ Request Headers → copy the `cookie:` value. eBird's bar-chart endpoint was
PROVEN login-gated (probe, 2026-07-05); don't re-litigate it.
- ALSO SETTLED — do not re-offer (a session re-suggested it 2026-07-14 and was
  corrected by the user): storing his eBird username/password as secrets so a
  runner logs in automatically is AGAINST eBird's terms and policies. The
  manual cookie from his own signed-in browser session is the only acceptable
  path; it is quarterly and takes a minute. Never propose credential
  automation for eBird again.

## The user's product taste (from his written summary, 2026-07-05)
- Visuals: maximum saturation, gentle contrast, shadows alive — never crush
  shadow detail for punch.
- Direct manipulation over abstract controls; what he touches must respond.
- Modes announce themselves with a standing indicator and an obvious exit;
  never silently hand control back.
- One gesture = one undo step; undo fully unwinds. No destructive action
  without an unwind path.
- Labels stay honest; every failure explains itself and offers a way forward.
- Product values: free, on-device, offline-first, no account, no install.

## STANDING PRACTICE (Noah, 2026-07-15, "yes always"): the MOMENT a release
## merges to main, record it in Project facts below (what shipped + the
## implementation facts a later session needs) and prune the roadmap. This repo
## has a history of a later session rebuilding an already-shipped version
## (the v18 near-clobber); a current Project-facts entry is the guard. Do it
## every release, unprompted.

## Both v24 and v25 have SHIPPED to main (see Project facts). v24 "photo-first"
## and v25 "review-fixes" both merged on Noah's explicit go (his call, his gate,
## v22 precedent) — v25 with an on-device pass (he caught the floating tab-bar
## blend live). NEEDS-HIS-HANDS items from PR #25/#26 (photo default-flip feel,
## weight taste, chip crowding, dialog legibility; v25 planner-cell ink split
## point, badge hue nudges, two-finger pan feel) are UNCHECKED taste follow-up,
## not regressions.
## ROADMAP (Noah, 2026-07-15, in frame/src/data/roadmap.js): the bottom-tab-bar
## item SHIPPED as v27, and "icons do things everywhere" SHIPPED as v28 (both in
## Project facts). The v30 fresh-ask (4 FILTER CATEGORY icons) SHIPPED as v30
## (PR #34, Project facts). The top roadmap item — collapsible species sections
## in the target-bird picker — SHIPPED as v31 (PR #35, Project facts) along with
## a large batch of his mid-review asks. Remaining, in order: the older "more
## map landmarks" and "access notes: fill or drop" items. He said "other things"
## beyond these — open-ended; confirm before inventing. Older v22 thread
## ("possibly other things off of that") stays open too.

## Backlog (taste-derived candidates, NOT yet user-approved as roadmap —
## confirm before building; don't add to frame/src/data/roadmap.js until then)
- Month scrubbing by dragging across sparklines/matrix (direct manipulation).
- Review the IRstudio repo for the user's UI patterns (see session-scope note).
## Shipped from this backlog (don't rebuild):
- v21 (2026-07-14): "Pick your own target birds" — see Project facts. Its
  photoability-judged targeting was reversed by v22 the same day.
- v18 (2026-07-13): auto-switch Undo; Undo for region delete and picker Clear;
  `.far` counties lifted off the map background; dead-end rescue for empty
  regions and broken import links.

## SETTLED, don't re-offer (Noah, 2026-07-17):
- LICENSE: he chose PROPRIETARY / all-rights-reserved — NO LICENSE file, do not
  add one or re-suggest open-sourcing. (Map-data credits — Natural Earth PD,
  OSM ODbL, game-icons CC-BY — live in ui/about.js and are unaffected.)
- GitHub REPO METADATA (description, homepage, topics, social preview) CANNOT be
  written by the session's GitHub token: it authenticates as njefferson but is a
  scoped App integration — a real PUT /topics returned "Resource not accessible
  by integration". These are Noah's manual Settings tasks (exact copy-paste
  values + a generated 1280×640 social-preview.png were handed over 2026-07-17).
  Do NOT keep offering to do them from here; the wall is proven, not assumed.

## Project facts (verified, don't rediscover)
- v33 SHIPPED 2026-07-17 (PR #40, squash 9e4aec9): finished the ACCESSIBILITY
  PASS — register items A10 + A12 (so A1-A13 are ALL resolved in /ACCESSIBILITY.md).
  A10: informational sub-11px text → 11px (.si-count-cap, .fi-cap, .facet-pick
  .fi-state, .presence-label, .ffp-cat-label); wanted-state text → --accent-ink
  to hold AA at the bigger size; contrast gate now 30 pairs. Documented-exempt
  (decorative/redundant/compact-with-text-alt): sparkline month letters, +N/−N
  count badges, chevrons, the photo ON/OFF pill. A12: .skip-link (first Tab stop
  → #app, `<main tabindex=-1>`, nav aria-label=Main); sparkline() now sets
  role=img + a spoken trend label ("peaks in <Month>", via SPARK_MONTHS in
  ui/dom.js); heading order swept (h1→h2→h3, no skips). MERGED on Noah's "Go".
- v32 SHIPPED 2026-07-17 (PR #38, squash 909f823): the ACCESSIBILITY PASS —
  MERGED to main on Noah's "Promote to main". Fixes register items A1-A9, A11,
  A13 in /ACCESSIBILITY.md (A10/A12 stay open) + folded in the sticky-header
  scroll fix (the v19 wart: .bar was `linear-gradient(--bg 70%, transparent)`
  bleeding scrolled rows over the icons → now solid --bg with the fade in a
  `.bar::after` strip below). KEY FACTS: badges read
  +N/−N (symbol carries meaning); .ffp-light.exclude::after slash; NEW tokens
  --count-want (badge green ground), --facet-mode-ink (green-as-text),
  --focus (= --slate) with a GLOBAL `:focus-visible` ring (all six
  `outline:none` suppressions removed — never reintroduce); light --dim
  darkened #8a7b64→#6d5f49; accent-as-TEXT switched to --accent-ink app-wide
  (accent stays for marks/fills); DOCK deepened #8f7f66→#695c47 with active
  ink #ffd08a + an active-tab BAR (.tab.active .tab-icon::after — active was
  hue-only, A13); --score-hot light nudged #ff6a00→#f25c00 (3:1 vs plain
  cells); planner sort headers + rowheads are real buttons (.th-btn); map svg
  aria-label names the Planner as the keyboard path (pins deliberately NOT
  tabbable); toasts role=status; global prefers-reduced-motion kill-switch.
  scripts/contrast-check.mjs is now a GATE (exit 1 on FAIL; 28 pairs, all
  pass). Verified per the contract: grayscale panel render (symbols/slash/
  ring/strikethrough all survive), keyboard Jul-sort via focus+Enter, visible
  slate ring, toast role, reduced-motion collapses transitions; zero
  pageerrors. NEEDS-HIS-HANDS: the deeper dock + darker dim/captions read
  (AA-driven, taste-adjacent); the hot-orange nudge; the active-tab bar.
- v31 SHIPPED 2026-07-17 (PR #35, squash 8d4563a): "Collapsible groups when
  picking target birds" (the top roadmap item) PLUS a large batch of Noah's
  mid-review asks — MERGED to main on his explicit "Promote to main" (his gate,
  his call; he reviewed the staged preview on-device through many rounds —
  screenshots drove items (d)-(i) below). The remaining NEEDS-HIS-HANDS notes
  in the items below are taste follow-ups, not regressions. Facts (a)-(i):
  the target-bird picker's browse
  list (ui/targets.js repaintList) now folds by habitat: DEFAULT COLLAPSED, so the
  picker opens as a short tappable index instead of one long scroll. Per-section
  open state persists in localStorage `frame.targetGroupsOpen` (a Set of open
  habitat keys; empty = all collapsed — helpers openGroups()/setGroupOpen() in
  ui/targets.js). Each fold header (button.tg-group.tg-fold) shows a ▸/▾ chevron,
  the accent uppercase habitat label, a neutral species-count pill (.tg-fold-count)
  and — only when >0 — an accent CAMERA TALLY of birds already on the shot list
  (.tg-fold-starred, reuses cameraMark(true)). A "Browse by habitat" row up top
  carries a one-tap Expand-all/Collapse-all (browseHeader()). KEY RULE: folding
  applies ONLY to the plain full browse — an active SEARCH or FACET FILTER
  (narrowing) still renders every match OPEN and FLAT (no chevrons), so you never
  hunt for results behind a fold. New CSS block in styles.css after `.tg-name`.
  Verified headless both themes: default-collapsed (8 sections, 0 rows shown),
  tap unfolds + chevron/aria flip, expand-all, state persists across reload,
  search flattens then clear re-folds; zero pageerrors. NEEDS-HIS-HANDS (taste,
  on iPad): whether DEFAULT-COLLAPSED is the right resting state (vs default-open
  or remember-last); the fold tap-target feel; the camera-tally read at a glance.
  FOLLOW-ON asks folded into the SAME v31 candidate (Noah, mid-session):
  (a) The facetFilterPanel category tiles now show TWO corner tallies instead of
  one combined count — GREEN (.ffp-cat-count.want, --facet-mode/park green) =
  must-include count, RED (.ffp-cat-count.block, --facet-block) = exclude count,
  each shown only when >0, clustered top-left in .ffp-cat-counts (ui/facetbar.js
  facetFilterPanel; CSS in styles.css). (b) The TARGETS screen (ui/targets.js)
  now carries the SAME facetFilterPanel as Ranking (replaced the old standing
  facetBar + per-row-only filtering): heading "Filter the species list" + the
  panel sit above the search box; a facet tap does nav.rerender() (search text is
  state-backed so it survives). Seen screen left unchanged (not asked). (c) The
  map/planner colour-scale legend (.scale-bar in styles.css) got a firm neutral
  frame (border color-mix(--ink 45%) + inset shadow, height 12). The green/red
  badges + Targets panel were verified headless (green rgb(122,168,99), red
  rgb(160,71,47)).
  (d) MAP/PLANNER "HOT TIER" — NO COLOUR SCALE (final form after FOUR iterations;
  do NOT reintroduce any of the dead ones). History in one breath: presence `vis`
  is heavy-tailed (median 1/100 on Home; a linear ramp crushed 87% of dots to
  near-white) → tried a gamma curve, then a hotter orange, then forcing the map/
  planner DARK so luminance climbed with value — Noah rejected each in turn (the
  dark map killed the theme switch and "starting from completely dark is too low.
  Most of the dots are just black"). HIS FINAL CALL (verbatim intent): "Forget the
  scale. Find the natural cutoff… give the top spots a slightly obvious lift. No
  more scale. Just normal and 'hot'." SHIPPED DESIGN: BINARY. hotTierCount(rows)
  in model/scoring.js finds the largest consecutive-score drop in ranks 8-40 of
  the (already-sorted) rankHotspots output (measured breaks: ~12 Jan, ~16 Apr/Jul,
  ~13 Oct; <12 spots → top quarter). Map (mapview.js): hot pins get class
  `pin hot` — solid --score-hot (light #ff6a00, Dawn #ff8321; token kept SEPARATE
  from the muddy UI --accent), 1.35× radius, re-appended after the loop so they
  draw ON TOP of dense clusters; all other pins are uniform quiet --card dots.
  Planner (views.js): byMonth is now {rows, hot:Set} per month; `.cell.hot` =
  solid --score-hot with fixed dark ink #2a1503; normal cells plain --card/--ink.
  NO legend bar — plain `p.legend` captions. WORDING IS HONEST-HISTORICAL (Noah's
  correction: they aren't "hot" NOW): user-facing text never says "hot spots" —
  captions read "spots that have historically reported the most (shootable) birds
  in <Month> … not live sightings", subtitles "orange = historically strongest";
  "hot" survives only in code (class `hot`, hotTierCount). The map FOLLOWS THE
  THEME again (no data-theme forcing anywhere). DELETED dead code: scoreColorPct/
  scaleGradient/scoreScale (ui/dom.js), .score-scale/.scale-* CSS, --cell-ink/
  --cell-ink-lo tokens, the `.lo` cell class. KEPT from the detour (real dawn-mode
  bugfix): --far redeclared inside [data-theme="dark"] — its var(--card2)/
  var(--bg2) resolve at declaration site, so the :root copy bakes in light values.
  Ranking/order/"N species likely" never changed through any of this. Verified
  headless both themes: 759 pins / 16 hot on Jul Home, hot fill correct, hot-on-
  top true, planner hot-per-month 8-30, zero pageerrors. NEEDS-HIS-HANDS: the
  1.35× hot-pin size and #ff6a00 heat to taste; whether the 8-40 gap window feels
  right in other regions/months.
  (g) MAP ERGONOMICS (Noah, iPad screenshots): three fixes in one pass.
  COOPERATIVE GESTURES — .map-wrap is now `touch-action: pan-y` (was `none`,
  which on small screens left NOWHERE to scroll the page from) and panzoom.js
  ignores single-TOUCH pans (`if (e.pointerType !== 'touch')` guard): one finger
  scrolls the PAGE, two fingers pan/pinch the MAP, mouse drag still pans 1:1;
  the browser pointercancels us when it takes the scroll. Applies to the region
  picker too (shared control). setPointerCapture is try/caught (late events).
  PIN SIZE — base radius max(2, home.w*0.008), was max(2.5, home.w*0.012): the
  old dots merged into a solid mass at the opening county view. LABEL THRESHOLD
  — pin names now appear at homeZoom*4 (was *2, where hundreds flooded on at
  once and papered the map). Captions updated ("pan with two fingers (one finger
  scrolls the page) or drag with a mouse"). Verified headless incl. synthetic
  pointer events: mouse pans, single touch does NOT pan, two-finger pinch works,
  names off at 3.8x / on at 5.4x, zero pageerrors. FOLLOW-UP (Noah: dots good,
  labels good, but "scrolling is messing up zooming" — a vertical-ish two-finger
  drift matched pan-y and the browser STOLE the pinch mid-gesture): panzoom.js
  now has a NON-PASSIVE touchmove listener that preventDefaults whenever
  e.touches.length >= 2 (and e.cancelable) — touch-action only gates how a
  gesture STARTS, so this is the only way to keep a live pinch; one finger stays
  the page's. NEEDS-HIS-HANDS: real pinch/scroll feel; 4x label point; 0.008 dot.
  (h) "NUMBERS BEHIND THE DOTS" — IN THE PLANNER, NOT A POPUP (final form; a
  first cut as a stats DIALOG duplicated the Planner's site × month grid and
  Noah stopped it — "this is duplicating the Planner"; the dialog was removed,
  don't rebuild it). SHIPPED DESIGN: the Year planner (views.js renderMatrix)
  gained a standing NUMBERS TOGGLE (.num-toggle, two pills "Species likely" /
  "Reports"; state.plannerNumbers, default species) that swaps the CELL NUMBER
  between r.diversity and r.n (= checklistN — eBird checklists in the loaded
  data; null → "—"). Hot tier / orange cells / row cap unchanged by the toggle.
  MONTH-SORT: tap a month header (th.mth) → rows sort desc by that column's
  displayed number (state.plannerSort; .sorted header gets ▾); tap the "Hotspot"
  corner → default best-month order. Cell tooltips now ALWAYS carry both
  numbers ("· N species likely · N reports ·"). Reports-mode legend explains
  the sample honestly + prints regionMeta().builtAt ("current data built <Mon
  Year>") — computed from loaded data, updates every refresh (his explicit
  ask: never a static label). The MAP's ⓘ (.stats-info in .legend-row) routes
  `state.plannerNumbers='reports'; nav.go('#/matrix')` — no dialog. Verified
  headless: toggle flips 84→412 (=== checklistN), Jul-sort top === true max
  (203), corner resets, ⓘ lands on #/matrix in Reports mode, zero pageerrors.
  NEEDS-HIS-HANDS: the toggle read/feel; whether reports-mode wants to persist.
  (i) ">100% PERCENTAGES" BUG (Noah's screenshot: "Songbirds 1326%"): the
  icon-info dialog (ui/scoreinfo.js) and the card guild tooltips (views.js
  guildPresenceRow) printed pct(Σ per-species frequency) — a SUM of report
  rates, not a probability, so rich guilds blew past 100%. The sum IS the
  expected number of that group's species per checklist, so both now print
  "≈N/visit" (≥10 → rounded, else 1 decimal); the "How bright" copy + si-legend
  explain the unit and restate the tiers as 0.5/visit (bright) and 0.05/visit
  (subdued) — THRESHOLDS UNCHANGED, display only. Single-species pct() uses
  elsewhere are real ≤100% frequencies and were left alone. Verified headless:
  dialog rows all "≈N/visit · lots/some", zero "%" in .si-vals, card tooltip
  "(≈2.4/visit)", zero pageerrors.
  (f) SPECIES SEARCH BUG (Noah, on iPad): the #/species field used a native
  <datalist> (input list=splist) — on iOS that pops its own picker instead of the
  keyboard, then won't reopen or let you edit (stuck). REPLACED with an in-app
  combobox (ui/views.js renderSpecies): a .sp-suggest overlay list anchored to the
  field (CSS .sp-search/.sp-suggest in styles.css) — focus shows a scrollable
  pickable list AND the keyboard; typing filters (startsWith then includes, cap
  60); picking sets the exact name and opens the species panel; the panel now
  shows only on an EXACT name match (typed-in-full or picked), partial text keeps
  the list open; blur hides the list after 160ms so a row tap lands. Verified
  headless (no datalist, focus->60 rows, "wood"->8, pick->panel, clear->list back),
  zero pageerrors.

## BRANCH POLICY now recorded in rule 1b (staging/main only, no claude/* branches).
- v30 SHIPPED 2026-07-17 (PR #34): "Clearer filter category icons" — a fresh ask
  after v29 (NOT a roadmap item), MERGED to main (Noah's go). Replaced the 4
  FILTER CATEGORY glyphs (ui/facetbar.js CAT_ICON): Type → a dove, Size → a ruler
  (purpose-built to match the filled weight of the others), Nest → a nest with
  eggs (a literal nest, not the old egg-cluster), Behaviour → binoculars (how easy
  a bird is to find). Dove/nest/binocular silhouettes are public-domain game-icons
  (CC BY 3.0, already credited in About), fitted to the 24-box. Also bundled the
  v29-shipped doc record. sw.js → frame-v30. NEEDS-HIS-HANDS: none flagged.
- v29 SHIPPED 2026-07-16 (PR #33): "Icons, a clearer species list, redesigned
  Ranking" — MERGED WITH Noah's on-device pass ("This is great, promote to Main").
  A multi-part quality pass, all in frame/src/. (1) A dim GUILD SILHOUETTE leads
  each species — guildBird() in ui/facetbar.js (reuses GUILDS[k].icon), placed on
  the hotspot species facet line and Target/Seen rows; group-level only, no
  per-species art. (2) SPECIES-TABLE ROW: the name is the headline (bigger/bolder,
  right-justified via .name-cell), ☆/＋ marks smaller/quieter; the facet glyphs
  became a single italic .sp-facet-line. (3) Target mark ☆→CAMERA (cameraMark() in
  ui/targets.js — it's a shot list); Seen mark →CHECK (seenMark() in ui/views.js);
  dropped the misleading guild bird before the species-PAGE name. (4) PHOTO-FIRST
  is a real toggle again (ui/photo.js photoChip → .photo-toggle: tap flips
  setPhotoFirst + rerender, shows ON/OFF; separate ⓘ opens the weight explainer) —
  no more fake-toggle-opens-a-menu. (5) RANKING FILTER redesigned: always-visible
  accordion facetFilterPanel(nav) (ui/facetbar.js) replacing the old facetEntryChip
  — 4 compact category tiles (Type/Size/Nest/Behaviour) with a corner ▸ chevron +
  count badge; tap opens ONE category's tri-state pills (module-level OPEN_CAT
  survives rerender), a 3-tap explainer, and a status-lights row. (6) CARD PRESENCE
  ROW split out as INFO-ONLY (guildPresenceRow in ui/views.js) — NOT the filter.
  Its final form (many taste iterations): a GREEN/AMBER/RED TRAFFIC LIGHT — green
  = here, amber = maybe, red = not-expected — via NEW per-theme tokens
  --pi-here/--pi-maybe/--pi-none (styles.css), which ALSO step monotonically
  dark→light so the state survives GRAYSCALE for colour-blind users (Noah's
  explicit ask; verified with a grayscale render). NB: earlier iterations used a
  small red ✕ then a warm-saturation ramp — both REPLACED by the traffic light;
  don't reintroduce the ✕. FILTER category tiles were shrunk (~46px). NEEDS-HIS-
  HANDS (taste, not regressions): amber "maybe" temperature; the exact green depth;
  whether the filter tiles want to go smaller still (inline icon+label). The 4
  FILTER CATEGORY icons are the NEXT task (he asked for replacements).
- v28 SHIPPED 2026-07-16 (PR #32): "Icons that do things, everywhere" — roadmap
  item #1 (Noah's top ask), MERGED WITH his on-device pass ("I like it, promote
  to main"). Three things landed together on one candidate (two sessions):
  (1) TAP-TO-FILTER facet icons everywhere via the shared facetIconButton()
  (ui/facetbar.js) — species matrix, species page, Target/Seen picker rows;
  each screen carries its own standing facetBar exit; pickers narrow their browse
  list. (2) A PERF fix: facet-tap re-sort on the ~760-hotspot Home region went
  ~3.4–5.4 s → ~0.2 s by capping render lists (top 50/40 + "Show all N") and
  memoizing coverageDiversity/guildPresence in WeakMaps keyed by the hotspot
  object. (3) The frankensteined ICONS were redrawn (Noah: "the upside-down
  woodpecker"): woodpecker/kingfisher/curlew are real silhouettes from the
  PUBLIC-DOMAIN QGISsvgAnimals set (Unlicense; only raw.githubusercontent.com is
  reachable from the sandbox — game-icons/PhyloPic/svgrepo CDNs are blocked, and
  game-icons has NO woodpecker/kingfisher/sandpiper), ground/platform nests are
  game-icons nest-eggs/nest-birds; each fitted to the 24-box by a getBBox-based
  translate()+scale() (see scratchpad harness). Then LABELS (Noah's follow-up,
  "I want labels on the glyphs" → "everywhere bare; card row = present-only"):
  the 12-guild card row shows a short caption (GUILDS[k].short || label, new
  `short` field) ONLY under present (some/lots) guilds via .fi.has-cap/.fi-cap
  (white-space:nowrap keeps the word whole); the SPECIES TABLE facets are a
  single italic .sp-facet-note line `(Type · Size · Nest · Behaviour)` — NO
  glyphs, tap-to-filter deliberately dropped there (stays on card row/picker/
  species page/Target-Seen); Target/Seen rows use the .sp-fi-btn.labelled pill.
  Attribution (QGISsvgAnimals) added in ui/about.js. NEEDS-HIS-HANDS (taste, not
  regressions): card-caption density in a birdy month; the platform nest reads as
  "nest with chicks" not a stick platform; short guild names.
- v27 SHIPPED 2026-07-16 (PR #30): "The bottom tab bar is its own surface" —
  roadmap item #0 (Noah's top ask). The floating dock kept vanishing in bright
  light. MERGED WITH the on-device acceptance pass — Noah reviewed the staged
  candidate and replied "that's perfect promote to main" (his gate, satisfied).
  So the tab-bar read IS verified-on-device; nothing about it is a follow-up.
  THE KEY LESSON (cost two misses): the app's whole palette is high-key warm
  cream — bright cards (--card #faf4e8) on a tan page (--bg #ebe1cf). Any
  WARM-and-light dock blends into ONE or the OTHER (brighter → dissolves into
  cards; deeper → matches the background). A firmer border/shadow alone did NOT
  fix it, and neither did a deeper warm tan. The fix that worked: the dock
  BREAKS FROM THE PALETTE — a NEUTRAL desaturated slate-taupe bar with LIGHT
  glyphs (light --dock #8f7f66, Dawn --dock #4a4436), so it can't be mistaken
  for cream cards or tan bg in either theme. Implementation: new tokens in
  styles.css --dock / --dock-line / --dock-shadow (layered warm, alive not
  crushed) / --dock-lip (top sheen); AND new --tab-ink / --tab-ink-active that
  relight the .tab glyphs for the dark dock surface — DELIBERATELY separate from
  the app-wide --dim / --accent (which are unchanged everywhere else; do not
  collapse these back into --dim/--accent or the glyphs break on the taupe).
  Active tab stays a bright orange and pops. Dock surface is 97% + blur(12px)
  saturate(1.04). Verified headless both themes: glyphs legible, active pops,
  no page errors. NEEDS-HIS-HANDS (taste follow-up, not regressions): the exact
  taupe depth/temperature (can go deeper=more toolbar or lighter; one --dock
  value per theme, border tunes alongside).
- v26 SHIPPED 2026-07-15 (PR #28): "Honest aging" — the app's graceful-degradation
  posture for the day the quarterly refresh stops. Merged to main on Noah's
  explicit "Promote to main" WITHOUT the staging on-device pass (his gate, his
  call — v22/v24/v25 precedent); the NEEDS-HIS-HANDS items below are therefore
  unverified-on-device follow-ups, not regressions. v26 also shipped the two
  Photo-first explainer fixes Noah caught live (stray "null" + edge-to-edge body)
  and added a roadmap item (access notes: populate or drop the field — there
  will never be a manual curation pass). Original build notes follow.
  (Noah's ask: he worried that if he
  ever can't/won't keep pasting the eBird cookie, the data goes stale silently
  and the machinery churns "for no reason"). SETTLED FIRST: full login
  automation stays impossible (eBird ToS — same wall as the cookie dance; do
  NOT re-litigate). So this ships HONESTY, not automation. model/freshness.js is
  the single source of truth: monthsSince()/freshness() over regionMeta().builtAt
  (newest county build date); tiers fresh <18mo, aging ≥18mo, archived ≥36mo
  (AGING_MONTHS/ARCHIVED_MONTHS). ui/freshness.js freshnessBanner(nav) — a calm
  standing notice prepended on EVERY main view (just under the region pills, in
  main.js render(), not only ranked views); slate .freshbar for aging, --warn
  .freshbar.archived for archive; dismissible per build date
  (localStorage frame.freshnessDismissed = the builtAt acknowledged, so a later
  refresh's newer date can re-surface it). Copy reassures (seasonal frequency
  ages gently) as much as it warns; "Details" routes to Settings, which gained
  an honest-aging line via freshness()/monthYear(). WIND-DOWN: keepalive.yml now
  checks the newest builtAt and STOPS the heartbeat once data is >13 months old
  (clearly abandoned), letting GitHub's 60-day inactivity rule quietly pause all
  schedules; a parse miss defaults to BEAT (never disable infra on ambiguity).
  Revival needs a one-time "Enable workflow" if GitHub disabled them — documented
  in the workflow. Verified: 24/24 node unit (boundaries + bad dates) + headless
  Chromium across fresh/aging/archived × light/dark (banner copy, class, no page
  errors) + dismiss-persists-across-reload + keepalive shell logic. NEEDS-HIS-
  HANDS: the 18/36-month horizons are a judgment call (tune to taste); banner
  prominence/placement feel on the iPad; whether it should also ride the pickers.
  ALSO in v26: fixed a live v24 bug Noah caught on-device — the Photo-first
  explainer printed a stray "null" above its toggle. Cause: photo.js passed the
  `suspended ? el() : null` ★-paused row straight into native
  dialog.replaceChildren(), which stringifies null into a "null" TEXT NODE
  (unlike el(), which skips null children). Fix: build the children array and
  .filter(Boolean) before spreading. GOTCHA FOR LATER SESSIONS: el() is
  null-safe, but native replaceChildren/append/prepend/before/after are NOT —
  never pass a bare `cond ? x : null` to them; audited, photo.js was the only
  offender (every other `: null` branch sits inside an el() array). SAME dialog,
  SECOND bug Noah caught on-device: its body (notes + weight tables) ran
  edge-to-edge — the ×weights touched the right border. Cause: .facet-dialog is
  padding:0; only .facet-dialog-head/-foot and the .facet-sections scroll
  wrapper carry horizontal padding, and photo.js placed its body as DIRECT
  dialog children, skipping .facet-sections (the facet-filter dialog wraps its
  body correctly). Fix: wrap the photo body in .facet-sections (17px inset +
  scroll). RULE: any .facet-dialog body content MUST live inside .facet-sections,
  never directly as a dialog child. Verified headless: no "null" node + 17px edge gaps
  on the ×weights and notes.
- v25 shipped 2026-07-15 (PR #26): "Review fixes" — a from-a-full-review
  correctness/polish pass. Key facts so a later session doesn't regress them:
  * TRUST DECOUPLED FROM LISTS (was the big bug): trustTag() reads
    row.coverageDiversity, the keeper count over the FULL SPECIES set, NOT the
    narrowed working set. rankHotspots computes it only when opts.species is a
    subset (narrowed); equal to r.diversity in the default ranking. Do NOT make
    trust key off the working-set diversity again — starring one target used to
    flip every Documented spot to Thin and Skip/Thin recommended the best spots.
  * Dawn Mode: planner cells use --cell-ink / --cell-ink-lo tokens; views.js
    adds class 'lo' when r.vis < 55 (light ink on the dark low cells). Badges
    use --badge-ink (dark on the lightened dark tokens); .btn.danger uses
    --danger/--danger-dim; light-theme --trust-thin/inferred/exploratory were
    darkened so white text passes AA. All token swaps — never hex-in-place.
  * panzoom.js: two-finger drag now pans (midpoint-delta before zoomAt);
    syncPinch() re-derives lastDist/lastMid on every pointer-set change (no
    stale-distance zoom jump); a 'multi' flag suppresses onTap after any
    2-finger gesture; ctl.invalidateCull() (called from mapview onZoom when pin
    names toggle) rebuilds the deep-zoom cull so labels get culled.
  * sw.js CACHE='frame-v25': install precaches per-asset (allSettled, not the
    atomic addAll that could wipe offline); activate CARRIES FORWARD runtime
    county/font cache across version bumps (PRECACHED set guards app code);
    opaque Google-Fonts responses are cached. Humboldt (US-CA-023, 6 MB) is
    DELIBERATELY not precached (would ~double the cellular install) — offline
    users get an honest "not downloaded yet" dead end + it caches on first visit.
  * Honest-failure UX: auto-switch prompts on the Settings toggle tap and
    reports blocked/denied (views.js requestAutoSwitchPermission); Clear-all on
    targets & seen is undoable (toast+Undo via setTargets/setSeen); live overlay
    re-renders only ranked views and keeps scroll (main.js render({scroll})).
    seen.js bulk import normalizes curly apostrophes + prefers CSV cell matches.
    saveRegion enforces MAX_SAVED (share-link import can't make a 4th).
  * CI: all three push-to-trigger workflows now require the push HEAD commit to
    touch the trigger file (github.event.head_commit.modified/added) — a history
    rewrite carrying an old trigger commit no longer re-fires (it did, 07-15,
    firing a docs-only push into a would-be statewide rebuild). refresh-data
    pushes to main with pull --rebase + 5× retry. deploy.yml has a per-branch
    concurrency group. release.yml heading regex tolerates en/em-dash/hyphen.
    checkout/setup-node bumped to v5.
  * eBird proxy (functions/api/ebird/[[path]].js) LOCKED DOWN: endpoint
    allowlist (only obs/geo/recent + nearest/geo/recent/<code>), path-traversal
    normalized away, cross-site Origin/Referer refused (permissive when absent),
    errors not cached. Noah's EBIRD_API_TOKEN repo secret IS set (his choice) so
    the overlay is live. He declined a Cloudflare rate-limit rule (needs a
    custom domain he won't maintain) and the KV limiter (not worth it — key is
    free, eBird self-throttles, worst case is the badges pause). The in-app
    Settings "Proxy base URL" box is a leftover dev control (should stay
    /api/ebird); the app never had an API-key field. Don't re-explain the
    data-refresh pipeline vs the overlay to him — he knows; the overlay is the
    live "seen recently" badges only.
- v24 built 2026-07-15: "Photo-first ranking" — Frame is a photographer's tool
  first again. model/photo.js: shootability(s) = SHOOT_BEHAVIOR[behavior] ×
  SHOOT_SIZE[size] (open 1 / mixed .6 / skulker .25; xs .5 / s .7 / m .85 /
  l 1 / xl 1) — a GLOBAL, VISIBLE formula over the published facets, never a
  hidden per-species number (that was v23's point; don't regress it).
  rankHotspots gained opts.weigh; rankingSpec() resolves it: photo-first is
  DEFAULT ON (localStorage frame.photoFirst, '0' = off) and STANDS ASIDE while
  frame.targetsRank is on (v22 promised frequency-only there). diversity
  ("N birds likely") counts freq.value, never weighted. UI: always-present
  camera chip on Ranking (ui/photo.js, .photo-entry) → explainer dialog with
  the full weight tables + toggle; Settings section; scoreinfo note; species
  pages show their one-line weight. Verified headless 21/21 (fail-first) +
  13/13 model checks incl. order-vs-model equality on real data both modes.
- eBird cookie GOTCHA (cost a probe, 2026-07-15): Noah's updated EBIRD_COOKIE
  secret was pasted ONE PAIR PER LINE (16 lines) — newlines are invalid in an
  HTTP header, so every fetch threw Headers.append. And that error does NOT
  match the "HTML page" dead-cookie abort, so a --force build would have
  ground through writing near-EMPTY county files over good data. Fix is
  permanent in TWO places: build-counties.mjs joins multi-line cookies at
  read, and refresh-data.yml/probe-ebird.yml join in shell (belt for older
  checkouts). ALWAYS probe (~15 s, .github/trigger/probe-ebird) before a
  multi-hour build; the joined cookie was probe-verified live (verdict DATA).
- Data refresh 2026-07-15: full-depth statewide rebuild fired with the fresh
  cookie (the v20 featured-county data finally landing). build-counties.mjs
  now builds FULL_DEPTH counties FIRST (El Dorado, Humboldt, Placer,
  Sacramento) so a mid-run cookie death can't cost them; the workflow commits
  whatever finished to main at run end (~4.5 h). Do NOT push to main while a
  refresh run is in progress — its final push would fail and lose the run.
- v22 shipped 2026-07-14: "Bird lists" — the approved plan, built to spec.
  Stars are INFORMATIONAL by default: the target list (`#/targets`,
  ui/targets.js) shows each starred bird's where/when (best hotspots + peak
  months by PRESENCE via `bestForSpecies(..., { byPresence: true })`); starring
  never re-ranks. Optional toggle `frame.targetsRank` (default OFF) ranks
  hotspots by target presence — `rankHotspots(..., { presenceOnly })` sums
  frequency WITHOUT photoability (this reversed v21; old key `frame.targetsOn`
  is orphaned, harmless). NEW seen/life list (model/seen.js, ui/seen.js,
  `#/seen`): localStorage `frame.seen` (GLOBAL scope — one life list) +
  `frame.newBirdsOn` ("New for me" mode, default OFF). Seen birds are dimmed
  (`.is-seen`) but stay in every list and in the global score; excluded only in
  New-for-me mode. Bulk import on the seen screen matches pasted names/eBird
  rows by longest-name match (verified: no curated name is contained in
  another). model/lists.js `rankingSpec()` is the ONE resolver every ranked
  view (cards, planner, map, hotspot detail) passes to rankHotspots — modes
  compose there. Both modes have standing bars (★ .targetbar / ✦ .newbar) with
  one-tap exits; an empty working set (all targets seen + modes on) renders an
  honest "Nothing left to count" dead end, not silent zeros. Seen/new
  affordances use the --slate token vs gold stars.
  IMPORTANT: Noah merged v22 with an explicit "Push to main" WITHOUT the
  on-device acceptance pass (his call, his gate). The NEEDS-HIS-HANDS items
  from PR #22 were never checked on the iPad: pinch/scroll feel of the new
  screens, the ✓-beside-★ tap target in the matrix's narrow mark cell, the
  real eBird-export import path, and the slate-vs-gold taste read in both
  themes. If he reports friction on any of these, that's expected follow-up,
  not a regression hunt. Decisions he never explicitly confirmed (built to
  recommended defaults, flagged in PR #22): global seen scope, bulk import
  included, new-birds as a standing mode (not a filter chip).
- Session repo access is FIXED at session creation. add_repo/list_repos hang
  on an approval that never surfaces on iPad, the GitHub MCP hard-denies
  unlisted repos, and the sandbox proxy intercepts even public github.com
  fetches. To work with IRstudio (or any second repo), the user must select it
  in the source picker WHEN CREATING the session. Verified 2026-07-05.
- App: `frame/` PWA, no build step; deploys to bird-location-scouting.pages.dev
  via `.github/workflows/deploy.yml` on push to main (previews: staging).
- v21 shipped 2026-07-14: "Pick your own target birds". On-device target list
  (localStorage `frame.targets` = species common names, `frame.targetsOn` = the
  standing engage toggle); `model/targets.js` exposes `activeSpecies()` which
  EVERY rank call site now passes as `rankHotspots(..., { species })` (cards,
  matrix, mapview, hotspot detail). Picker at `#/targets` (`ui/targets.js`):
  all species grouped by dominant habitat, name filter, star toggles, count +
  Clear. Reusable `starButton()` also on species pages (`.sp-head`) and every
  hotspot species-matrix row (`.star-cell`). Standing `.targetbar` on the ranked
  views with a non-destructive "Show all birds" exit; Settings "Target birds"
  section; `scoreinfo.js` shows a `.si-targeting` note when active. NOTE:
  v21's photoability-WEIGHTED targeting was REVERSED by v22 (stars are
  informational now; the optional ranking is presence-only) — don't restore it.
- v19 shipped 2026-07-13: "Field Notebook" reskin. All colors are :root tokens
  in styles.css with a `[data-theme="dark"]` Dawn Mode override — restyle by
  swapping tokens, never hex-in-place. Theme state lives in ui/theme.js
  (floating moon/sun button + Settings checkbox + localStorage `frame.theme`
  + theme-color meta, all synced; a <head> boot script in index.html applies
  the stored theme pre-paint). IBM Plex Sans/Serif/Mono load from Google Fonts
  in index.html; mono is used for EVERY number. Tab icons are inline SVGs in
  main.js TABS. Trust badges color via `.badge.trust-<key>` theme tokens (the
  hexes in scoring.js TRUST are reference only). On wide screens everything
  aligns to the 760px column: the tab bar is a floating dock (same width/
  radius/border as cards) and the corner buttons hug the column edge.
  Known pre-existing wart (NOT from v19): the sticky month/filter header fades
  to transparent at its bottom, so scrolled card titles can collide with the
  filter-hint text — a fix was offered but not yet requested.
- v18 shipped 2026-07-13: reversibility pass — the toast() helper (ui/dom.js)
  gained an optional `action` button (Undo); wired into auto-switch (main.js),
  region delete (model/regions.js `deleteRegion` returns `{removed, wasActive}`)
  and picker Clear (ui/regionpicker.js). Plus `.far` map counties lifted via a
  new `--far` token, dead-end states (ui/views.js `regionDeadEnd`), and the
  picker's standing `.pick-mode` indicator.
- v17 shipped 2026-07-05: region switcher pills, county-picker map, hotspot
  Map tab, location auto-switch (opt-in), region share links (#/import),
  overlay radius 25–50 km by region spread. Saved regions live in
  localStorage (`frame.regions`, max 3). Key modules: ui/mapview.js,
  ui/panzoom.js (shared pan/pinch), ui/regionpicker.js, model/geo.js
  (lat/lng→map projection + point-in-county), data/county-shapes.js
  (generated by scripts/gen-county-shapes.mjs — exports MAP_PROJECTION).
- Field-found gotchas: SVG pointer-capture redirects native clicks — resolve
  taps in pointerup via elementFromPoint (never per-element click handlers on
  the map). The icon bird FACES LEFT (beak left, tail right); its tail is a
  separate path outside the body group — both must share the same rotate()
  pivot. Regenerate apple-touch-icon.png (headless Chromium screenshot of
  icon.svg) whenever icon.svg changes.
- Data: per-county files `frame/data/counties/US-XX-###.json` + committed
  `frame/data/taxonomy.json` (NEVER gitignore it — it shipped broken once).
  Species codes are derived from names via eBird taxonomy, never hand-typed.
- Refresh: `refresh-data.yml`, quarterly cron + push-trigger; needs
  EBIRD_API_TOKEN + EBIRD_COOKIE secrets. Fails fast (~2s) on a dead cookie;
  partial progress is committed; resume skips built counties.
- Releases: auto-published from CHANGELOG.md top section on merge to main.
  Version = service-worker CACHE name (`frame-v<n>`); bump both together.
- `keepalive.yml` commits a monthly heartbeat so GitHub's 60-day inactivity
  rule can never pause the scheduled workflows.
- Git: work on the designated `claude/*` branch; PR + merge to main; a
  branch whose PR merged must be restarted from origin/main.
