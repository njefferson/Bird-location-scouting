// =============================================================================
// gen-social-preview.mjs — regenerate frame/social-preview.png (the 1200×630
// link-preview / Open Graph card that unfurls when the app URL is shared).
// =============================================================================
// Renders a card (the app icon + wordmark + tagline, in the warm Frame palette)
// with headless Chromium and writes the PNG. Referenced by the og:image /
// twitter:image tags in index.html. Rerun if icon.svg, the name, or the tagline
// changes; the output is committed and served at the site root.
//
//   node scripts/gen-social-preview.mjs        (run from frame/)
//
// Sandbox note: Chromium is preinstalled; Google Fonts are blocked, so the card
// uses a system serif (Georgia/DejaVu) — fine at card size.
// =============================================================================
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pw from '/opt/node22/lib/node_modules/playwright/index.js';

const { chromium } = pw;
const FRAME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const iconURL = pathToFileURL(path.join(FRAME, 'icon.svg')).href;

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:1200px; height:630px; }
  body { display:flex; align-items:center; gap:64px; padding:0 84px;
    background: radial-gradient(120% 140% at 78% -10%, #f6d6a4 0%, rgba(246,214,164,0) 55%),
                linear-gradient(135deg, #f4ecdb 0%, #e8ddc7 100%);
    font-family: Georgia, 'Times New Roman', serif; color:#2b2620; }
  .icon { width:384px; height:384px; flex:none; border-radius:84px;
    box-shadow: 0 2px 6px rgba(60,40,10,.10), 0 30px 60px rgba(60,40,10,.22); }
  .word { font-size:132px; font-weight:700; line-height:.9; letter-spacing:-2px; color:#241f19; }
  .tag { margin-top:26px; font-size:38px; line-height:1.28; color:#54493a; max-width:600px; }
  .rule { margin:30px 0 24px; width:120px; height:6px; border-radius:3px;
          background:linear-gradient(90deg,#ef8f4d,#ffcf7d); }
  .meta { font-family:'DejaVu Sans', Arial, sans-serif; font-size:25px; letter-spacing:.3px; color:#6d5f49; font-weight:600; }
</style></head><body>
  <img class="icon" src="${iconURL}" />
  <div>
    <div class="word">Frame</div>
    <div class="tag">Where to go, in which month, to photograph which birds.</div>
    <div class="rule"></div>
    <div class="meta">Free · offline · no account · no install</div>
  </div>
</body></html>`;

const b = await chromium.launch();
const p = await b.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 }).then((c) => c.newPage());
await p.setContent(html, { waitUntil: 'networkidle' });
await p.waitForTimeout(200);
const out = path.join(FRAME, 'social-preview.png');
await p.screenshot({ path: out });
await b.close();
console.log(`Wrote ${out} (1200×630) — keep the og:image:width/height in index.html in sync.`);
