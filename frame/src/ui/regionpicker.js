// =============================================================================
// COUNTY PICKER (v14) — build/edit a region by tapping counties on a map.
// =============================================================================
// A pinch-zoomable SVG of California + the 5 Tahoe/Reno Nevada counties. Tap a
// county to toggle it into the selection; an alphabetical checklist below mirrors
// the map both ways. Name the set and Save → it becomes an on-device region the
// switcher pills point at. Every county already has bar-chart data built, so any
// selection works instantly (model/regions.js loads it on switch).
// =============================================================================
import { el, clear } from './dom.js';
import { COUNTY_SHAPES, MAP_VIEWBOX } from '../data/county-shapes.js';
import { COUNTIES } from '../data/counties.js';
import { saveRegion, deleteRegion, savedRegions, loadActiveRegion, setActiveRegion } from '../model/regions.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// All county codes, sorted alphabetically by display name (for the checklist).
const CODES_ALPHA = Object.keys(COUNTY_SHAPES)
  .sort((a, b) => (COUNTIES[a]?.name || a).localeCompare(COUNTIES[b]?.name || b));

// --- The interactive map ----------------------------------------------------
// Returns { node, refresh(code) }. Pan with one finger / drag, pinch or wheel to
// zoom; a tap that didn't pan toggles the county under it via onToggle(code).
function buildMap(selected, onToggle) {
  const { w: W, h: H } = MAP_VIEWBOX;
  const wrap = el('div.map-wrap');
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'county-map');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const pathByCode = {};
  for (const code of Object.keys(COUNTY_SHAPES)) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', COUNTY_SHAPES[code]);
    path.setAttribute('class', 'county' + (selected.has(code) ? ' sel' : ''));
    path.dataset.code = code;
    const title = document.createElementNS(SVG_NS, 'title');
    title.textContent = COUNTIES[code]?.name || code;
    path.append(title);
    svg.append(path);
    pathByCode[code] = path;
  }
  wrap.append(svg);

  // viewBox pan/zoom state.
  let vx = 0, vy = 0, vw = W, vh = H;
  const setVB = () => svg.setAttribute('viewBox', `${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`);
  function clampPan() {
    vx = Math.min(Math.max(vx, 0), W - vw);
    vy = Math.min(Math.max(vy, 0), H - vh);
  }
  function zoomAt(clientX, clientY, factor) {
    const rect = svg.getBoundingClientRect();
    const px = (clientX - rect.left) / rect.width;
    const py = (clientY - rect.top) / rect.height;
    const ax = vx + px * vw, ay = vy + py * vh; // svg point under the cursor
    vw = Math.min(Math.max(vw / factor, W / 8), W); // zoom range 1×–8×
    vh = vw * (H / W);
    vx = ax - px * vw;
    vy = ay - py * vh;
    clampPan();
    setVB();
  }
  function panBy(dxScreen, dyScreen) {
    const rect = svg.getBoundingClientRect();
    vx -= dxScreen * vw / rect.width;
    vy -= dyScreen * vh / rect.height;
    clampPan();
    setVB();
  }

  // Pan/zoom + tap on the SVG only (the zoom buttons sit in the wrap OUTSIDE the
  // svg, so capturing the pointer here never steals their clicks). A tap that
  // didn't pan toggles whichever county is under the finger — we resolve it in
  // pointerup via elementFromPoint rather than a per-path click, because pointer
  // capture would otherwise redirect the native click away from the path.
  const pts = new Map(); // pointerId → {x,y}
  let moved = false, downX = 0, downY = 0, lastDist = null;
  svg.addEventListener('pointerdown', (e) => {
    svg.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) { moved = false; downX = e.clientX; downY = e.clientY; }
    if (pts.size === 2) { const [a, b] = [...pts.values()]; lastDist = Math.hypot(a.x - b.x, a.y - b.y); }
  });
  svg.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId);
    const cur = { x: e.clientX, y: e.clientY };
    pts.set(e.pointerId, cur);
    if (Math.hypot(cur.x - downX, cur.y - downY) > 8) moved = true;
    const arr = [...pts.values()];
    if (arr.length === 1) {
      panBy(cur.x - prev.x, cur.y - prev.y);
    } else if (arr.length >= 2) {
      const [a, b] = arr;
      const nd = Math.hypot(a.x - b.x, a.y - b.y);
      if (lastDist) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, nd / lastDist);
      lastDist = nd;
    }
  });
  svg.addEventListener('pointerup', (e) => {
    const wasTap = pts.size === 1 && !moved;
    pts.delete(e.pointerId);
    if (pts.size < 2) lastDist = null;
    if (wasTap) {
      const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-code]');
      if (hit && pathByCode[hit.dataset.code]) onToggle(hit.dataset.code);
    }
  });
  svg.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); if (pts.size < 2) lastDist = null; });
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15);
  }, { passive: false });

  const zoomBtns = el('div.map-zoom', {}, [
    el('button.map-zbtn', { title: 'Zoom in', onclick: () => zoomAt(centerX(), centerY(), 1.4) }, '+'),
    el('button.map-zbtn', { title: 'Zoom out', onclick: () => zoomAt(centerX(), centerY(), 1 / 1.4) }, '−'),
    el('button.map-zbtn', { title: 'Reset', onclick: () => { vx = 0; vy = 0; vw = W; vh = H; setVB(); } }, '⤢'),
  ]);
  function centerX() { const r = svg.getBoundingClientRect(); return r.left + r.width / 2; }
  function centerY() { const r = svg.getBoundingClientRect(); return r.top + r.height / 2; }
  wrap.append(zoomBtns);

  return {
    node: wrap,
    refresh(code) { pathByCode[code].classList.toggle('sel', selected.has(code)); },
  };
}

// --- The picker view --------------------------------------------------------
export function renderRegionPicker(root, state, nav, editId) {
  clear(root);
  const editing = editId ? savedRegions().find((r) => r.id === editId) : null;
  const selected = new Set(editing ? editing.counties.filter((c) => COUNTY_SHAPES[c]) : []);
  const checkboxByCode = {};

  root.append(el('header.bar', {}, [
    el('button.back', { onclick: () => nav.go('#/settings') }, '‹ Regions'),
    el('div.title-row', {}, [
      el('h1', {}, editing ? 'Edit region' : 'New region'),
      el('span.subtitle', {}, 'Tap counties on the map or the list, then name and save.'),
    ]),
  ]));

  const nameInput = el('input.region-name', {
    type: 'text', placeholder: 'Region name (e.g. North Coast)', value: editing?.name || '',
    maxlength: 40,
  });

  const count = el('span.pick-count');
  const saveBtn = el('button.btn.primary', { onclick: onSave }, editing ? 'Save changes' : 'Save region');

  function updateCount() {
    const n = selected.size;
    count.textContent = n ? `${n} count${n === 1 ? 'y' : 'ies'} selected` : 'No counties selected';
    saveBtn.disabled = n === 0;
  }
  function setSel(code, on) {
    if (on) selected.add(code); else selected.delete(code);
    map.refresh(code);
    if (checkboxByCode[code]) checkboxByCode[code].checked = on;
    updateCount();
  }

  const map = buildMap(selected, (code) => setSel(code, !selected.has(code)));
  root.append(map.node);

  // Toolbar: count + clear.
  root.append(el('div.pick-toolbar', {}, [
    count,
    el('button.btn.ghost.small', { onclick: () => { for (const c of [...selected]) setSel(c, false); } }, 'Clear'),
  ]));

  // Alphabetical, mirrored checklist.
  const list = el('div.county-list');
  for (const code of CODES_ALPHA) {
    const cb = el('input', { type: 'checkbox' });
    cb.checked = selected.has(code);
    cb.addEventListener('change', () => setSel(code, cb.checked));
    checkboxByCode[code] = cb;
    list.append(el('label.county-item', {}, [cb, el('span', {}, COUNTIES[code]?.name || code)]));
  }
  root.append(list);

  // Save / delete.
  const actions = el('div.pick-actions', {}, [
    el('label.region-name-wrap', {}, ['Name', nameInput]),
    saveBtn,
    editing ? el('button.btn.danger', { onclick: onDelete }, 'Delete region') : null,
  ]);
  root.append(actions);

  updateCount();

  async function onSave() {
    if (!selected.size) return;
    const id = saveRegion({ id: editId, name: nameInput.value, counties: [...selected] });
    setActiveRegion(id);
    state.recent = null;            // box overlay is region-specific; recompute on next boot/switch
    await loadActiveRegion();
    nav.go('#/');
  }
  async function onDelete() {
    if (!editing) return;
    deleteRegion(editing.id);
    await loadActiveRegion();       // active may have fallen back to Home
    nav.go('#/settings');
  }
}
