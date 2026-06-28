#!/usr/bin/env node
// =============================================================================
// build-reference.mjs — assemble the STATIC reference layer (§2A)
// =============================================================================
// Writes frame/data/reference.json, which the app loads over the hand-authored
// scaffold to flip hotspots from "inferred" to "documented".
//
// TWO STAGES, because of the hard constraints in the spec (§0):
//
//   1) enumerate  — uses the eBird API (key required) to fetch REAL hotspots in
//                   the box: locId, exact name, lat/lng, numChecklists-ish.
//                   Matches them to the scaffold in src/data/hotspots.js by
//                   proximity, and records the real locId. This is all the API
//                   can give us — it does NOT serve frequency.
//
//   2) histogram  — parses eBird "Download Histogram Data" CSVs that YOU export
//                   manually from each hotspot's bar-chart page (login-gated;
//                   not available via the API). Collapses 48 weeks → 12 months
//                   and writes freqByMonth + checklistsByMonth. THIS is the real
//                   frequency layer.
//
// USAGE:
//   EBIRD_API_TOKEN=xxxx node scripts/build-reference.mjs enumerate
//   node scripts/build-reference.mjs histogram ./csv-dir
//   EBIRD_API_TOKEN=xxxx node scripts/build-reference.mjs all ./csv-dir
//
// The key is read ONLY from the environment. Never commit it (§0/§6).
// Refresh quarterly — frequency is a multi-year average, it does not move weekly.
// =============================================================================

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'reference.json');

const BOX = { swLat: 38.55, swLng: -121.32, neLat: 38.74, neLng: -120.53 };
const API = 'https://api.ebird.org';

// --- scaffold hotspots (parsed from the source so the two never drift) ------
async function loadScaffold() {
  const src = await readFile(path.join(ROOT, 'src', 'data', 'hotspots.js'), 'utf8');
  const hotspots = [];
  const re = /id:\s*'([^']+)',\s*name:\s*'([^']+)',[^]*?lat:\s*([\d.-]+),\s*lng:\s*([\d.-]+)/g;
  let m;
  while ((m = re.exec(src))) hotspots.push({ id: m[1], name: m[2], lat: +m[3], lng: +m[4] });
  return hotspots;
}

const haversine = (a, b) => {
  const R = 6371, toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

async function readOut() {
  if (existsSync(OUT)) { try { return JSON.parse(await readFile(OUT, 'utf8')); } catch {} }
  return { builtAt: null, hotspots: {} };
}
const today = () => new Date().toISOString().slice(0, 10);

// --- stage 1: enumerate real hotspots via the API ---------------------------
async function enumerate(out) {
  const token = process.env.EBIRD_API_TOKEN;
  if (!token) { console.error('Set EBIRD_API_TOKEN in the environment first.'); process.exit(1); }

  const center = { lat: (BOX.swLat + BOX.neLat) / 2, lng: (BOX.swLng + BOX.neLng) / 2 };
  const url = `${API}/v2/ref/hotspot/geo?lat=${center.lat.toFixed(3)}&lng=${center.lng.toFixed(3)}&dist=50&fmt=json`;
  const res = await fetch(url, { headers: { 'x-ebirdapitoken': token } });
  if (!res.ok) { console.error(`eBird API ${res.status}: ${await res.text()}`); process.exit(1); }
  const all = await res.json();

  const inBox = all.filter((h) => h.lat >= BOX.swLat && h.lat <= BOX.neLat && h.lng >= BOX.swLng && h.lng <= BOX.neLng);
  console.log(`eBird returned ${all.length} hotspots near center; ${inBox.length} inside the box.`);

  const scaffold = await loadScaffold();
  for (const s of scaffold) {
    // nearest eBird hotspot to each scaffold entry (within ~2 km)
    let best = null, bestD = Infinity;
    for (const h of all) {
      const d = haversine(s, h);
      if (d < bestD) { bestD = d; best = h; }
    }
    out.hotspots[s.id] ||= {};
    if (best && bestD <= 2) {
      out.hotspots[s.id].locId = best.locId;
      out.hotspots[s.id].ebirdName = best.locName;
      console.log(`  ${s.id} → ${best.locId} ${best.locName} (${bestD.toFixed(2)} km)`);
    } else {
      console.log(`  ${s.id} → no eBird hotspot within 2 km (nearest ${bestD.toFixed(1)} km) — leaving locId null`);
    }
  }
  // Dump the full in-box list so you can extend the scaffold if you like.
  await writeFile(path.join(ROOT, 'data', 'hotspots-in-box.json'), JSON.stringify(inBox, null, 2));
  console.log(`Wrote data/hotspots-in-box.json (${inBox.length} hotspots) for reference.`);
}

// --- stage 2: parse downloaded histogram CSVs -> monthly frequency ----------
// eBird histogram CSV: a "Frequency of observations in ..." block, one row per
// species, 48 columns (4 week-bins × 12 months) of 0–1 values, plus a
// "Sample Size" row of checklist counts per bin.
function weeksToMonths(weeks48) {
  const months = [];
  for (let mo = 0; mo < 12; mo++) {
    const slice = weeks48.slice(mo * 4, mo * 4 + 4).filter((x) => !Number.isNaN(x));
    months.push(slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : 0);
  }
  return months;
}

function parseHistogramCsv(text) {
  const lines = text.split(/\r?\n/);
  const freqByMonth = {};
  let sampleSize = null;
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells = line.split('\t').length > 1 ? line.split('\t') : line.split(',');
    const label = (cells[0] || '').trim();
    const nums = cells.slice(1).map((c) => parseFloat(c)).filter((_, i) => i < 48);
    if (/sample size/i.test(label)) {
      sampleSize = weeksToMonths(cells.slice(1).map((c) => parseFloat(c))).map((x) => Math.round(x));
      continue;
    }
    if (nums.length >= 48 && label && !/^month|^\s*$/i.test(label)) {
      // We need the eBird species CODE, not the common name. The histogram CSV
      // uses common names, so map via the taxonomy file if present.
      freqByMonth[label] = weeksToMonths(nums);
    }
  }
  return { freqByMonth, sampleSize };
}

async function histogram(out, dir) {
  if (!dir) { console.error('Pass the directory of histogram CSVs: histogram ./csv-dir'); process.exit(1); }
  // Optional: common-name → speciesCode map (build once from /v2/ref/taxonomy/ebird).
  let nameToCode = {};
  const taxPath = path.join(ROOT, 'data', 'taxonomy.json');
  if (existsSync(taxPath)) {
    const tax = JSON.parse(await readFile(taxPath, 'utf8'));
    nameToCode = Object.fromEntries(tax.map((t) => [t.comName, t.speciesCode]));
  } else {
    console.warn('No data/taxonomy.json — species will be keyed by common name. '
      + 'Build it with: EBIRD_API_TOKEN=xxx node scripts/build-reference.mjs taxonomy');
  }

  const files = (await readdir(dir)).filter((f) => f.toLowerCase().endsWith('.csv'));
  console.log(`Parsing ${files.length} histogram CSV(s) in ${dir}…`);
  for (const f of files) {
    // Convention: name the CSV after the scaffold hotspot id, e.g. wb-pond.csv
    const id = path.basename(f, '.csv');
    const { freqByMonth, sampleSize } = parseHistogramCsv(await readFile(path.join(dir, f), 'utf8'));
    const coded = {};
    for (const [name, months] of Object.entries(freqByMonth)) {
      const code = nameToCode[name] || name;
      coded[code] = months.map((x) => Math.round(x * 1000) / 1000);
    }
    out.hotspots[id] ||= {};
    out.hotspots[id].freqByMonth = coded;
    if (sampleSize) out.hotspots[id].checklistsByMonth = sampleSize;
    console.log(`  ${id}: ${Object.keys(coded).length} species${sampleSize ? `, N=${sampleSize.join('/')}` : ''}`);
  }
}

// --- optional: build the taxonomy name→code map -----------------------------
async function taxonomy() {
  const token = process.env.EBIRD_API_TOKEN;
  if (!token) { console.error('Set EBIRD_API_TOKEN.'); process.exit(1); }
  const res = await fetch(`${API}/v2/ref/taxonomy/ebird?fmt=json`, { headers: { 'x-ebirdapitoken': token } });
  if (!res.ok) { console.error(`taxonomy ${res.status}`); process.exit(1); }
  const tax = (await res.json()).map((t) => ({ speciesCode: t.speciesCode, comName: t.comName }));
  await writeFile(path.join(ROOT, 'data', 'taxonomy.json'), JSON.stringify(tax));
  console.log(`Wrote data/taxonomy.json (${tax.length} taxa).`);
}

// --- parse locally-downloaded bar-chart TSVs (the no-login-in-CI path) -------
// Pairs with download-barcharts.mjs. Maps eBird common names straight to our 55
// curated species codes (no taxonomy.json / API needed) and writes the real
// frequency + checklist counts into reference.json.
async function localBarcharts(out, dir) {
  if (!dir) { console.error('Pass the dir of downloaded .tsv files: localbarcharts ./barcharts'); process.exit(1); }
  const { SPECIES } = await import('../src/data/species.js');
  const nameToCode = Object.fromEntries(SPECIES.map((s) => [s.name, s.code]));
  const files = (await readdir(dir)).filter((f) => f.toLowerCase().endsWith('.tsv'));
  console.log(`Parsing ${files.length} bar-chart TSV(s) in ${dir}…`);
  let withData = 0;
  for (const f of files) {
    const id = path.basename(f, '.tsv');
    const text = await readFile(path.join(dir, f), 'utf8');
    if (/^\s*</.test(text) || /<!doctype/i.test(text.slice(0, 300))) {
      console.warn(`  ${id}: looks like an HTML page, not data — re-download while logged into eBird`); continue;
    }
    const { freqByName, sampleSize } = parseBarchart(text);
    const coded = {};
    for (const [name, months] of Object.entries(freqByName)) {
      const code = nameToCode[name];
      if (code) coded[code] = months.map((x) => Math.round(x * 1000) / 1000);
    }
    out.hotspots[id] ||= {};
    if (Object.keys(coded).length) { out.hotspots[id].freqByMonth = coded; withData++; }
    if (sampleSize) out.hotspots[id].checklistsByMonth = sampleSize;
    console.log(`  ${id}: ${Object.keys(freqByName).length} taxa, ${Object.keys(coded).length} of our species${sampleSize ? `, peak N=${Math.max(...sampleSize)}/mo` : ''}`);
  }
  console.log(`Real frequency loaded for ${withData} hotspot(s).`);
}

// --- list every hotspot in the box, ranked by coverage ----------------------
// Read-only. Prints all in-box hotspots sorted by all-time species (the only
// coverage proxy the /ref/hotspot/geo endpoint gives) so we can pick a cutoff.
async function listBox() {
  const token = process.env.EBIRD_API_TOKEN;
  if (!token) { console.error('Set EBIRD_API_TOKEN.'); process.exit(1); }
  const center = { lat: (BOX.swLat + BOX.neLat) / 2, lng: (BOX.swLng + BOX.neLng) / 2 };
  const url = `${API}/v2/ref/hotspot/geo?lat=${center.lat.toFixed(3)}&lng=${center.lng.toFixed(3)}&dist=50&fmt=json`;
  const res = await fetch(url, { headers: { 'x-ebirdapitoken': token } });
  if (!res.ok) { console.error(`eBird API ${res.status}`); process.exit(1); }
  const inBox = (await res.json())
    .filter((h) => h.lat >= BOX.swLat && h.lat <= BOX.neLat && h.lng >= BOX.swLng && h.lng <= BOX.neLng)
    .sort((a, b) => (b.numSpeciesAllTime || 0) - (a.numSpeciesAllTime || 0));
  console.log(`${inBox.length} hotspots in the box, ranked by all-time species:`);
  inBox.forEach((h, i) => console.log(`${String(i + 1).padStart(3)}\t${h.locId}\t${(h.numSpeciesAllTime || 0)}\t${(h.lat).toFixed(3)},${(h.lng).toFixed(3)}\t${h.locName}`));
}

// --- bar-chart endpoint -> monthly frequency (NO manual download) -----------
// eBird's public bar-chart page loads its data from /barchartData. That URL is
// reachable from any server with open internet (a CI runner, a Worker) — only a
// locked-down sandbox can't hit it. So this gives REAL frequency with zero
// manual CSV export: run it in the deploy workflow and the app flips from
// "inferred" to "documented" automatically. Light touch — 12 hotspots, one
// aggregate request each (this is not bulk checklist pulling).
async function loadNameToCode() {
  const taxPath = path.join(ROOT, 'data', 'taxonomy.json');
  if (!existsSync(taxPath)) { console.warn('No data/taxonomy.json — run `taxonomy` first; names may not map to codes.'); return {}; }
  const tax = JSON.parse(await readFile(taxPath, 'utf8'));
  return Object.fromEntries(tax.map((t) => [t.comName, t.speciesCode]));
}

async function fetchBarchart(locId, year) {
  const url = `https://ebird.org/barchartData?r=${locId}&bmo=1&emo=12&byr=1900&eyr=${year}&fmt=tsv`;
  const res = await fetch(url, { headers: { 'User-Agent': 'frame-bird-planner/1.0 (personal, non-commercial)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return { text: await res.text(), status: res.status, type: res.headers.get('content-type') };
}

const isNumCell = (c) => /^-?\d+(\.\d+)?$/.test((c || '').trim());

// The barchart TSV has a "Sample Size" row of 48 weekly checklist counts and one
// row per taxon: [taxon order] <name> [empty cells] <48 weekly frequencies 0–1>.
// Tolerant: locate the trailing run of >=48 numeric cells; the name is the
// non-numeric cells before it (leading empties / taxon-order numbers ignored).
function parseBarchart(text) {
  const lines = text.split(/\r?\n/);
  const freqByName = {};
  let sampleSize = null;
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells = line.split('\t');
    if (/sample size/i.test(cells[0] || '')) {
      const weekly = cells.filter(isNumCell).map(Number);
      if (weekly.length >= 48) sampleSize = weeksToMonths(weekly.slice(-48)).map((x) => Math.round(x));
      continue;
    }
    // trailing numeric block
    const isNum = cells.map(isNumCell);
    let end = cells.length; while (end > 0 && !isNum[end - 1]) end--;
    let start = end; while (start > 0 && isNum[start - 1]) start--;
    if (end - start < 48) continue;
    const weekly = cells.slice(start, end).map(Number).slice(-48);
    const name = cells.slice(0, start).map((c) => c.trim())
      .filter((c) => c && !isNumCell(c)).join(' ')
      .replace(/\s*\([^)]*\)\s*$/, '').trim();
    if (name) freqByName[name] = weeksToMonths(weekly);
  }
  return { freqByName, sampleSize };
}

async function barchart(out) {
  const nameToCode = await loadNameToCode();
  const year = new Date().getFullYear();
  const entries = Object.entries(out.hotspots).filter(([, h]) => h.locId);
  if (!entries.length) { console.error('No hotspot locIds yet — run `enumerate` first.'); return; }
  console.log(`Fetching bar-chart frequency for ${entries.length} hotspot(s)…`);
  let withData = 0;
  let debugged = false;
  for (const [id, h] of entries) {
    try {
      const { text, status, type } = await fetchBarchart(h.locId, year);
      const { freqByName, sampleSize } = parseBarchart(text);
      if (!Object.keys(freqByName).length && !debugged) {
        debugged = true;
        console.log(`  [debug] ${id} status=${status} type=${type} len=${text.length}`);
        console.log('  [debug] head: ' + JSON.stringify(text.slice(0, 700)));
      }
      const coded = {};
      for (const [name, months] of Object.entries(freqByName)) {
        const code = nameToCode[name];
        if (code) coded[code] = months.map((x) => Math.round(x * 1000) / 1000);
      }
      if (Object.keys(coded).length) { h.freqByMonth = coded; withData++; }
      if (sampleSize) h.checklistsByMonth = sampleSize;
      console.log(`  ${id} (${h.locId}): ${Object.keys(freqByName).length} taxa, ${Object.keys(coded).length} mapped${sampleSize ? `, peak N=${Math.max(...sampleSize)}/mo` : ''}`);
    } catch (e) {
      console.warn(`  ${id} (${h.locId}): ${e.message} — leaving on the inference model`);
    }
  }
  console.log(`Got real frequency for ${withData}/${entries.length} hotspots.`);
}

// --- main -------------------------------------------------------------------
const [cmd, arg] = process.argv.slice(2);
const out = await readOut();
if (cmd === 'enumerate') await enumerate(out);
else if (cmd === 'histogram') await histogram(out, arg);
else if (cmd === 'taxonomy') { await taxonomy(); process.exit(0); }
else if (cmd === 'barchart') await barchart(out);
else if (cmd === 'listbox') { await listBox(); process.exit(0); }
else if (cmd === 'localbarcharts') await localBarcharts(out, arg);
else if (cmd === 'all') { await enumerate(out); await taxonomy(); await barchart(out); }
else {
  console.log('Usage: build-reference.mjs <enumerate|taxonomy|barchart|histogram <dir>|all>');
  console.log('  all = enumerate + taxonomy + barchart (real frequency, no manual CSV).');
  process.exit(1);
}
out.builtAt = today();
await writeFile(OUT, JSON.stringify(out, null, 2));
console.log(`\nWrote ${path.relative(ROOT, OUT)} (builtAt ${out.builtAt}).`);
