// =============================================================================
// WCAG 2.x contrast gate (see /ACCESSIBILITY.md). Run before ANY candidate
// goes to staging: `node frame/scripts/contrast-check.mjs` — zero FAILs
// required. When a change introduces a NEW fg/bg pairing, add its row here in
// the SAME commit; when a token hex changes in frame/src/styles.css, update it
// here too (the rows mirror :root and [data-theme="dark"]).
// Text needs 4.5:1 (3:1 only for 18px+/14px-bold); meaningful non-text marks
// need 3:1. Hue-only differences are NEVER a channel — encodings must carry a
// non-hue channel (symbol/size/luminance/text); rows here verify the
// luminance/contrast half of that promise.
// =============================================================================
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const L = (hex) => { const n = parseInt(hex.slice(1), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return ((x + 0.05) / (y + 0.05)); };
let fails = 0;
const row = (name, fg, bg, need) => {
  const r = ratio(fg, bg);
  if (r < need) fails++;
  console.log(`${r < need ? 'FAIL' : ' ok '} ${r.toFixed(2).padStart(5)} (need ${need}) ${name}`);
};
console.log('--- LIGHT THEME (text 4.5:1) ---');
row('body ink on bg                ', '#2c2318', '#ebe1cf', 4.5);
row('dim text on bg (12px legends) ', '#6d5f49', '#ebe1cf', 4.5);
row('dim text on card              ', '#6d5f49', '#faf4e8', 4.5);
row('accent-ink text on bg         ', '#7a4a10', '#ebe1cf', 4.5);
row('accent-ink text on card       ', '#7a4a10', '#faf4e8', 4.5);
row('accent-ink on accent-wash     ', '#7a4a10', '#f4e6cd', 4.5);
row('facet-mode-ink text on card   ', '#55793f', '#faf4e8', 4.5);
row('hot-cell ink on score-hot     ', '#2a1503', '#f25c00', 4.5);
row('badge digits on count-want grn', '#faf4e8', '#55793f', 4.5);
row('badge digits on block red     ', '#faf4e8', '#a0472f', 4.5);
row('facet-block as TEXT on card (11px)', '#a0472f', '#faf4e8', 4.5);
row('tab ink on dock               ', '#efe6d4', '#695c47', 4.5);
row('active tab ink on dock        ', '#ffd08a', '#695c47', 4.5);
console.log('--- DARK THEME (text 4.5:1) ---');
row('body ink on bg                ', '#f2e9da', '#141210', 4.5);
row('dim text on bg                ', '#a3957c', '#141210', 4.5);
row('dim text on card              ', '#a3957c', '#211b14', 4.5);
row('accent-ink text on card       ', '#f0d9b0', '#211b14', 4.5);
row('facet-mode-ink text on card   ', '#7aa863', '#211b14', 4.5);
row('hot-cell ink on score-hot     ', '#2a1503', '#ff8321', 4.5);
row('badge digits on count-want grn', '#211b14', '#6f9a63', 4.5);
row('badge digits on block red     ', '#211b14', '#e8795a', 4.5);
row('facet-block as TEXT on card (11px)', '#e8795a', '#211b14', 4.5);
row('tab ink on dock               ', '#d8ccb5', '#4a4436', 4.5);
row('active tab ink on dock        ', '#f0a94e', '#4a4436', 4.5);
console.log('--- NON-TEXT MARKS (3:1) ---');
row('focus ring (slate) vs light bg', '#3f77a4', '#ebe1cf', 3);
row('focus ring vs light card      ', '#3f77a4', '#faf4e8', 3);
row('focus ring vs dark bg         ', '#7fb0da', '#141210', 3);
row('hot-pin edge (stroke) vs plain', '#06160f', '#faf4e8', 3);
row('hot cell vs plain cell (light)', '#f25c00', '#faf4e8', 3);
row('hot cell vs plain cell (dark) ', '#ff8321', '#211b14', 3);
if (fails) { console.error(`\n${fails} FAIL(s) — fix before staging (/ACCESSIBILITY.md).`); process.exit(1); }
console.log('\nAll pairs pass.');
