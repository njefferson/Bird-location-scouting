// =============================================================================
// MAP RUNTIME LOG — persistent, survives reloads and lockups.
// =============================================================================
// Noah: "Are you keeping runtime logs?" — now yes. The diagnostics window shows
// the last few events live; THIS keeps the last ~300 in localStorage so a
// freeze can be diagnosed after the fact: Settings → Map diagnostics → Copy
// log, paste it into a report. Wall-clock timestamps (ms precision) so entries
// line up with screenshots. Every entry persists immediately: a freeze ends in
// a force-killed tab where no flush ever runs, and the entries just BEFORE the
// freeze are exactly the ones a diagnosis needs. The payload is ~12 KB and
// events arrive a few per second at most, so the synchronous write is cheap.
// =============================================================================

const KEY = 'frame.mapLog';
const MAX = 300;
let buf = null;

function load() {
  if (buf) return;
  try { buf = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { buf = []; }
  if (!Array.isArray(buf)) buf = [];
}

export function persistNow() {
  load();
  try { localStorage.setItem(KEY, JSON.stringify(buf)); } catch { /* full / private mode */ }
}

export function mapLog(msg) {
  load();
  buf.push(`${new Date().toISOString().slice(11, 23)} ${msg}`);
  if (buf.length > MAX) buf.splice(0, buf.length - MAX);
  persistNow();
}

export function getMapLog() { load(); return buf.join('\n'); }
export function clearMapLog() { buf = []; persistNow(); }

if (typeof window !== 'undefined') {
  addEventListener('pagehide', persistNow);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { mapLog('page hidden'); persistNow(); } });
  // Uncaught errors belong in the same timeline — they're prime lockup suspects.
  addEventListener('error', (e) => { mapLog(`ERROR ${e.message} @${(e.filename || '').split('/').pop()}:${e.lineno}`); persistNow(); });
  addEventListener('unhandledrejection', (e) => { mapLog(`REJECTION ${String(e.reason).slice(0, 140)}`); persistNow(); });
}
