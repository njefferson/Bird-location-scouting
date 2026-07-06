// =============================================================================
// COUNTY PICKER (v14) — build/edit a region by tapping counties on a map.
// =============================================================================
// A pinch-zoomable SVG of California + the 5 Tahoe/Reno Nevada counties. Tap a
// county to toggle it into the selection; an alphabetical checklist below mirrors
// the map both ways. Name the set and Save → it becomes an on-device region the
// switcher pills point at. Every county already has bar-chart data built, so any
// selection works instantly (model/regions.js loads it on switch).
// =============================================================================
import { el, clear, toast } from './dom.js';
import { COUNTY_SHAPES, MAP_VIEWBOX } from '../data/county-shapes.js';
import { COUNTIES, DEFAULT_DEPTH } from '../data/counties.js';
import { saveRegion, deleteRegion, savedRegions, loadActiveRegion, setActiveRegion } from '../model/regions.js';
import { attachPanZoom } from './panzoom.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// All county codes, sorted alphabetically by display name (for the checklist).
const CODES_ALPHA = Object.keys(COUNTY_SHAPES)
  .sort((a, b) => (COUNTIES[a]?.name || a).localeCompare(COUNTIES[b]?.name || b));

// --- The interactive map ----------------------------------------------------
// Returns { node, refresh(code) }. Pan/pinch-zoom comes from ui/panzoom.js; a
// tap that didn't pan toggles the county under it via onToggle(code).
function buildMap(selected, onToggle) {
  const { w: W, h: H } = MAP_VIEWBOX;
  const wrap = el('div.map-wrap');
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'county-map');
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

  const pz = attachPanZoom(wrap, svg, {
    W, H,
    onTap: (e) => {
      const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-code]');
      if (hit && pathByCode[hit.dataset.code]) onToggle(hit.dataset.code);
    },
  });
  wrap.append(pz.controls());

  return {
    node: wrap,
    refresh(code) { pathByCode[code].classList.toggle('sel', selected.has(code)); },
  };
}

// --- The picker view --------------------------------------------------------
// editId — a saved region to edit; prefill — { name, counties } from a share
// link (#/import), pre-selecting the shared set to be saved as a NEW region.
export function renderRegionPicker(root, state, nav, editId, prefill = null) {
  clear(root);
  const editing = editId ? savedRegions().find((r) => r.id === editId) : null;
  const seedCounties = editing ? editing.counties : (prefill?.counties || []);
  const selected = new Set(seedCounties.filter((c) => COUNTY_SHAPES[c]));
  const checkboxByCode = {};

  root.append(el('header.bar', {}, [
    el('button.back', { onclick: () => nav.go('#/settings') }, '‹ Regions'),
    el('div.title-row', {}, [
      el('h1', {}, editing ? 'Edit region' : prefill ? 'Import region' : 'New region'),
      el('span.subtitle', {}, prefill
        ? 'Someone shared this county set with you — adjust if you like, then save.'
        : 'Tap counties on the map or the list, then name and save.'),
    ]),
  ]));

  // Dead-end guard: a share link that carried no usable counties would drop the
  // user on a blank picker. Say so, and the map below is the way forward.
  if (prefill && selected.size === 0) {
    root.append(el('div.dead-end', {}, [
      el('h2', {}, 'This share link had no counties'),
      el('p.dim', {}, 'The link didn’t include any counties we recognise — it may have been truncated. Build the region from the map below, or go back.'),
    ]));
  }

  const nameInput = el('input.region-name', {
    type: 'text', placeholder: 'Region name (e.g. North Coast)', value: editing?.name || prefill?.name || '',
    maxlength: 40,
  });

  const count = el('span.pick-count');
  const saveBtn = el('button.btn.primary', { onclick: onSave }, editing ? 'Save changes' : 'Save region');

  // Standing mode indicator, floated over the bottom of the map (clear of the
  // reach zone, pointer-transparent). It announces what tapping does and points
  // at the exit — the picker is a direct-manipulation mode, so it says so.
  const modeBanner = el('div.pick-mode');

  function updateCount() {
    const n = selected.size;
    count.textContent = n ? `${n} count${n === 1 ? 'y' : 'ies'} selected` : 'No counties selected';
    modeBanner.textContent = n
      ? `${n} selected · name & save below`
      : 'Tap counties to build your region';
    saveBtn.disabled = n === 0;
  }
  function setSel(code, on) {
    if (on) selected.add(code); else selected.delete(code);
    map.refresh(code);
    if (checkboxByCode[code]) checkboxByCode[code].checked = on;
    updateCount();
  }

  const map = buildMap(selected, (code) => setSel(code, !selected.has(code)));
  map.node.append(modeBanner);    // floats over the map's bottom edge
  root.append(map.node);

  // Toolbar: count + clear. Clear is undoable — it stashes the wiped set and
  // offers to put it right back (no destructive action without an unwind path).
  function onClear() {
    const wiped = [...selected];
    if (!wiped.length) return;
    for (const c of wiped) setSel(c, false);
    const n = wiped.length;
    toast(`Cleared ${n} count${n === 1 ? 'y' : 'ies'}.`, {
      action: { label: 'Undo', onClick: () => { for (const c of wiped) setSel(c, true); } },
    });
  }
  root.append(el('div.pick-toolbar', {}, [
    count,
    el('button.btn.ghost.small', { onclick: onClear }, 'Clear'),
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

  // Honest coverage note: statewide counties carry the build's default depth;
  // featured home-turf counties go deeper (see counties.js `depth`).
  const featured = Object.entries(COUNTIES).filter(([, c]) => c.depth).map(([, c]) => c.name.replace(' (NV)', ''));
  root.append(el('p.legend', {},
    `Each county carries its top ${DEFAULT_DEPTH} eBird hotspots from the quarterly build; ${featured.join(', ')} go deeper (40). Any region you save works instantly.`));

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
    const { removed, wasActive } = deleteRegion(editing.id);
    await loadActiveRegion();       // active may have fallen back to Home
    nav.go('#/settings');
    if (removed) {
      toast(`Deleted “${removed.name}”.`, {
        action: { label: 'Undo', onClick: async () => {
          saveRegion({ id: removed.id, name: removed.name, counties: removed.counties });
          if (wasActive) setActiveRegion(removed.id);
          await loadActiveRegion();
          nav.go('#/settings');     // re-render so the restored region row reappears
        } },
      });
    }
  }
}
