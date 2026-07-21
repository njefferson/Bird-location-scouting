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

## RELEASE TAXONOMY (Noah, 2026-07-19, explicit): STOP CALLING EVERY RELEASE A
## "VERSION". Releases are one of three kinds, and titles/changelogs/PRs/chat
## must say which:
## - VERSION — a milestone that changes what Frame IS (rare; e.g. photo-first
##   ranking, going multi-region).
## - CAPABILITY — Frame can now do something it couldn't (e.g. species photos,
##   install guidance, a new region).
## - ITERATION — a refinement or fix of something that exists (e.g. the
##   status-bar fix, map performance, the share-card repair).
## NUMBERING (Noah, 2026-07-19, follow-up ask): release numbers are the
## triplet VERSION.CAPABILITY.ITERATION (e.g. 3.0.1) — bump the slot matching
## the release's kind and ZERO the slots after it. Seed: the app as of build
## 43 = 3.0.0 (era 1 the original planner, era 2 the photographer-first
## rebuild at v24, era 3 multi-region at v37/38); the numbering change itself
## shipped as iteration 3.0.1. sw.js CACHE = 'frame-<x.y.z>' and
## changelog.js/CHANGELOG.md headings carry the same triplet (bump together);
## the corner stamp renders it via CHANGELOG[0].version. release.yml's heading
## regex accepts the triplet AND legacy vN (don't break backfills). Entries
## v43 and older keep their historical numbers. Label the kind in PR titles
## ("3.1.0, a capability — ..."), changelog headings, Project-facts entries,
## and conversation.

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
- 3.1.0 (CAPABILITY) SHIPPED 2026-07-21 (PR #54, squash b2f2b3b): "Two new
  regions — Hahira, GA and Panama City Beach, FL" — MERGED to main (production)
  on Noah's "promote". His fresh ask (NOT a roadmap item). Frame's 5th/6th
  built-in regions, each its OWN map area (the v38 architecture). AREAS: hahira
  (mid-lat 31.0, viewBox 1000x1096) = Lowndes US-GA-185 (Hahira/Grand Bay WMA/
  Valdosta) + Lanier US-GA-173 (Banks Lake NWR) + Brooks US-GA-027 + Cook
  US-GA-075; panamacity (mid-lat 30.2, viewBox 1000x1119) = Bay US-FL-005 (PCB/
  St. Andrews/Camp Helen) + Gulf US-FL-045 (St. Joseph Peninsula) + Walton
  US-FL-131 (Grayton Beach). All 7 counties FULL_DEPTH. IMPLEMENTATION: NEW
  PARAMETERIZED GENERATORS — scripts/gen-region-shapes.mjs + gen-region-basemap.mjs
  (siblings of the yellowstone ones but config-driven: an AREAS map keyed by
  area id → {file, prefix, midLat, counties FIPS→code}; run with no arg = all
  areas, or `node scripts/gen-region-shapes.mjs hahira` for one). They emit
  src/data/{hahira,panamacity}-{shapes,basemap}.js (exports prefixed HAHIRA_/PCB_).
  The basemap generator KEEPS the coastline layer (unlike yellowstone's) — PCB
  is on the Gulf (14 coast paths), Hahira inland yields none. Natural Earth 10m
  has no state parks at this scale, so LAKES/PARKS layers are empty for both;
  county silhouettes + coastline + roads + rivers carry orientation. WIRING:
  map-areas.js (MAP_AREAS + areaOfCounty both extended), ui/basemap.js LAYERS,
  counties.js (7 COUNTIES + 2 REGIONS). sw.js → frame-3.1.0, new app modules in
  ASSETS (module graph must be complete offline); the county JSONs are NOT
  precached (cache-on-visit — everyday coverage, not a poor-signal park).
  Region pills + geo auto-switch pick both up for free (pointInCounty projects
  via each county's own area — verified with real Hahira/PCB coords).
  DATA: built 2026-07-21 via a SCOPED refresh onto STAGING — Hahira 23 hotspots
  (Lowndes 12/Lanier 5/Brooks 3/Cook 3, top=Grand Bay WMA), Panama City 168
  (Bay 81/Gulf 33/Walton 54, top=Deer Point Lake). Hahira's small count is real
  rural coverage, not a gap (offered Berrien/Echols to widen; Noah promoted as-is).
  KEY INFRA CHANGE (reusable): refresh-data.yml gained an optional `ref` input
  (default main; job env REF) — checkout/commit/deploy all follow it, so
  ref=staging builds a NEW region's data onto the staging candidate and deploys
  the PREVIEW (not prod), fixing the v38 "data landed on main after staging
  deployed" chicken-and-egg. The 7 county defs must exist on the built ref
  (build-counties errors on unknown codes) — with ref=staging they do. PROVEN:
  dispatch mcp actions_run_trigger workflow_id=refresh-data.yml ref=staging
  inputs={ref:staging, scope:"<space-sep codes>"}; a dry test on the dead cookie
  confirmed checkout-staging/validate-pass/build-fail-cookie/no-commit before the
  fresh cookie arrived. VERIFIED headless on the real data: Hahira 23 pins/11 hot,
  PCB 168 pins/14 hot + Gulf coastline, ranking cards + Planner populate, CA (742
  pins)/Yellowstone unchanged, contrast gate green, zero pageerrors. .gitignore
  now ignores node_modules/ (local playwright/sharp installs). NEEDS-HIS-HANDS
  (taste, not regressions): on-device pinch/scroll of the two new maps + the
  Gulf-coast read (he promoted from the staging preview handoff; if the county
  scope wants widening that's follow-up).
- 3.0.1 (ITERATION) SHIPPED 2026-07-19 (PR #53, squash 7be1998): the
  version.capability.iteration numbering itself — MERGED on Noah's "That's all
  perfect. Go" (he accepted the 3.0.0 seed and the three-era reading; the
  scheme + seed are in the NUMBERING rule above, follow it). Implementation:
  changelog.js top entry '3.0.1' (corner stamp + What's-new render it), sw.js
  CACHE 'frame-3.0.1', CHANGELOG.md intro rewritten + '## 3.0.1 —' heading,
  release.yml HEAD regex now /(v\d+|\d+\.\d+\.\d+)/ (legacy backfills still
  parse; tags now frame-<x.y.z>). VERIFIED headless: parser dry-run both
  heading styles, stamp renders 3.0.1, upgrade-from-v43 profile gets the
  What's-new dialog, first-run seeds silently, zero pageerrors. Entries ≤v43
  keep historical numbers (honest history) — never renumber them.
- BUILD 43 (ITERATION) SHIPPED 2026-07-19 (PR #52, squash 7b586b2): "The app
  makes room for the iPhone's clock" — MERGED on Noah's "Merge" (staging URL
  handed over first; the same message set the RELEASE TAXONOMY rule above —
  this is the first release recorded under it). His screenshot from the
  INSTALLED iPhone app: region pills under the status-bar clock/battery,
  Dynamic Island over content. ROOT CAUSE: index.html opts into full-bleed
  (viewport-fit=cover + black-translucent), but only the BOTTOM safe area was
  handled; at the top only the ⓘ/moon corner buttons used
  env(safe-area-inset-top) (why they sat right in his screenshot). Surfaced
  now because the app newly reached his iPhone (v41 install banner); iPad has
  no cutout. FIX (frame/src/styles.css, all env(safe-area-inset-top), zero
  effect at inset 0): body padding-top; fixed body::before strip (height =
  inset, --bg, z 10) backs the status bar so scrolled rows pass BEHIND the
  clock; .bar sticks at the inset instead of 0; .ver-tag + .skip-link:focus
  offset too. sw.js → frame-v43 (styles.css is precached). VERIFIED: headless
  with a simulated 59px inset (sed a stylesheet copy, env()→constant — the
  reusable trick, headless Chromium has no real insets): pills y=73, sticky
  bar pins at y=59 scrolled, only the backdrop paints in the strip; real
  stylesheet at inset 0 pixel-identical to v42; contrast gate green; zero
  pageerrors. NEEDS-HIS-HANDS: the installed-iPhone look (his gate item —
  he merged from the staging screenshot handoff without reporting back the
  on-device check; if the top inset still looks off on his phone that's
  follow-up, not regression).
- SHARE-CARD FIX SHIPPED 2026-07-19 (PR #51, squash 846647f, no version bump —
  no app/sw/index.html change): the v40 og:image card (frame/social-preview.png)
  had shipped with a BLANK tile where the Frame icon belongs (Noah's pasted-link
  screenshot). ROOT CAUSE: gen-social-preview.mjs renders in a setContent() page
  (origin about:blank) and loaded the icon via a file:// <img> src — Chromium
  refuses file:// subresources from about:blank SILENTLY, so the image never
  painted but its CSS border-radius+box-shadow did (a convincing empty square).
  Not a regression: the card was born broken in v40; pre-v40 previews fell back
  to the correct apple-touch-icon ("it used to be correct"). FIX: icon embedded
  as a base64 data URI + the generator now HARD-FAILS (exit 1, no PNG) unless
  img.complete && naturalWidth>0 — a blank card can't be committed again. PNG
  regenerated + visually verified. Merged on Noah's "Merge" (staging URL handed
  over first). GOTCHA told to Noah: iMessage/social apps CACHE link previews —
  old threads keep the blank card; fresh pastes show the fix.
- v42 SHIPPED 2026-07-19 (PR #50, squash f7bc4a6): "The map behaves at full
  zoom" — MERGED on Noah's "Promote. It's the best so far" AFTER his on-device
  deep-zoom repro (his gate, satisfied on iPhone+iPad; his pasted runtime logs
  drove the diagnosis across two rounds). Fixes the v41 known follow-up (deep-
  zoom lag/freeze, ballooning pins, vanishing offshore label). sw.js → frame-v42.
  ROOT CAUSE (the durable lesson, falsified two cheaper theories first): WebKit
  rasterises an SVG fill by the ELEMENT'S OWN EXTENT, not the visible sliver —
  at ×256 a county-spanning fill is a ~30k-px-wide surface, built on FIRST PAINT
  AT EACH NEW DEPTH, blocking the main thread 8-9 s. Round-1 logs blamed DOM
  frees; round-2 logs falsified that (stalls with `free 0 hold N`, one over a
  nearly-empty view) and pinned first-paint-at-depth. FIX — deep-zoom fill
  substitution (mapview.js): past ×32, any in-view fill much larger than the
  window swaps for a copy CLIPPED IN JS (Sutherland–Hodgman against a box 3× the
  view; artificial edges a full viewport off-screen) — pixel-identical inside
  the viewport, microseconds to paint; real geometry restores on zoom-out;
  full↔sub swaps are ATOMIC within one mount slice (giant shape leaves the tree
  the same frame its stand-in lands); log lines show `sub N`. THE FULL v42
  LEDGER (all in mapview.js/panzoom.js/maplog.js unless noted): true map
  virtualisation (DOM only holds what's in the window — pins, labels, basemap,
  county fills; per-item cull bboxes precomputed at load); sliced, abandonable,
  mounts-before-frees stop-swap that runs only when fingers are OFF the glass;
  3s hold-to-load line (Noah's design) so pausing mid-gesture loads under your
  fingers; deep-zoom free deferral; deep-zoom basemap-clip drop; pointer-leak
  self-heal; non-scaling county strokes; transform:scale() pins with a steady
  size cap; pin repaint capped ~8 Hz mid-gesture; corner SCALE BAR (miles +
  live ×zoom during gestures + last swap duration) that doubles as the tap
  target for a DIAGNOSTICS WINDOW with in-window Copy-log; per-type progress
  readout + compositor spinner during swaps; tiny corner version stamp
  (.ver-tag, renders CHANGELOG[0].version — screenshot-identifiable builds);
  persistent RUNTIME LOG (ui/maplog.js, localStorage frame.mapLog, last 300
  events, written synchronously so a force-killed tab keeps the pre-freeze
  tail; also Settings → Map diagnostics). VERIFIED (this session, on the merged
  tree): headless ×4→×256 zoom logs `swap ×256 … sub 2`, swaps 0.04-0.10 s at
  depth (was 8-9 s), 3 .fill-sub nodes in DOM, clean restore, zero pageerrors.
  SANDBOX GOTCHA (new): pages.dev is NO LONGER reachable from the session
  sandbox (proxy tunnel refused) — verify deployed builds by serving frame/
  locally (python3 -m http.server + playwright-core from npm; identical code,
  there is no build step).
- PRECACHE FOOTPRINT (2026-07-18, check-in after the Yellowstone/Yosemite
  full-depth captures): sw.js now precaches 7 county files = ~16.6 MB of offline
  data (Home 067 3.79 + 017 1.64 + 061 1.98; Yosemite 043 2.11 + 109 1.94;
  Yellowstone park 029 2.09 + 039 3.03), plus small app code/fonts. Grew because
  Yosemite/Yellowstone counties went FULL_DEPTH and the park counties are
  precached for offline-in-the-park. Humboldt (023, 6 MB) is still deliberately
  NOT precached. FLAGGED TO NOAH: the first-load/install download is ~16-17 MB;
  fine on wifi, and it's the price of true offline in three parks, but if the
  cellular install feel matters, the Yosemite/Yellowstone park counties are the
  ones to drop from precache (they'd then cache on first visit like Humboldt).
  Data capture itself is DONE & correct — see v37/v38/v39 facts (all 5 GYE
  counties 254-308 spp each via the full-taxonomy build; Yosemite pair 268-271
  spp; every county built 2026-07-18 at full depth).
- v41 SHIPPED 2026-07-18 (PR #49, squash 78183e6): "Species photos + install
  guidance + dense-map fix" — MERGED to main on Noah's "It's better, promote to
  main" (his gate, satisfied on iPad; earlier photo/crop rounds also on-device).
  THREE features shipped together; sw.js → frame-v41. Facts a later session needs:
  (1) SPECIES PHOTO THUMBNAILS: a real photo beside every species name (target
  picker, life-list picker, hotspot species table, + a 56px portrait on the
  species page). Source is WIKIMEDIA COMMONS ONLY (never eBird/Macaulay —
  copyrighted, non-redistributable); freely-licensed (PD/CC0/CC-BY/CC-BY-SA + two
  "Copyrighted free use" Noah OK'd). Files: frame/data/thumbs/<eBird-code>.webp
  (272 files, ~1.1 MB, 128px), frame/data/thumbs.json (code→{n,a,l,s} credits),
  frame/data/thumb-crops.json (per-photo crop overrides). ui/thumbs.js:
  speciesThumb(s,size,onOpen) — photo if manifest has s.code else guild
  silhouette fallback; onOpen makes the photo a tap-target to the species page
  (kept off tab order — decorative dup of the name link). Manifest loads at boot
  (main.js loadThumbs). sw.js precaches thumbs.json ONLY; images runtime-cache on
  first view (light install). BUILD PIPELINE: scripts/build-thumbnails.mjs +
  .github/workflows/build-thumbnails.yml (dispatchable; runs on a RUNNER because
  the sandbox egress policy BLOCKS wikipedia.org/commons — 403). Per species:
  eBird name → sciName+code (taxonomy API) → Wikipedia free-licensed lead image
  (pilicense=free) → Commons imageinfo license/author → sharp crop → webp. CROP
  RULE (the durable answer to "handle crops per-photo + a rule for new photos"):
  default = punchy content-aware 'attention' square crop; override a bad one in
  thumb-crops.json by code → "contain" (whole photo, transparent letterbox) |
  [fx,fy] focal point | gravity string. New photos get the default automatically;
  only bad crops need a line (currently just stejay:"contain"). Modes: `probe`
  (report, no commit), `build` (commit+deploy), `--only <codes>`, `--force`.
  GOTCHA: dispatch via MCP actions_run_trigger; the workflow has its OWN
  concurrency group (thumbnails-<ref>) so a branch deploy can't cancel an
  in-flight build (a shared deploy-<ref> group killed the first full run).
  Reviewed all 272 crops via a local montage (sharp installed locally from npm;
  sandbox CAN reach registry.npmjs.org). (2) INSTALL GUIDANCE (ui/install.js):
  dismissible banner (frame.installDismissed) tells new users how to add to home
  screen — iOS Share→Add to Home Screen steps in a dialog, Android/desktop a
  one-tap native Install via beforeinstallprompt; permanent step-by-step also in
  Settings → "Install this app" (re-referenceable after dismiss). isStandalone()
  hides everything once installed. Banner prepended in main.js render() (guarded
  off #/settings). (3) DENSE-MAP FIX (ui/mapview.js + ui/panzoom.js): Humboldt
  has 597 hotspots. LABEL DECLUTTER — every pin has a name in the DOM (default
  hidden via .pin-name{visibility:hidden}); a debounced relabel() on settle adds
  .lbl-show to a NON-OVERLAPPING, rank-first subset in view (cap 36), so it never
  paints hundreds of overlapping labels (was unreadable + the paint lag). Plain
  pins smaller (home.w*0.006) + soft/translucent (fill-opacity .78, soft stroke)
  so clusters read as a stipple; hot tier keeps firm orange dot (r×1.5). PAN/
  FRAME FIX — coastal counties have PELAGIC pins WEST of the county land, off the
  CA canvas (negative x). mapview now frames the opening view + pan bounds on the
  PIN bbox (county bbox ∪ all pin positions), and panzoom takes a `bounds` option:
  when set, clampPan lets the view CENTRE reach anywhere in bounds (edge/offshore
  pins can be centred) instead of the old [0,W] canvas clamp (region picker passes
  NO bounds → unchanged). homeBox no longer clamps to [0,W]. The known follow-up
  (deep-zoom lag, ballooning pins, vanishing offshore label) was FIXED by v42 —
  see the v42 entry.
- v39 SHIPPED 2026-07-18 (PR #47, squash fb745f7): "Yellowstone birds now count"
  — the species-curation pass v38 flagged as its natural follow-up. MERGED on
  Noah's "promote to main". Added 99 Rocky-Mountain / Greater-Yellowstone species
  to src/data/species.js (SPECIES now 272; taxonomy.json 173→272) — the northern
  birds the region's data reports but the CA-grown curated list didn't count.
  CHOSEN FROM THE REGION'S OWN DATA, not guessed: new `codes` command in
  build-counties.mjs lists species present-but-uncounted, resolved code→name vs
  the live eBird taxonomy, sorted by peak freq (run via dump-codes.yml — needs
  only the API token, no cookie). Each species authored with full facets
  (guild/size/nest/behavior/habitat + note); eastern/pelagic vagrants in the data
  deliberately EXCLUDED. NO DATA REBUILD/COOKIE NEEDED — v37's full-taxonomy
  capture already stored every species by code; only taxonomy.json (name→code)
  needed regenerating, done by NEW sync-taxonomy.yml (validate names — hard gate,
  exit 1 on a typo — → rewrite taxonomy.json → commit+deploy the branch it runs
  on; dispatch it on staging then promote). sw.js → frame-v39. WHY CALIFORNIA IS
  SAFE (verified, and the KEY correctness fact): every hotspot has real
  freqByMonth, so inference.js's model path NEVER fires — a species counts only
  where eBird actually reports it, else a real 0 (inference.js step 1b). No
  phantom presence. A few added species also occur in CA (Killdeer, American
  Crow, House Sparrow, Am. White Pelican) and were genuinely missing from the CA
  count before — they now count there too from real data (a gain, not a
  regression). GOTCHAs: (1) species NAMES must exactly match eBird comName or
  validate fails the job — authored from the dump's exact strings (e.g. "Western
  Warbling Vireo" not "Warbling Vireo"=wewvir2, "Northern Yellow Warbler",
  "Canada Jay", "American Goshawk", "Northern House Wren"). (2) apostrophe names
  use double-quotes in species.js (`name: "Barrow's Goldeneye"`) — a
  `grep "name: '"` miscounts them. (3) workflow_dispatch needs the workflow file
  on the DEFAULT branch (main) to be dispatchable on another ref — so
  sync-taxonomy.yml was landed on main first, then dispatched on staging.
  Verified headless on the deployed staging build: search finds Trumpeter
  Swan/Boreal Owl, YS hotspots 55-95 species likely (real data), CA Home
  unchanged (50 cards/~70 likely), schema clean (no dup names, all facet vocab
  valid), zero pageerrors. REUSABLE: `codes`+`sync-taxonomy` make curating any
  future region's specialties a quick no-rebuild job. NEEDS-HIS-HANDS: a birder's
  eye on the facet calls (size/nest/behavior) + notes — my authoring.
- v38 SHIPPED 2026-07-18 (PR #46, squash 9512dfa): "YELLOWSTONE" — the app's
  FIRST REGION OUTSIDE CALIFORNIA, for Noah's daughter's trip (his "I was wrong
  about Yosemite. My daughter is going to Yellowstone"). MERGED on his
  "promote" after an on-staging look (he caught two things live, both fixed
  pre-merge — see below). ARCHITECTURE — MAP AREAS (data/map-areas.js): each
  area = { viewBox, projection, shapes }; california (county-shapes.js,
  UNTOUCHED) + yellowstone (yellowstone-shapes.js, generated by
  scripts/gen-yellowstone-shapes.mjs — same plotly counties-fips source, own
  MID_LAT 44.6, 1000×1152 viewBox). areaOfCounty/areaOfRegion resolve by code
  (codes unique across areas). geo.js: latLngToMap(lat,lng,area) (default
  'california' keeps old call sites right); countyRings resolves a code's area
  → ALL ring-based helpers (centroid/bbox/pointInCounty) are area-correct for
  free; pointInCounty projects with the county's own area (auto-switch works
  standing in Gardiner MT). mapview resolves area from the active region;
  regionpicker stays CA-ONLY BY DESIGN (custom regions are a CA/NV feature —
  WY/MT/ID counties have shapes only on the yellowstone canvas). BASEMAP:
  ui/basemap.js takes an area param and picks per-area layer modules (CA =
  data/basemap.js, YS = data/yellowstone-basemap.js generated by
  gen-yellowstone-basemap.mjs — Natural Earth via raw.githubusercontent.com,
  the ONE host reachable from the sandbox, so generation runs LOCALLY); YS
  layer: Yellowstone+Grand Teton park fills, Yellowstone/Jackson/Hebgen lakes,
  Yellowstone/Gallatin/Shoshone rivers, hwy shields 89/14/20; WATER_SHAPES
  (OSM shorelines) is CA-only curation. REGION: id 'yellowstone' = US-WY-029
  (Park WY), US-WY-039 (Teton WY), US-MT-031 (Gallatin), US-MT-067 (Park MT),
  US-ID-043 (Fremont ID). DATA: all 5 captured 2026-07-18 at FULL depth under
  the FULL-TAXONOMY build (721 hotspots, 2.09/3.03/2.20/0.74/0.87 MB,
  282-308 distinct species per county — every species stored, so the future
  species-curation release needs NO rebuild/cookie). sw.js → frame-v38; new
  modules in ASSETS (REQUIRED — module graph must be complete offline);
  precached US-WY-029+039 (~5.1 MB, the park proper; MT/ID gateway counties
  cache on visit). NOAH'S TWO LIVE CATCHES: (1) "region doesn't have a map
  yet" = the data landed on main AFTER staging deployed — rebase staging onto
  main when a data run lands mid-candidate. (2) "why is there no empty base
  map already there?" → mapview's no-data state now renders regionDeadEnd PLUS
  the full base map below (geometry is app code; only pins need data); the
  MODE-empty state stays text-only on purpose (a bare map would mislead); no
  legend row when no pins. HONEST LIMITATION (in changelog): the curated
  species list is CA-grown — northern specialties (Trumpeter Swan, boreal
  woodpeckers) are IN the data but NOT counted until curated; that species
  pass is the natural v39. Verified headless: 721 pins/25 hot on the YS map,
  park/lake/river labels, CA regression intact (63 counties/759 pins/50
  cards), both empty states, zero pageerrors. GOTCHA: GitHub concurrency
  keeps ONE queued run per group — dispatching a new refresh CANCELS a queued
  one (never queue two).
- v37 SHIPPED 2026-07-18 (PR #45, squash ad105e6): "Yosemite built-in region,
  full-depth counties, scoped rebuilds" — MERGED on Noah's "promote to main"
  (for his daughter's trip, so timing mattered). THREE parts:
  (1) REGION: REGIONS in data/counties.js gained { id:'yosemite', counties:
  ['US-CA-043','US-CA-109'] } (Mariposa = Valley/Wawona/El Portal, Tuolumne =
  Tuolumne Meadows/Hetch Hetchy/Hodgdon). Madera/Mono LEFT OUT on purpose (park
  slices are trail-only wilderness; their top spots are foothill/east-side).
  Both county files PRECACHED in sw.js (were ~470 KB at depth 15 — sizes GREW
  with the full-depth data; check before precaching more). sw.js → frame-v37.
  (2) DEPTH: Mariposa + Tuolumne → FULL_DEPTH in counties.js. WHY PINS WERE
  "MISSING" (Noah asked): DEFAULT_DEPTH=15 — the statewide build keeps only the
  top-15 hotspots per county BY DESIGN; only El Dorado/Placer/Sacramento/
  Humboldt (+now the Yosemite pair) keep every hotspot. Nobody ever had every
  pin statewide; "full-depth statewide rebuild" in older notes meant "statewide
  run in which the FEATURED counties' full data landed". Statewide-every-pin
  would be ~15k hotspots, >6h job limit, ~100MB+ — offered, not recommended.
  (3) SCOPED REBUILDS (refresh-data.yml): dispatch input `scope` (e.g.
  "US-CA-043 US-CA-109") or a "scope:"-prefixed line in a push-trigger commit
  message force-rebuilds JUST those counties (~minutes); NEVER applies to the
  quarterly schedule; message via env (no shell interpolation). GOTCHA: the
  session git RELAY drops head_commit metadata, so push-to-trigger guards
  SKIP legitimate trigger bumps — USE MCP WORKFLOW DISPATCH instead
  (actions_run_trigger worked all session). Relay also refuses branch deletes
  (stale claude/trigger-probe branch remains, harmless). COOKIE: the 07-15
  cookie DIED in 3 days (probe verdict HTML); Noah pasted a fresh one
  2026-07-18, probe-verified DATA, and the scoped Yosemite rebuild was fired
  (run 29632807337). ALSO PROVEN (Noah asked): SW version bumps do NOT
  re-download data — activate() carries runtime-cached counties cache-to-cache
  (zero network, tested live v37→v38), and precached files revalidate with 304/
  0 bytes when unchanged; only genuinely changed files transfer.
- v36 SHIPPED 2026-07-18 (PR #44, squash 34e7545): "Navigation, reworked" —
  MERGED to main on Noah's "Everything is perfect on my iPhone promote to main"
  (his on-device gate SATISFIED, iPhone). Grew from the roadmap item "More
  navigation apps" into a full nav pass. THREE things landed together:
  (1) WAZE + ANDROID CHOOSER: hotspotMapLinks() (data/hotspots.js) gained `waze`
  (https://waze.com/ul?ll=<lat>%2C<lng>&navigate=yes — app if installed, website
  if not) and `geo` (geo:<lat>,<lng>?q=...(name) — Android's "open with" chooser).
  (2) MAP LINKS MOVED OFF THE CARDS onto the LOCATION PAGE: the ranking card no
  longer renders any map buttons; they live only on the hotspot detail
  (renderHotspotDetail .access-box, under a new `.access-label` "Navigate here").
  A shared mapButtons(h) helper in ui/views.js renders Apple/Google/Waze + (only
  when isAndroid()) an "Other maps" geo: button — used by the detail page.
  (3) THE WHOLE CARD IS A TAP-TO-OPEN NAVIGATION TILE → the location page; the
  old "Species matrix" BUTTON IS GONE (that outdated term retired from the UI —
  the #/matrix ROUTE is the Planner, unaffected). Card node is `div.card.tappable`
  with an onclick that bails on inner controls (`e.target.closest('a,button,
  input,textarea,select,label')`) so species links + the "birds likely" chip
  still work; the LOCATION NAME is a real `<a.card-title-link href="#/hotspot/id">`
  (the keyboard/SR path — no invalid nested-interactive since the card div isn't
  itself a link). CSS: `.card.tappable` cursor+hover-lift+`:active` press (NOT
  hue-only; reduced-motion kill-switch applies), `.card-title-link` inherits the
  heading, underline on hover; removed dead `.card-actions` rule. sw.js →
  frame-v36. Verified headless: 50 cards / 0 buttons, card-body tap → location
  page, species-link tap → #/species (guard holds), detail shows Apple/Google/
  Waze under "Navigate here", Android UA adds "Other maps" geo: link, contrast
  gate green, zero pageerrors. ROADMAP now has ONE item: "More map landmarks".
  NEEDS-HIS-HANDS: none — accepted on iPhone.
- v35 SHIPPED 2026-07-18 (PR #43, squash 6d1e847): "Drop the access blurbs
  entirely" — MERGED to main on Noah's "Promote". Follow-through on v34: Noah
  confirmed the 30 seed `access` notes were GENERATED park summaries (fees/
  parking/trails/"dawn best"), NOT his field notes — same false-confidence v34
  removed from the placeholder, one layer down — so ALL 30 are gone. CHANGES:
  frame/src/data/hotspots.js — removed the `access` field from all 30 hotspots
  AND the 4 shared blurb constants (ARP/FOLSOM/NATOMA/FOOTHILL); header comment
  updated (no more "access notes"). frame/src/ui/views.js — DELETED the dead
  note UI: the card "Access" button, the toggleNotes() function, and the detail
  "Access:" line; the hotspot detail `.access-box` now holds ONLY the Apple/
  Google Maps links. styles.css — dropped the now-unused `.card-notes` and
  `.access-note` rules (`.access-box`/`.access-links` stay). sw.js → frame-v35.
  Getting-there stays universal (Maps buttons on every card + hotspot); habitat
  chips convey the park's character. COUNT: it was 30 (the seed hotspots), NOT
  the "~60" my earlier note claimed nor the "31" I said in chat — corrected
  everywhere. Verified headless: 50 cards / 0 Access buttons, every card keeps
  both Maps buttons, effie-yeaw detail shows only Maps (no note, no crash), no
  access prose left in source, zero pageerrors. ALSO (this same push, roadmap-
  only fast-forward to main): added roadmap item "More navigation apps" (Waze +
  others alongside Apple/Google Maps) at Noah's request. ROADMAP now has TWO
  items: "More map landmarks" then "More navigation apps".
- v34 SHIPPED 2026-07-18 (PR #42, squash 3bd14be): "Honest access notes" —
  resolved the roadmap item "access notes: fill or drop" to DROP the placeholder.
  MERGED to main on Noah's "Promote the Main". FILL WAS RULED OUT (no honest
  source: eBird hotspot info carries no access/parking guidance, OSM tags too
  sparse). SUPERSEDED BY v35 — see the v35 entry above: v34 kept the 30 seed
  blurbs (shown only where they existed); v35 dropped ALL 30 after Noah confirmed
  they were generated park summaries, not his notes. KEY FACT: the 30 `access`
  notes (NOT ~60 — that was a miscount) were the ORIGINAL SEED hotspots
  hard-coded in frame/src/data/hotspots.js (ARP/FOLSOM/NATOMA/FOOTHILL constants
  + per-site strings) from the app's genesis commit df04719 (2026-06-28),
  NOT anything he wrote recently; the ~300 data-built county hotspots
  (data/counties/*.json) have NO access field. CHANGE (frame/src/ui/views.js):
  the ranking-card "Access" button (card actions) and the hotspot-detail
  "Access:" line (.access-box → now .access-note wrapped) render ONLY when
  `h.access` exists — `h.access ? el(...) : null` in both places; removed the
  old placeholder fallback text ("No curated access notes for this hotspot
  yet…") from toggleNotes entirely. Apple/Google Maps buttons stay on EVERY card
  and EVERY hotspot page (getting-there is universal). styles.css added
  `.access-note { margin: 0 0 4px; }`. sw.js → frame-v34. Verified headless: 50
  ranking cards, 12 Access buttons (curated only), 0 placeholder text in DOM,
  expanded note real (no undefined/null), every card has both Maps buttons; seed
  detail (mather-lake) shows its note + Maps, no undefined; contrast gate green;
  zero pageerrors. NEEDS-HIS-HANDS: on iPad, that a hotspot with NO Access button
  doesn't read as "missing" (Maps buttons must clearly cover getting there).
  ROADMAP now has ONE item left: "More map landmarks" (closed/restricted areas +
  school campuses on the county map, offline).
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
  Release number = service-worker CACHE name (`frame-<x.y.z>`, legacy
  `frame-v<n>` through v43); bump both together.
- `keepalive.yml` commits a monthly heartbeat so GitHub's 60-day inactivity
  rule can never pause the scheduled workflows.
- Git: work on the designated `claude/*` branch; PR + merge to main; a
  branch whose PR merged must be restarted from origin/main.
