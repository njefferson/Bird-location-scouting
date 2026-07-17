// WCAG 2.x contrast for the app's real token pairs, both themes.
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const L = (hex) => { const n = parseInt(hex.slice(1), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return ((x + 0.05) / (y + 0.05)); };
const row = (name, fg, bg, need) => {
  const r = ratio(fg, bg);
  console.log(`${r < need ? 'FAIL' : ' ok '} ${r.toFixed(2).padStart(5)} (need ${need}) ${name}`);
};
console.log('--- LIGHT THEME ---');
row('body ink on bg              ', '#2c2318', '#ebe1cf', 4.5);
row('dim text on bg (12px legend)', '#8a7b64', '#ebe1cf', 4.5);
row('dim text on card            ', '#8a7b64', '#faf4e8', 4.5);
row('accent-ink on accent-wash   ', '#7a4a10', '#f4e6cd', 4.5);
row('accent (chip text) on card  ', '#cf7f22', '#faf4e8', 4.5);
row('hot-cell ink on score-hot   ', '#2a1503', '#ff6a00', 4.5);
row('badge: card text on park grn', '#faf4e8', '#7aa863', 4.5);
row('badge: card text on block rd', '#faf4e8', '#a0472f', 4.5);
console.log('--- DARK THEME ---');
row('body ink on bg              ', '#f2e9da', '#141210', 4.5);
row('dim text on bg              ', '#a3957c', '#141210', 4.5);
row('dim text on card            ', '#a3957c', '#211b14', 4.5);
row('accent-ink on accent-wash   ', '#f0d9b0', '#3a2c15', 4.5);
row('hot-cell ink on score-hot   ', '#2a1503', '#ff8321', 4.5);
row('badge: card text on park grn', '#211b14', '#5f8a55', 4.5);
console.log('--- non-text (3:1) ---');
row('hot pin vs card pin (map)   ', '#ff6a00', '#faf4e8', 3);
row('want vs block badge (hues)  ', '#7aa863', '#a0472f', 3);

// =============================================================================
// HOW TO USE (see /ACCESSIBILITY.md): run `node frame/scripts/contrast-check.mjs`
// before any candidate goes to staging — zero FAILs required. When a change
// introduces a NEW fg/bg pairing, add its row here in the same commit. Token
// hexes live in frame/src/styles.css (:root and [data-theme="dark"]).
// =============================================================================
