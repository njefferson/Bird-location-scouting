# Accessibility — a top priority, not a feature

**Owner's standing rule (Noah, 2026-07-17):** accessibility is a top priority
for this project. **Colour-blind-inconsiderate design is a fail state** — a
release that encodes meaning in hue alone is broken, the same as a crash.
This file is the working contract: the design rules every change must pass,
the verification recipe, and the live audit register.

## The rules (run these at DESIGN time, not review time)

1. **Never hue alone.** Every visual encoding must carry at least one
   non-hue channel a colour-blind or grayscale viewer can read:
   - a **luminance step** (clearly lighter/darker, monotonic with meaning),
   - a **shape/glyph** (slash, ring, ✓, +/−, dashed),
   - a **size** difference, or
   - **text** that says the state outright.
   Precedents already in the app: the traffic-light presence row steps
   dark→light (v29); excluded facet pills carry a slash + line-through; hot
   map pins are 1.35× larger, not just orange.
2. **Contrast is measured, not eyeballed.** Text ≥ 4.5:1 (≥ 3:1 only for
   18px+/14px-bold); meaningful non-text marks ≥ 3:1 against their ground.
   Run `node frame/scripts/contrast-check.mjs` — add a pair to the list
   whenever a new fg/bg combination ships. "Warm and gentle" (the product's
   taste) is tuned *within* AA, never instead of it.
3. **Keyboard reaches everything.** Anything tappable is a real `<button>`
   (or carries `tabindex` + Enter/Space handling). Focus must be *visible*:
   never `outline: none` without a replacement ring that passes 3:1.
4. **Announce state, don't imply it.** Toggles carry `aria-pressed`,
   disclosures `aria-expanded`, icons that carry meaning get labels;
   decorative art is `aria-hidden`.
5. **Respect motion settings.** Animations/transitions sit behind
   `@media (prefers-reduced-motion: no-preference)` or are disabled under
   `reduce`.
6. **Text stays legible.** No informational text below 11px; tiny caps
   (≤10px) only for decorative/redundant labels.

## Verification recipe (before any candidate goes to staging)

- **Grayscale pass:** render the changed screens with `filter: grayscale(1)`
  (headless is fine) — every state distinction must survive. This is the
  colour-blind fail-state gate.
- **Contrast pass:** `node frame/scripts/contrast-check.mjs` — zero FAILs.
- **Keyboard pass:** Tab to every new control; Enter/Space activates it;
  focus ring visible in both themes.
- Record the results in the PR body next to the usual VERIFIED notes.

## Audit register — 2026-07-17 full review (post-v31)

Severity: **S1** = fail state / WCAG failure, fix first. **S2** = operability
gap. **S3** = opportunity. Status moves to ✅ with the fixing PR number.

| # | Sev | Finding | Fix |
|---|-----|---------|-----|
| A1 | S1 | Filter category count badges (v31): green "must-include" vs red "exclude" circles differ by **hue only** (2.2:1 between the hues) — the named fail state, in a fresh feature | ✅ v32 (PR #38): badges read `+N`/`−N`; grounds re-measured (see A3) |
| A2 | S1 | Filter status-lights row: wanted vs excluded tiles differ by ring/wash hue only | ✅ v32 (PR #38): `.ffp-light.exclude::after` slash |
| A3 | S1 | Badge number contrast: white-on-green 2.52:1 (light) / 4.27:1 (dark) | ✅ v32 (PR #38): `--count-want` #55793f light (4.57) / #6f9a63 dark (5.26) |
| A4 | S1 | `--dim` text on `--bg` 3.18:1 and on `--card` 3.76:1 in light theme — legends, captions, subtitles all run at 12–13px | ✅ v32 (PR #38): `--dim` #6d5f49 (4.79 on bg, 5.67 on card) |
| A5 | S1 | Accent-coloured text (section headers `.tg-group`, `.facet-sec h3`, etc.) 2.86:1 on card | ✅ v32 (PR #38): links, headers, chevrons, `.rel-ver` etc. → `--accent-ink`; green text → new `--facet-mode-ink` |
| A6 | S2 | Focus rings suppressed: six `:focus-visible` rules end in `outline: none` with colour-only replacement | ✅ v32 (PR #38): global `:focus-visible` slate ring; all six `outline: none` removed |
| A7 | S2 | Keyboard gaps: planner month-sort headers / rowheads / cells are `th`/`td` with `onclick`; map pins are pointer-only SVG circles | ✅ v32 (PR #38): sort headers + rowheads are real buttons (`.th-btn`); pins stay pointer-only by design (759 tab stops would be unusable) — the Planner is the keyboard path and the map `aria-label` says so |
| A8 | S2 | No `prefers-reduced-motion` handling (pan/zoom limit pulses, transitions) | ✅ v32 (PR #38): global kill-switch shipped |
| A9 | S3 | Hot pin fill vs plain pin fill 2.62:1 (non-text 3:1) — size + stroke + on-top currently carry it | ✅ v32 (PR #38): hot-pin stroke 2×; `--score-hot` light nudged #ff6a00→#f25c00 (cells 3.04:1) |
| A10 | S3 | Informational tiny text: 7px sparkline month letters, 8px count caption, 9–10px state words | ✅ v33: informational text → 11px (`.si-count-cap`, `.fi-cap`, `.facet-pick .fi-state`, `.presence-label`, `.ffp-cat-label`; wanted-state text → `--accent-ink` to hold AA). Documented-exempt: sparkline month letters (decorative axis; the data is now in the sparkline aria-label), `+N/−N` count badges (compact, title tooltip), chevrons, the ON/OFF pill (duplicates its own 13px label) |
| A11 | S3 | Toasts: confirm they announce (`role="status"`/`aria-live`) for screen readers | ✅ v32 (PR #38): toasts carry `role="status"` |
| A12 | S3 | No skip-to-content; heading order sweep; sparkline SVGs lack text alternatives where they carry data | ✅ v33: `.skip-link` (first Tab stop → `#app`, `<main tabindex=-1>`, nav `aria-label=Main`); sparklines get `role=img` + a spoken trend label (“peaks in June”); heading order swept — every screen is h1 (in `.bar`) → h2 (card/section) → h3 (dialog subsections), no skips |
| A13 | S1 | Active tab distinguished from inactive by hue alone; active gold also 3.3:1 on the old dock | ✅ v32 (PR #38): active tab carries a bar under its icon; dock deepened to #695c47 (inks 5.26/4.54) |

## Prevention — how this stays true

- `CLAUDE.md` carries the standing rule: every session must treat the rules
  above as part of the DESIGN step (state the non-hue channel for each new
  encoding **in the plan**, before code), and the grayscale + contrast +
  keyboard passes as part of verification.
- New fg/bg pairs get added to `contrast-check.mjs` in the same commit that
  introduces them.
- The register above is append-only history: new findings get rows, fixed
  rows get their PR number — never silently deleted.
