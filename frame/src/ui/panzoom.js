// =============================================================================
// PAN/ZOOM — shared viewBox pan/pinch-zoom for the county SVG maps.
// =============================================================================
// Used by the county picker (ui/regionpicker.js) and the hotspot map
// (ui/mapview.js). COOPERATIVE GESTURES on touch: one finger belongs to the
// PAGE (touch-action: pan-y lets the browser scroll — on a small screen the
// map fills the viewport and used to trap scrolling entirely), two fingers
// pan/pinch the MAP. A mouse drag still pans 1:1, wheel zooms; a tap that
// didn't pan calls onTap(e) — resolve what was hit via
// document.elementFromPoint (pointer capture redirects native clicks, so
// per-element click handlers would never fire).
//
// attachPanZoom(wrap, svg, { W, H, home, maxZoom, onTap }) → controller:
//   home    — initial/reset viewBox {x,y,w,h}; defaults to the full 0 0 W H.
//   maxZoom — how far in you can pinch relative to the FULL map width.
// Controller: { reset(), zoomAtCenter(factor), controls() (the +/−/⤢ buttons) }.
// =============================================================================
import { el } from './dom.js';

// Map text size — the "Aa" button. One preference for every map on this
// device (localStorage), applied as the --tx multiplier the label CSS uses.
const TEXT_KEY = 'frame.maptext';
const TEXT_TIERS = [
  { k: 1,   label: 'Small' },
  { k: 1.3, label: 'Medium' },
  { k: 1.6, label: 'Large' },
];
function textTier() {
  try { const i = parseInt(localStorage.getItem(TEXT_KEY), 10); return Number.isInteger(i) && TEXT_TIERS[i] ? i : 1; }
  catch { return 1; }
}

export function attachPanZoom(wrap, svg, { W, H, home = null, maxZoom = 8, onTap = null, onZoom = null } = {}) {
  const HOME = home || { x: 0, y: 0, w: W, h: H };
  let vx = HOME.x, vy = HOME.y, vw = HOME.w, vh = HOME.h;

  // The DRAWN map inside the svg element (preserveAspectRatio "meet" letterboxes
  // it; the bars are invisible tan-on-tan). All finger math MUST use this box,
  // not the element box — using the element width made the map move only ~55%
  // of the finger on iPad ("finger moves further than the page").
  function contentBox() {
    const r = svg.getBoundingClientRect();
    const s = Math.min(r.width / vw, r.height / vh); // screen px per viewBox unit
    const cw = vw * s, ch = vh * s;
    return { left: r.left + (r.width - cw) / 2, top: r.top + (r.height - ch) / 2, cw, ch, s };
  }

  // Writes are batched to one per animation frame: pinch/drag fires pointermove
  // far faster than the screen paints, and re-writing the viewBox each event is
  // what made big maps feel rough. The sizing factors (--fk labels, --fc county
  // names, --fp pins, --fb boundary dashes) are computed HERE as plain numbers —
  // Safari mis-renders min()/division-by-var inside CSS calc (fat black pins on
  // iPad), so CSS only ever multiplies by these.
  let raf = 0;
  const applyVB = () => {
    raf = 0;
    svg.setAttribute('viewBox', `${vx.toFixed(3)} ${vy.toFixed(3)} ${vw.toFixed(3)} ${vh.toFixed(3)}`); // 3dp: at 256x zoom, 0.1-unit rounding was a visible jump
    const zf = W / vw;
    const tx = parseFloat(svg.style.getPropertyValue('--tx')) || 1.3;
    const pcap = parseFloat(svg.style.getPropertyValue('--pcap')) || 4;
    svg.style.setProperty('--zf', zf.toFixed(3));
    svg.style.setProperty('--fk', (Math.min(zf, 4.2) / zf * tx).toFixed(4));
    svg.style.setProperty('--fc', (Math.min(zf, 2.6) / zf * tx).toFixed(4));
    svg.style.setProperty('--fp', (Math.min(zf, pcap) / zf).toFixed(4));
    svg.style.setProperty('--fb', (Math.min(zf, 4) / zf).toFixed(4));
    cull(zf);
    if (onZoom) onZoom(zf);
  };
  const setVB = () => { if (!raf) raf = requestAnimationFrame(applyVB); };
  function clampPan() {
    vx = Math.min(Math.max(vx, 0), W - vw);
    vy = Math.min(Math.max(vy, 0), H - vh);
  }

  // Viewport culling — zoomed in, the svg was still painting every path, label
  // and pin of the whole state each frame ("very laggy close in"). Past 6x,
  // anything whose bbox is outside the view (+25% margin) stops rendering.
  // bboxes are measured once, lazily (skipping defs/clipPath and anything not
  // yet rendered — those retry on later passes).
  let cullItems = null;
  function cull(zf) {
    if (zf < 6) {
      if (cullItems) for (const it of cullItems) { if (it.off) { it.el.style.visibility = ''; it.off = false; } }
      return;
    }
    if (!cullItems) {
      cullItems = [];
      for (const el of svg.querySelectorAll('path, circle, text')) {
        if (el.closest('defs, clipPath')) continue;
        let bb; try { bb = el.getBBox(); } catch { continue; }
        if (!bb || (bb.width === 0 && bb.height === 0)) continue;
        cullItems.push({ el, x1: bb.x, y1: bb.y, x2: bb.x + bb.width, y2: bb.y + bb.height, off: false });
      }
    }
    const mx = vw * 0.25, my = vh * 0.25;
    const x1 = vx - mx, y1 = vy - my, x2 = vx + vw + mx, y2 = vy + vh + my;
    for (const it of cullItems) {
      const off = it.x2 < x1 || it.x1 > x2 || it.y2 < y1 || it.y1 > y2;
      if (off !== it.off) { it.el.style.visibility = off ? 'hidden' : ''; it.off = off; }
    }
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
    const c = contentBox();
    const px = Math.min(1, Math.max(0, (clientX - c.left) / c.cw));
    const py = Math.min(1, Math.max(0, (clientY - c.top) / c.ch));
    const ax = vx + px * vw, ay = vy + py * vh; // map point under the finger
    vw = Math.min(Math.max(vw / factor, minW), W);
    vh = vw * (H / W);
    vx = ax - px * vw;
    vy = ay - py * vh;
    clampPan();
    setVB();
  }
  function panBy(dxScreen, dyScreen) {
    const c = contentBox();
    vx -= dxScreen / c.s; // 1:1 — the map moves exactly as far as the finger
    vy -= dyScreen / c.s;
    clampPan();
    setVB();
  }

  const pts = new Map(); // pointerId → {x,y}
  let moved = false, downX = 0, downY = 0, lastDist = null, lastMid = null, multi = false;
  // Re-derive the pinch anchor (distance + midpoint) from the CURRENT first two
  // pointers whenever the pointer set changes. Without this, lifting one finger
  // of the pinching pair while a third rests down left lastDist holding the old
  // pair's distance, so the next 1px move snapped the zoom.
  function syncPinch() {
    if (pts.size >= 2) {
      const [a, b] = [...pts.values()];
      lastDist = Math.hypot(a.x - b.x, a.y - b.y);
      lastMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    } else {
      lastDist = null; lastMid = null;
    }
  }
  svg.addEventListener('pointerdown', (e) => {
    // Capture can throw if the pointer is already gone (late-delivered event);
    // tracking still works without it, so never let that abort the gesture.
    try { svg.setPointerCapture(e.pointerId); } catch { /* keep tracking */ }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) { moved = false; downX = e.clientX; downY = e.clientY; }
    if (pts.size >= 2) multi = true;
    syncPinch();
  });
  svg.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId);
    const cur = { x: e.clientX, y: e.clientY };
    pts.set(e.pointerId, cur);
    if (Math.hypot(cur.x - downX, cur.y - downY) > 8) moved = true;
    const arr = [...pts.values()];
    if (arr.length === 1) {
      // A single TOUCH finger is the page's: the wrap's touch-action lets the
      // browser scroll, and the browser pointercancels us if it takes over.
      // Panning the map here too would fight the scroll. Mouse/pen still pan.
      if (e.pointerType !== 'touch') panBy(cur.x - prev.x, cur.y - prev.y);
    } else if (arr.length >= 2) {
      const [a, b] = arr;
      const nd = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      // Follow the fingers: pan by the midpoint's travel, THEN zoom about it.
      if (lastMid) panBy(mx - lastMid.x, my - lastMid.y);
      if (lastDist) zoomAt(mx, my, nd / lastDist);
      lastDist = nd;
      lastMid = { x: mx, y: my };
    }
  });
  svg.addEventListener('pointerup', (e) => {
    // A tap is one finger, unmoved, and no second finger ever joined this gesture
    // (else the second finger's lift would register as a tap).
    const wasTap = pts.size === 1 && !moved && !multi;
    pts.delete(e.pointerId);
    syncPinch();
    if (pts.size === 0) multi = false;
    if (wasTap && onTap) onTap(e);
  });
  svg.addEventListener('pointercancel', (e) => {
    pts.delete(e.pointerId);
    syncPinch();
    if (pts.size === 0) multi = false;
  });
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15);
  }, { passive: false });

  function centerX() { const r = svg.getBoundingClientRect(); return r.left + r.width / 2; }
  function centerY() { const r = svg.getBoundingClientRect(); return r.top + r.height / 2; }

  // Apply the remembered text size on attach (default Medium).
  let tier = textTier();
  svg.style.setProperty('--tx', TEXT_TIERS[tier].k);

  const ctl = {
    reset() { vx = HOME.x; vy = HOME.y; vw = HOME.w; vh = HOME.h; setVB(); },
    zoomAtCenter(f) { zoomAt(centerX(), centerY(), f); },
    // Force the viewport-cull list to rebuild on the next frame. Labels that
    // were display:none when the list was first built (e.g. pin names, hidden
    // until you zoom in) get a zero bbox and are skipped forever otherwise —
    // so the caller invalidates when it toggles their visibility.
    invalidateCull() { cullItems = null; setVB(); },
    controls() {
      const textBtn = el('button.map-zbtn.map-textbtn', {
        title: `Map text: ${TEXT_TIERS[tier].label} — tap to change`,
        'aria-label': `Map text size: ${TEXT_TIERS[tier].label}`,
        onclick: () => {
          tier = (tier + 1) % TEXT_TIERS.length;
          svg.style.setProperty('--tx', TEXT_TIERS[tier].k);
          setVB(); // factors fold --tx in — recompute so the new size applies now
          try { localStorage.setItem(TEXT_KEY, String(tier)); } catch {}
          textBtn.title = `Map text: ${TEXT_TIERS[tier].label} — tap to change`;
          textBtn.setAttribute('aria-label', `Map text size: ${TEXT_TIERS[tier].label}`);
        },
      }, 'Aa');
      return el('div.map-zoom', {}, [
        el('button.map-zbtn', { title: 'Zoom in', onclick: () => ctl.zoomAtCenter(1.4) }, '+'),
        el('button.map-zbtn', { title: 'Zoom out', onclick: () => ctl.zoomAtCenter(1 / 1.4) }, '−'),
        el('button.map-zbtn', { title: 'Reset view', onclick: () => ctl.reset() }, '⤢'),
        textBtn,
      ]);
    },
  };
  setVB();
  return ctl;
}
