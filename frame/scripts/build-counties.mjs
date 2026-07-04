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
//                            builds the counties belonging to a saved region
//                            (src/data/counties.js REGIONS) — data follows where
//                            you go. Incremental: an existing file is skipped
//                            unless --force.
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
import { COUNTIES, countyDepth, REGION_COUNTY_CODES } from '../src/data/counties.js';
import { SPECIES } from '../src/data/species.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'data', 'counties');
const TAX_PATH = path.join(ROOT, 'data', 'taxonomy.json');
const API = 'https://api.ebird.org';
const DELAY_MS = 1000;

const token = process.env.EBIRD_API_TOKEN;
const cookie = process.env.EBIRD_COOKIE;
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
    for (const n of missing) console.error(`  - "${n}"`);
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
  const codes = wanted.length ? wanted : REGION_COUNTY_CODES;
  for (const c of codes) if (!COUNTIES[c]) { console.error(`Unknown county code ${c}`); process.exit(1); }

  // Refresh the name→code map first so codes always match the live taxonomy.
  const ok = await taxonomy();
  if (!ok) { console.error('Aborting build: fix the unresolved species names above, then rebuild.'); process.exit(1); }
  const map = JSON.parse(await readFile(TAX_PATH, 'utf8'));
  const nameToCode = Object.fromEntries(Object.entries(map).map(([n, c]) => [n.toLowerCase(), c]));
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
        for (const [name, months] of Object.entries(freqByName)) {
          const sc = nameToCode[name.toLowerCase()];
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
        console.log(`  ${h.locId} ${h.locName}: ${Object.keys(freqByMonth).length} of our species`);
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

// --- main --------------------------------------------------------------------
const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'taxonomy') { const ok = await taxonomy(); process.exit(ok ? 0 : 1); }
else if (cmd === 'validate') await validate();
else if (cmd === 'build') await build(rest);
else {
  console.log('Usage: build-counties.mjs <taxonomy | validate | build [--force] [regionCodes...]>');
  console.log('  taxonomy  resolve species names → codes (writes data/taxonomy.json)');
  console.log('  validate  check every species name exists in the eBird taxonomy');
  console.log('  build     [default: region counties] enumerate hotspots + download bar charts');
  process.exit(1);
}
