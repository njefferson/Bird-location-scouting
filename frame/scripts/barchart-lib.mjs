// =============================================================================
// barchart-lib.mjs — shared eBird bar-chart (histogram) parsing + fetch, used by
// build-counties.mjs (the per-county data pipeline).
// =============================================================================

/** Collapse 48 weekly bins (4 per month) into 12 monthly means. */
export function weeksToMonths(weeks48) {
  const months = [];
  for (let mo = 0; mo < 12; mo++) {
    const slice = weeks48.slice(mo * 4, mo * 4 + 4).filter((x) => !Number.isNaN(x));
    months.push(slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : 0);
  }
  return months;
}

export const isNumCell = (c) => /^-?\d+(\.\d+)?$/.test((c || '').trim());

// The barchart TSV has a "Sample Size" row of 48 weekly checklist counts and one
// row per taxon: [taxon order] <name> [empty cells] <48 weekly frequencies 0–1>.
// Tolerant: locate the trailing run of >=48 numeric cells; the name is the
// non-numeric cells before it (leading empties / taxon-order numbers ignored).
export function parseBarchart(text) {
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

/** Fetch one hotspot's bar-chart TSV. Works with either a logged-in session
 *  cookie (required — the endpoint is login-gated) via opts.cookie. */
export async function fetchBarchart(locId, { cookie, year = new Date().getFullYear() } = {}) {
  const url = `https://ebird.org/barchartData?r=${locId}&bmo=1&emo=12&byr=1900&eyr=${year}&fmt=tsv`;
  const headers = { 'User-Agent': 'frame-bird-planner/1.0 (personal, non-commercial)' };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (/^\s*</.test(text) || /<!doctype|<html/i.test(text.slice(0, 300))) {
    throw new Error('got an HTML page, not data — the eBird cookie is not a signed-in session');
  }
  return text;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
