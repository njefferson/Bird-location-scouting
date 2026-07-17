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
| A1 | S1 | Filter category count badges (v31): green "must-include" vs red "exclude" circles differ by **hue only** (2.2:1 between the hues) — the named fail state, in a fresh feature | Add symbol redundancy: green badge reads `+N`, red reads `−N`; keep the hues |
| A2 | S1 | Filter status-lights row: wanted vs excluded tiles differ by ring/wash hue only | Slash overlay on excluded lights (same language as the facet pills) |
| A3 | S1 | Badge number contrast: white-on-green 2.52:1 (light) / 4.27:1 (dark) | Darken the green badge ground (or switch to dark ink) to ≥ 4.5:1 both themes |
| A4 | S1 | `--dim` text on `--bg` 3.18:1 and on `--card` 3.76:1 in light theme — legends, captions, subtitles all run at 12–13px | Darken light-theme `--dim` until both pairs ≥ 4.5:1, keeping the warm hue |
| A5 | S1 | Accent-coloured text (section headers `.tg-group`, `.facet-sec h3`, etc.) 2.86:1 on card | Use `--accent-ink` for accent *text*; keep `--accent` for marks/fills |
| A6 | S2 | Focus rings suppressed: six `:focus-visible` rules end in `outline: none` with colour-only replacement | New `--focus` ring token; visible 2px ring on every interactive element, both themes |
| A7 | S2 | Keyboard gaps: planner month-sort headers / rowheads / cells are `th`/`td` with `onclick`; map pins are pointer-only SVG circles | Buttons inside sortable `th`; rowheads become buttons; pins get `tabindex="0"` + Enter (planner remains the keyboard-equivalent path and is documented as such) |
| A8 | S2 | No `prefers-reduced-motion` handling (pan/zoom limit pulses, transitions) | Global `@media (prefers-reduced-motion: reduce)` kill-switch |
| A9 | S3 | Hot pin fill vs plain pin fill 2.62:1 (non-text 3:1) — size + stroke + on-top currently carry it | Deepen hot-pin stroke or size on light theme; re-measure |
| A10 | S3 | Informational tiny text: 7px sparkline month letters, 8px count caption, 9–10px state words | Bump informational ones to ≥ 11px; leave decorative caps |
| A11 | S3 | Toasts: confirm they announce (`role="status"`/`aria-live`) for screen readers | Add if missing |
| A12 | S3 | No skip-to-content; heading order sweep; sparkline SVGs lack text alternatives where they carry data | Sweep + fix in the same pass |

## Prevention — how this stays true

- `CLAUDE.md` carries the standing rule: every session must treat the rules
  above as part of the DESIGN step (state the non-hue channel for each new
  encoding **in the plan**, before code), and the grayscale + contrast +
  keyboard passes as part of verification.
- New fg/bg pairs get added to `contrast-check.mjs` in the same commit that
  introduces them.
- The register above is append-only history: new findings get rows, fixed
  rows get their PR number — never silently deleted.
