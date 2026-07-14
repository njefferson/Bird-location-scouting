// =============================================================================
// PAN/ZOOM — shared viewBox pan/pinch-zoom for the county SVG maps.
// =============================================================================
// Used by the county picker (ui/regionpicker.js) and the hotspot map
// (ui/mapview.js). One finger / drag pans, two fingers pinch, wheel zooms; a
// tap that didn't pan calls onTap(e) — resolve what was hit via
// document.elementFromPoint (pointer capture redirects native clicks, so
// per-element click handlers would never fire).
//
// attachPanZoom(wrap, svg, { W, H, home, maxZoom, onTap }) → controller:
//   home    — initial/reset viewBox {x,y,w,h}; defaults to the full 0 0 W H.
//   maxZoom — how far in you can pinch relative to the FULL map width.
// Controller: { reset(), zoomAtCenter(factor), controls() (the +/−/⤢ buttons) }.
// =============================================================================
import { el } from './dom.js';

export function attachPanZoom(wrap, svg, { W, H, home = null, maxZoom = 8, onTap = null, onZoom = null } = {}) {
  const HOME = home || { x: 0, y: 0, w: W, h: H };
  let vx = HOME.x, vy = HOME.y, vw = HOME.w, vh = HOME.h;

  // Writes are batched to one per animation frame: pinch/drag fires pointermove
  // far faster than the screen paints, and re-writing the viewBox each event is
  // what made big maps feel rough. `--zf` (zoom factor vs. the full map) drives
  // the CSS that keeps labels/pins a constant on-screen size once zoomed in.
  let raf = 0;
  const applyVB = () => {
    raf = 0;
    svg.setAttribute('viewBox', `${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`);
    const zf = W / vw;
    svg.style.setProperty('--zf', zf.toFixed(3));
    if (onZoom) onZoom(zf);
  };
  const setVB = () => { if (!raf) raf = requestAnimationFrame(applyVB); };
  function clampPan() {
    vx = Math.min(Math.max(vx, 0), W - vw);
    vy = Math.min(Math.max(vy, 0), H - vh);
  }
  // A quick rubber-band pulse when a zoom gesture pushes past the limit — the
  // map answers "you're all the way in/out" instead of just ignoring the pinch.
  let lastBounce = 0;
  function bounce(cls) {
    const now = performance.now();
    if (now - lastBounce < 450) return;
    lastBounce = now;
    svg.classList.add(cls);
    svg.addEventListener('animationend', () => svg.classList.remove(cls), { once: true });
  }
  function zoomAt(clientX, clientY, factor) {
    const minW = W / maxZoom;
    if (factor > 1.02 && vw <= minW * 1.001) bounce('pz-limit-in');
    else if (factor < 0.98 && vw >= W * 0.999) bounce('pz-limit-out');
    const rect = svg.getBoundingClientRect();
    const px = (clientX - rect.left) / rect.width;
    const py = (clientY - rect.top) / rect.height;
    const ax = vx + px * vw, ay = vy + py * vh; // svg point under the cursor
    vw = Math.min(Math.max(vw / factor, minW), W);
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
    if (wasTap && onTap) onTap(e);
  });
  svg.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); if (pts.size < 2) lastDist = null; });
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15);
  }, { passive: false });

  function centerX() { const r = svg.getBoundingClientRect(); return r.left + r.width / 2; }
  function centerY() { const r = svg.getBoundingClientRect(); return r.top + r.height / 2; }

  const ctl = {
    reset() { vx = HOME.x; vy = HOME.y; vw = HOME.w; vh = HOME.h; setVB(); },
    zoomAtCenter(f) { zoomAt(centerX(), centerY(), f); },
    controls() {
      return el('div.map-zoom', {}, [
        el('button.map-zbtn', { title: 'Zoom in', onclick: () => ctl.zoomAtCenter(1.4) }, '+'),
        el('button.map-zbtn', { title: 'Zoom out', onclick: () => ctl.zoomAtCenter(1 / 1.4) }, '−'),
        el('button.map-zbtn', { title: 'Reset view', onclick: () => ctl.reset() }, '⤢'),
      ]);
    },
  };
  setVB();
  return ctl;
}
