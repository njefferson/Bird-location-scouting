#!/usr/bin/env node
// =============================================================================
// download-barcharts.mjs — pull the eBird bar-chart (histogram) TSV for every
// hotspot, using YOUR logged-in eBird session cookie. Run on any computer where
// you're signed into ebird.org. The cookie stays on your machine; nothing is
// uploaded anywhere.
//
// USAGE
//   1. Sign into ebird.org in a browser on the computer.
//   2. Get your cookie (one-time):
//        Chrome/Edge: F12 → Application → Storage → Cookies → https://ebird.org
//        → select all rows → or simplest: open any ebird page, F12 → Console,
//          paste:  document.cookie   → copy the whole printed string.
//   3. Run (paste the cookie between the quotes):
//        EBIRD_COOKIE="paste_the_whole_cookie_here" \
//          node frame/scripts/download-barcharts.mjs ./barcharts
//   4. Then build the data layer:
//        node frame/scripts/build-reference.mjs localbarcharts ./barcharts
// =============================================================================
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { HOTSPOTS } from '../src/data/hotspots.js';

const dir = process.argv[2] || './barcharts';
const cookie = process.env.EBIRD_COOKIE;
if (!cookie) {
  console.error('Set EBIRD_COOKIE to your logged-in eBird cookie (see the header of this file).');
  process.exit(1);
}
const year = new Date().getFullYear();
await mkdir(dir, { recursive: true });
console.log(`Downloading ${HOTSPOTS.length} bar-charts → ${dir}`);

let ok = 0;
for (const h of HOTSPOTS) {
  const url = `https://ebird.org/barchartData?r=${h.locId}&bmo=1&emo=12&byr=1900&eyr=${year}&fmt=tsv`;
  try {
    const res = await fetch(url, { headers: { Cookie: cookie, 'User-Agent': 'Mozilla/5.0 (personal data export)' } });
    const text = await res.text();
    if (/<!doctype|<html/i.test(text.slice(0, 300))) {
      console.error(`  ${h.id}: got an HTML page, not data — your cookie isn't a logged-in eBird session. Re-copy it and retry.`);
      break;
    }
    await writeFile(path.join(dir, `${h.id}.tsv`), text);
    ok++;
    console.log(`  ${h.id} (${h.locId}): ${text.length} bytes`);
    await new Promise((r) => setTimeout(r, 600)); // be polite to eBird
  } catch (e) {
    console.warn(`  ${h.id}: ${e.message}`);
  }
}
console.log(`\nDone — ${ok}/${HOTSPOTS.length} downloaded.`);
console.log(`Next: node frame/scripts/build-reference.mjs localbarcharts ${dir}`);
