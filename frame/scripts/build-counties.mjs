#!/usr/bin/env node
// =============================================================================
// build-counties.mjs — the STATEWIDE data pipeline (v12).
// =============================================================================
// Builds one JSON file per county under data/counties/<regionCode>.json, each
// holding that county's top-coverage eBird hotspots with real per-month
// frequency + checklist counts. The app loads only the counties in the active
// region, so statewide coverage never bloats a single download.
//
// COMMANDS
//   taxonomy                 Resolve every curated species NAME (species.js) to
//                            its eBird code and write data/taxonomy.json. Needs
//                            EBIRD_API_TOKEN. This is why codes are never typed
//                            by hand — they come from eBird itself.
//   validate                 Same resolution, but just report: exits non-zero
//                            with the list of any names eBird doesn't recognise.
//                            The CI gate before any build.
//   build [codes...]         Build county files (needs EBIRD_API_TOKEN for the
//                            hotspot lists and EBIRD_COOKIE for the login-gated
//                            bar charts). Runs `taxonomy` first. With no codes,
//                            builds EVERY county in src/data/counties.js
//                            (~1,050 requests, ~20 min at the polite 1/sec) so
//                            any county added to a region later already has
//                            data. Incremental: an existing file is skipped
//                            unless --force — so a partial/failed run resumes
//                            cheaply by re-running WITHOUT --force.
//
// USAGE (normally run by .github/workflows/refresh-data.yml)
//   EBIRD_API_TOKEN=x node scripts/build-counties.mjs validate
//   EBIRD_API_TOKEN=x EBIRD_COOKIE=y node scripts/build-counties.mjs build
//   EBIRD_API_TOKEN=x EBIRD_COOKIE=y node scripts/build-counties.mjs build --force US-CA-067 US-CA-023
//
// POLITENESS: one aggregate request per hotspot, ~1/sec, quarterly. This is a
// personal planner, not a scraper — keep the delay.
// =============================================================================

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBarchart, fetchBarchart, sleep } from './barchart-lib.mjs';
import { COUNTIES, countyDepth, COUNTY_CODES } from '../src/data/counties.js';
import { SPECIES } from '../src/data/species.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'data', 'counties');
const TAX_PATH = path.join(ROOT, 'data', 'taxonomy.json');
const API = 'https://api.ebird.org';
const DELAY_MS = 1000;

const token = process.env.EBIRD_API_TOKEN;
// The cookie secret is sometimes pasted one name=value pair per line (that is
// how some DevTools views present it), and a newline is an invalid HTTP header
// value — fetch() throws on every request. Stitch any multi-line paste back
// into the single "a=1; b=2" header eBird expects (proven live 2026-07-15:
// 16-line paste → joined → verdict DATA). A single-line cookie passes through
// unchanged.
const cookie = (process.env.EBIRD_COOKIE || '')
  .split(/\r?\n/)
  .map((l) => l.replace(/^cookie:\s*/i, '').trim().replace(/;+$/, ''))
  .filter(Boolean)
  .join('; ') || undefined;
const today = () => new Date().toISOString().slice(0, 10);

async function api(pathname) {
  const res = await fetch(`${API}${pathname}`, { headers: { 'x-ebirdapitoken': token } });
  if (!res.ok) throw new Error(`eBird API ${res.status} for ${pathname}`);
  return res.json();
}

// --- taxonomy: resolve curated NAMES → eBird codes, write data/taxonomy.json -
// This is the mechanism that makes hand-typed codes impossible: species.js
// carries names only, and each code comes straight from the live eBird taxonomy
// here. Returns true if every curated name resolved.
async function taxonomy() {
  if (!token) { console.error('Set EBIRD_API_TOKEN.'); process.exit(1); }
  const tax = await api('/v2/ref/taxonomy/ebird?fmt=json');
  const byName = new Map(tax.map((t) => [t.comName.toLowerCase(), t.speciesCode]));
  const map = {};
  const missing = [];
  for (const s of SPECIES) {
    const code = byName.get(s.name.toLowerCase());
    if (code) map[s.name] = code;
    else missing.push(s.name);
  }
  await writeFile(TAX_PATH, JSON.stringify(map, null, 1) + '\n');
  console.log(`Resolved ${Object.keys(map).length}/${SPECIES.length} species names → codes → data/taxonomy.json`);
  if (missing.length) {
    console.error(`\n${missing.length} species name(s) NOT in the eBird taxonomy — fix the NAME in species.js (they won't match bar-chart data until then):`);
    for (const n of missing) {
      // Suggest likely intended names (taxonomy renames/splits) by word overlap,
      // so the fix is in the log instead of needing research.
      const words = n.toLowerCase().split(/[\s-]+/).filter((w) => w.length > 3);
      const cands = tax
        .filter((t) => { const c = t.comName.toLowerCase(); return words.some((w) => c.includes(w)); })
        .filter((t) => t.category === 'species')
        .slice(0, 4).map((t) => t.comName);
      console.error(`  - "${n}"${cands.length ? `  → did you mean: ${cands.join(' | ')}` : ''}`);
    }
    return false;
  }
  return true;
}

// --- validate: every curated NAME exists in the eBird taxonomy --------------
async function validate() {
  const ok = await taxonomy();
  console.log(ok ? `\nAll ${SPECIES.length} species names resolve to eBird codes.` : '\nSome names failed to resolve (see above).');
  process.exit(ok ? 0 : 1);
}

// --- build: per-county hotspot enumeration + bar-chart download -------------
async function build(args) {
  if (!token) { console.error('Set EBIRD_API_TOKEN (hotspot lists).'); process.exit(1); }
  if (!cookie) { console.error('Set EBIRD_COOKIE (bar charts are login-gated).'); process.exit(1); }
  const force = args.includes('--force');
  const wanted = args.filter((a) => a !== '--force');
  // Default: EVERY county — full-depth (featured) counties FIRST, so if the
  // cookie dies partway through a multi-hour statewide run, the counties that
  // carry every hotspot are already written and committed by the workflow's
  // progress-saving step. Stable sort keeps alphabetical order within groups.
  const featuredFirst = [...COUNTY_CODES].sort((a, b) =>
    (isFinite(countyDepth(a)) ? 1 : 0) - (isFinite(countyDepth(b)) ? 1 : 0));
  const codes = wanted.length ? wanted : featuredFirst;
  for (const c of codes) if (!COUNTIES[c]) { console.error(`Unknown county code ${c}`); process.exit(1); }

  // Refresh the name→code map first so codes always match the live taxonomy.
  const ok = await taxonomy();
  if (!ok) { console.error('Aborting build: fix the unresolved species names above, then rebuild.'); process.exit(1); }
  const map = JSON.parse(await readFile(TAX_PATH, 'utf8'));
  const nameToCode = Object.fromEntries(Object.entries(map).map(([n, c]) => [n.toLowerCase(), c]));
  // FULL-taxonomy fallback: store EVERY real species a hotspot reports, not
  // just the curated list. The bar-chart download is login-gated behind a
  // cookie that dies in days — the data is the perishable asset, the curated
  // list is just today's lens. Without this, a county downloaded before its
  // region's species were curated (Yellowstone, 2026-07-18) would silently
  // miss its specialties and need a whole new cookie window to fix. Extra
  // codes in freqByMonth are inert to the app (views iterate the curated
  // SPECIES); category==='species' keeps spuhs/slashes/hybrids out.
  const fullTax = await api('/v2/ref/taxonomy/ebird?fmt=json');
  const fullByName = new Map(fullTax.filter((t) => t.category === 'species')
    .map((t) => [t.comName.toLowerCase(), t.speciesCode]));
  await mkdir(OUT_DIR, { recursive: true });

  let built = 0, skipped = 0, failedCharts = 0;
  for (const code of codes) {
    const outPath = path.join(OUT_DIR, `${code}.json`);
    if (!force && existsSync(outPath)) { skipped++; continue; }
    const depth = countyDepth(code);

    let all;
    try {
      all = await api(`/v2/ref/hotspot/${code}?fmt=json`);
    } catch (e) {
      console.error(`  ${code} ${COUNTIES[code].name}: hotspot list failed (${e.message}) — skipping county`);
      continue;
    }
    const top = all
      .filter((h) => h.locId && typeof h.lat === 'number')
      .sort((a, b) => (b.numSpeciesAllTime || 0) - (a.numSpeciesAllTime || 0))
      .slice(0, depth);
    console.log(`${code} ${COUNTIES[code].name}: ${all.length} hotspots, keeping top ${top.length}`);

    const hotspots = [];
    for (const h of top) {
      try {
        const text = await fetchBarchart(h.locId, { cookie });
        const { freqByName, sampleSize } = parseBarchart(text);
        const freqByMonth = {};
        let curated = 0;
        for (const [name, months] of Object.entries(freqByName)) {
          const key = name.toLowerCase();
          const sc = nameToCode[key] || fullByName.get(key);
          if (nameToCode[key]) curated++;
          if (sc) freqByMonth[sc] = months.map((x) => Math.round(x * 1000) / 1000);
        }
        hotspots.push({
          locId: h.locId,
          name: h.locName,
          lat: Math.round(h.lat * 1e4) / 1e4,
          lng: Math.round(h.lng * 1e4) / 1e4,
          nSpecies: h.numSpeciesAllTime || 0,
          freqByMonth,
          checklistsByMonth: sampleSize || null,
        });
        console.log(`  ${h.locId} ${h.locName}: ${Object.keys(freqByMonth).length} species stored (${curated} curated)`);
      } catch (e) {
        failedCharts++;
        console.warn(`  ${h.locId} ${h.locName}: ${e.message} — hotspot dropped`);
        if (/HTML page/.test(e.message)) {
          console.error('Cookie is dead — aborting the whole build rather than writing empty counties.');
          process.exit(1);
        }
      }
      await sleep(DELAY_MS);
    }

    await writeFile(outPath, JSON.stringify({
      region: code,
      name: COUNTIES[code].name,
      builtAt: today(),
      hotspots,
    }, null, 1));
    built++;
  }
  console.log(`\nBuilt ${built} county file(s), skipped ${skipped} existing (use --force to rebuild), ${failedCharts} chart failure(s).`);
}

// --- probe: is the bar-chart endpoint actually login-gated? ------------------
// Diagnostic only. Fetches ONE well-known hotspot's bar chart several ways and
// dumps status / final URL / content-type / length / body-head for each, so we
// can tell from the log whether the data is public (fix = headers, no cookie
// ever needed) or truly auth-gated (fix = a real session cookie). Never writes.
async function probe() {
  const locId = 'L370941'; // Folsom Lake SRA — Beals Point (huge, public hotspot)
  const year = new Date().getFullYear();
  const url = `https://ebird.org/barchartData?r=${locId}&bmo=1&emo=12&byr=1900&eyr=${year}&fmt=tsv`;
  const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
  const attempts = [
    { label: 'no cookie, simple UA', headers: { 'User-Agent': 'frame-bird-planner/1.0' } },
    { label: 'no cookie, browser UA + Accept', headers: { 'User-Agent': BROWSER_UA, Accept: 'text/tab-separated-values,text/plain,*/*', Referer: `https://ebird.org/barchart?r=${locId}` } },
    { label: 'with cookie, browser UA', headers: { 'User-Agent': BROWSER_UA, Accept: 'text/tab-separated-values,text/plain,*/*', Referer: `https://ebird.org/barchart?r=${locId}`, ...(cookie ? { Cookie: cookie } : {}) } },
  ];
  console.log(`Probing ${url}\ncookie present in env: ${cookie ? `yes (${cookie.length} chars)` : 'NO'}\n`);
  for (const a of attempts) {
    try {
      const res = await fetch(url, { headers: a.headers, redirect: 'follow' });
      const text = await res.text();
      const looksHtml = /^\s*</.test(text) || /<!doctype|<html/i.test(text.slice(0, 300));
      const looksTsv = /sample size/i.test(text) || /\t/.test(text.slice(0, 2000));
      console.log(`── ${a.label}`);
      console.log(`   status=${res.status} finalURL=${res.url} type=${res.headers.get('content-type')} len=${text.length}`);
      console.log(`   verdict=${looksTsv && !looksHtml ? 'DATA ✓' : looksHtml ? 'HTML (login/consent page)' : 'unknown'}`);
      console.log(`   head=${JSON.stringify(text.slice(0, 180))}\n`);
    } catch (e) {
      console.log(`── ${a.label}\n   ERROR ${e.message}\n`);
    }
    await sleep(1500);
  }
}

// --- codes: dump code → common name for species PRESENT in the given counties'
// data but NOT yet in the curated list (data/taxonomy.json). A dev aid for the
// species-curation pass (v39, Yellowstone): the county files store every real
// species by eBird CODE, but codes must never be hand-typed into species.js —
// so this resolves them to NAMES against the live taxonomy (needs only
// EBIRD_API_TOKEN), sorted by peak frequency in the region, so the highest-
// value uncounted birds are authored first. Read-only; writes nothing.
async function dumpCodes(args) {
  if (!token) { console.error('Set EBIRD_API_TOKEN.'); process.exit(1); }
  const codes = args.filter((a) => /^US-/.test(a));
  if (!codes.length) { console.error('Usage: codes US-WY-029 US-WY-039 …'); process.exit(1); }
  const curated = new Set(Object.values(JSON.parse(await readFile(TAX_PATH, 'utf8'))));
  const tax = await api('/v2/ref/taxonomy/ebird?fmt=json');
  const nameByCode = new Map(tax.map((t) => [t.speciesCode, { name: t.comName, cat: t.category }]));
  const peak = new Map();
  for (const code of codes) {
    const d = JSON.parse(await readFile(path.join(OUT_DIR, `${code}.json`), 'utf8'));
    for (const h of d.hotspots) for (const [sc, months] of Object.entries(h.freqByMonth || {})) {
      const p = months.length ? Math.max(...months) : 0;
      if (p > (peak.get(sc) || 0)) peak.set(sc, p);
    }
  }
  const rows = [...peak.entries()]
    .filter(([sc]) => !curated.has(sc))
    .map(([sc, p]) => ({ sc, p, ...(nameByCode.get(sc) || { name: '?', cat: '?' }) }))
    .filter((r) => r.cat === 'species')  // drop spuhs/slashes/hybrids
    .sort((a, b) => b.p - a.p);
  console.log(`# ${rows.length} species present in ${codes.join(',')} but NOT curated (by peak freq):`);
  for (const r of rows) console.log(`${r.p.toFixed(2)}\t${r.sc}\t${r.name}`);
}

// --- main --------------------------------------------------------------------
const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'taxonomy') { const ok = await taxonomy(); process.exit(ok ? 0 : 1); }
else if (cmd === 'validate') await validate();
else if (cmd === 'build') await build(rest);
else if (cmd === 'probe') await probe();
else if (cmd === 'codes') await dumpCodes(rest);
else {
  console.log('Usage: build-counties.mjs <taxonomy | validate | build [--force] [regionCodes...] | probe | codes [regionCodes...]>');
  console.log('  taxonomy  resolve species names → codes (writes data/taxonomy.json)');
  console.log('  validate  check every species name exists in the eBird taxonomy');
  console.log('  build     [default: all counties] enumerate hotspots + download bar charts');
  console.log('  probe     diagnostic: is the bar-chart endpoint public or login-gated?');
  console.log('  codes     dump uncounted species (code→name) for the given counties');
  process.exit(1);
}
