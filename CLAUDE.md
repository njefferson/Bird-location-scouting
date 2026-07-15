# Standing rules for Claude sessions on this repo

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
## ROADMAP (Noah, 2026-07-15, in frame/src/data/roadmap.js): (0) a bottom tab
## bar that never disappears — the floating menu blends into the cards behind it
## in bright light and seems to vanish; needs a firmer surface/shadow or blur,
## both themes (his NEW ask, on-device, now the top roadmap item); (1) icons do
## things everywhere — tap-to-filter wherever facet icons appear and it makes
## sense; (2) collapsible species sections in the target-bird picker. He said
## "other things" beyond these — open-ended; confirm before inventing. Older
## v22 thread ("possibly other things off of that") stays open too.

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

## Project facts (verified, don't rediscover)
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
