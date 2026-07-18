// =============================================================================
// SPECIES THUMBNAILS — build a small photo for every curated species
// =============================================================================
//
// Renders, next to each species name in the app, a real photo instead of the
// guild silhouette. The photos come from WIKIMEDIA COMMONS, never eBird /
// Macaulay Library: Macaulay photos are each individually copyrighted by their
// photographer and Cornell's terms forbid bulk download and redistribution, so
// they cannot be bundled into this (proprietary, offline) app. Commons, by
// contrast, hosts only FREELY-licensed media (public domain / CC0 / CC BY /
// CC BY-SA), which we may reuse commercially with attribution — recorded per
// image in data/thumbs.json and surfaced in About.
//
// WHY A WORKFLOW, NOT THE SANDBOX: the session sandbox's egress policy blocks
// wikipedia.org / commons.wikimedia.org (403). GitHub Actions runners have open
// egress (same reason the eBird refresh runs there), so this script is meant to
// run under .github/workflows/build-thumbnails.yml.
//
// Per species:
//   1. resolve eBird common NAME -> speciesCode + scientific name (live eBird
//      taxonomy, needs EBIRD_API_TOKEN — same source as taxonomy.json).
//   2. ask en.wikipedia's pageimages API (pilicense=free) for the article's
//      lead image FILE — pilicense=free guarantees a non-fair-use pick.
//   3. read that File's license + author + a scaled URL from the Commons
//      imageinfo API; keep only Commons-"free" licenses (belt to the pilicense
//      braces).
//   4. download the scaled image, re-encode to a small square WebP with sharp,
//      write data/thumbs/<code>.webp.
//   5. record { artist, license, source page } in data/thumbs.json.
// Species with no free lead image are simply skipped — the UI falls back to the
// guild silhouette for them, so a miss is graceful, never a blank.
//
// USAGE (on a runner):
//   EBIRD_API_TOKEN=x node frame/scripts/build-thumbnails.mjs probe            # ~10 species, NO writes — verify the approach
//   EBIRD_API_TOKEN=x node frame/scripts/build-thumbnails.mjs build           # all species, writes thumbs + manifest
//   EBIRD_API_TOKEN=x node frame/scripts/build-thumbnails.mjs build --limit 30
//   EBIRD_API_TOKEN=x node frame/scripts/build-thumbnails.mjs build --only grbher3 baleag
//   ...add --force to re-fetch species that already have a thumb (default skips them).
// =============================================================================

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { SPECIES } from '../src/data/species.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const THUMB_DIR = path.join(ROOT, 'data', 'thumbs');
const MANIFEST = path.join(ROOT, 'data', 'thumbs.json');

const API = 'https://api.ebird.org';
const token = process.env.EBIRD_API_TOKEN;
// Wikimedia asks every API client to send a descriptive User-Agent with a
// contact, and rewards it with saner rate limits. maxlag defers to replica lag.
const UA = 'FrameBirdScout/1.0 (https://bird-location-scouting.pages.dev; noah.jefferson@gmail.com)';

const THUMB_PX = 128;  // stored square size (displayed 40-56px, so ~2-3x for retina)
const WEBP_Q = 76;
const SCALE_URL_PX = 400; // pull a 400px source from Commons, then downscale locally

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- args --------------------------------------------------------------------
const argv = process.argv.slice(2);
const mode = argv[0] === 'build' ? 'build' : 'probe';
const force = argv.includes('--force');
const limitArg = argv.indexOf('--limit');
const limit = limitArg >= 0 ? parseInt(argv[limitArg + 1], 10) : (mode === 'probe' ? 10 : Infinity);
const onlyArg = argv.indexOf('--only');
const only = onlyArg >= 0 ? argv.slice(onlyArg + 1).filter((a) => !a.startsWith('--')) : null;

// --- helpers -----------------------------------------------------------------
async function ebird(pathname) {
  const res = await fetch(`${API}${pathname}`, { headers: { 'x-ebirdapitoken': token } });
  if (!res.ok) throw new Error(`eBird API ${res.status} for ${pathname}`);
  return res.json();
}

async function wiki(host, params) {
  const url = new URL(`https://${host}/w/api.php`);
  url.search = new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params }).toString();
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } });
    if (res.status === 429 || res.status === 503) { await sleep(1500 * (attempt + 1)); continue; }
    if (!res.ok) throw new Error(`${host} ${res.status}`);
    const json = await res.json();
    if (json.error && json.error.code === 'maxlag') { await sleep(1500 * (attempt + 1)); continue; }
    return json;
  }
  throw new Error(`${host} kept throttling`);
}

// Strip the HTML Commons wraps Artist/Credit fields in down to plain text.
function plain(html) {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

// Commons only hosts free media, but be explicit: reject anything that smells
// non-commercial / no-derivatives / fair-use, and require a recognisable free tag.
function isFree(licenseShort) {
  const l = (licenseShort || '').toLowerCase();
  // Explicit allow (Noah's call, 2026-07-18): Commons "Copyrighted free use" —
  // the copyright holder permits use by anyone for any purpose. Checked before
  // the /copyright/ reject below (which would otherwise catch the word).
  if (/copyrighted free use/.test(l)) return true;
  if (/nc\b|non-?commercial|nd\b|no-?deriv|fair use|copyright|all rights/.test(l)) return false;
  return /cc0|cc[ -]?by|public domain|pdm|no restrictions|gfdl|attribution/.test(l);
}

// Find the article's free-licensed lead image File: title. Try the scientific
// name first (the species article for a bird is reliably under it), then the
// common name as a fallback.
async function leadImageFile(sciName, comName) {
  for (const title of [sciName, comName].filter(Boolean)) {
    const j = await wiki('en.wikipedia.org', {
      action: 'query', redirects: '1', titles: title,
      prop: 'pageimages', piprop: 'name', pilicense: 'free',
    });
    const page = j.query?.pages?.[0];
    if (page && !page.missing && page.pageimage) return page.pageimage;
  }
  return null;
}

// License + author + scaled URL for a File: on Commons.
async function fileInfo(fileName) {
  const j = await wiki('commons.wikimedia.org', {
    action: 'query', titles: `File:${fileName}`,
    prop: 'imageinfo', iiprop: 'extmetadata|url|size|mime',
    iiurlwidth: String(SCALE_URL_PX),
  });
  const page = j.query?.pages?.[0];
  const ii = page?.imageinfo?.[0];
  if (!ii) return null;
  const em = ii.extmetadata || {};
  const license = plain(em.LicenseShortName?.value) || plain(em.License?.value);
  return {
    license,
    artist: plain(em.Artist?.value) || plain(em.Credit?.value) || 'Unknown',
    thumburl: ii.thumburl || ii.url,
    mime: ii.mime,
    descriptionurl: ii.descriptionurl || `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName)}`,
  };
}

async function toWebp(url) {
  let res;
  for (let attempt = 0; attempt < 4; attempt++) {
    res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status === 429 || res.status === 503) { await sleep(1200 * (attempt + 1)); continue; }
    break;
  }
  if (!res.ok) throw new Error(`image ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // CONTAIN, not cover: fit the WHOLE bird inside the square on a transparent
  // ground (the card colour shows through in the UI). A square "cover" crop was
  // decapitating birds whose lead photo isn't a tidy portrait (e.g. a jay bent
  // over feeding) — a contained image never cuts the subject.
  return sharp(buf)
    .resize(THUMB_PX, THUMB_PX, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: WEBP_Q, alphaQuality: 90 })
    .toBuffer();
}

// --- main --------------------------------------------------------------------
async function main() {
  if (!token) { console.error('Set EBIRD_API_TOKEN.'); process.exit(1); }
  console.log(`Mode: ${mode}${force ? ' (force)' : ''}  limit: ${limit}${only ? `  only: ${only.join(',')}` : ''}`);

  const tax = await ebird('/v2/ref/taxonomy/ebird?fmt=json');
  const byName = new Map(tax.map((t) => [t.comName.toLowerCase(), t]));

  await mkdir(THUMB_DIR, { recursive: true });
  let manifest = {};
  if (existsSync(MANIFEST)) { try { manifest = JSON.parse(await readFile(MANIFEST, 'utf8')); } catch {} }

  let list = SPECIES.map((s) => byName.get(s.name.toLowerCase())).filter(Boolean);
  if (only) list = list.filter((t) => only.includes(t.speciesCode));
  list = list.slice(0, limit);

  const report = { ok: 0, skipExisting: 0, noImage: 0, notFree: 0, error: 0, totalBytes: 0, licenses: {} };
  const misses = [];

  for (const t of list) {
    const code = t.speciesCode;
    const dest = path.join(THUMB_DIR, `${code}.webp`);
    if (!force && mode === 'build' && existsSync(dest) && manifest[code]) { report.skipExisting++; continue; }

    try {
      const file = await leadImageFile(t.sciName, t.comName);
      if (!file) { report.noImage++; misses.push(`${t.comName} (${code}) — no free lead image`); await sleep(150); continue; }
      const info = await fileInfo(file);
      if (!info || !isFree(info.license)) {
        report.notFree++; misses.push(`${t.comName} (${code}) — license "${info?.license || '?'}" rejected`);
        await sleep(150); continue;
      }
      report.licenses[info.license] = (report.licenses[info.license] || 0) + 1;

      const webp = await toWebp(info.thumburl);
      report.totalBytes += webp.length;

      if (mode === 'build') {
        await writeFile(dest, webp);
        manifest[code] = { n: t.comName, a: info.artist, l: info.license, s: info.descriptionurl };
      }
      report.ok++;
      console.log(`  ✓ ${t.comName.padEnd(28)} ${code.padEnd(9)} ${(webp.length / 1024).toFixed(1)}KB  ${info.license}  — ${info.artist.slice(0, 40)}`);
    } catch (e) {
      report.error++; misses.push(`${t.comName} (${code}) — ${e.message}`);
      console.log(`  ✗ ${t.comName} — ${e.message}`);
    }
    await sleep(180); // be polite to Wikimedia
  }

  if (mode === 'build') {
    // Prune manifest entries whose file no longer exists (kept idempotent).
    for (const code of Object.keys(manifest)) {
      if (!existsSync(path.join(THUMB_DIR, `${code}.webp`))) delete manifest[code];
    }
    const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
    await writeFile(MANIFEST, JSON.stringify(sorted, null, 0) + '\n');
    console.log(`\nWrote ${Object.keys(sorted).length} thumbs → data/thumbs/, manifest → data/thumbs.json`);
  }

  console.log('\n=== REPORT ===');
  console.log(`considered: ${list.length}  ✓ built: ${report.ok}  skip(existing): ${report.skipExisting}  no-image: ${report.noImage}  not-free: ${report.notFree}  error: ${report.error}`);
  if (report.ok) console.log(`avg thumb: ${(report.totalBytes / report.ok / 1024).toFixed(1)}KB  total(new): ${(report.totalBytes / 1024).toFixed(0)}KB`);
  console.log('licenses:', JSON.stringify(report.licenses));
  if (misses.length) { console.log('\nMisses:'); misses.slice(0, 60).forEach((m) => console.log('  -', m)); }
}

main().catch((e) => { console.error(e); process.exit(1); });
