// Tiny DOM helpers — no framework, just sugar over createElement.

/**
 * el('div.card#id', { onclick }, [children]) → HTMLElement
 * Tag string supports .class and #id shorthand.
 */
export function el(tag, props = {}, children = []) {
  let tagName = 'div', id = null;
  const classes = [];
  tag.replace(/([.#]?[^.#]+)/g, (m) => {
    if (m[0] === '.') classes.push(m.slice(1));
    else if (m[0] === '#') id = m.slice(1);
    else tagName = m;
    return m;
  });
  const node = document.createElement(tagName);
  if (id) node.id = id;
  if (classes.length) node.className = classes.join(' ');
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null) continue;
    if (k === 'class') node.className = [node.className, v].filter(Boolean).join(' ');
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k in node && k !== 'list') node[k] = v;
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

export function pct(x) { return `${Math.round(x * 100)}%`; }

/**
 * Toast above the tab bar (auto-dismisses). Optionally actionable:
 *   toast('Deleted "X"', { action: { label: 'Undo', onClick } })
 * An actionable toast catches taps (the plain one stays pointer-transparent),
 * lingers longer so the offer is reachable, and dismisses the instant the
 * action fires. Back-compat: the second arg may still be a plain number of ms.
 * Returns a dismiss() so a caller can retract it early.
 */
export function toast(msg, opts = {}) {
  if (typeof opts === 'number') opts = { ms: opts };
  const action = opts.action || null;
  const ms = opts.ms ?? (action ? 6500 : 3500);
  document.querySelector('.toast')?.remove();
  const t = el('div.toast', {}, [el('span.toast-msg', {}, msg)]);
  let done = false;
  const dismiss = () => {
    if (done) return; done = true;
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  };
  if (action) {
    t.classList.add('has-action');
    t.append(el('button.toast-action', {
      onclick: () => { dismiss(); action.onClick(); },
    }, action.label));
  }
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(dismiss, ms);
  return dismiss;
}

/**
 * Presence intensity (0–100, normalised so the best spot in view = 100) is
 * heavy-tailed: in a full region the median hotspot sits around 1% of the top
 * one, so a LINEAR accent→card mix crushes ~9 dots in 10 to near-white and only
 * a couple ever read as orange — the key promises a white→orange spread the dots
 * never actually show. This bends the SCORE→COLOUR curve so the many low spots
 * lift off white into visible tans while the few best stay fullest. It's colour
 * only — the ranking, the "N species likely" count and the order never move.
 * The exponent is the one knob: lower = more lift for low spots.
 */
const SCORE_COLOR_GAMMA = 0.5;
export function scoreColorPct(vis) {
  const v = Math.max(0, Math.min(100, vis)) / 100;
  return Math.round(100 * Math.pow(v, SCORE_COLOR_GAMMA));
}

// The legend gradient, sampled along the SAME curve so the key matches the dots:
// at each position (the 0–100 score) the colour is exactly what a pin/cell of
// that score wears.
function scaleGradient() {
  const stops = [];
  for (let i = 0; i <= 10; i++) {
    const v = i * 10;
    stops.push(`color-mix(in srgb, var(--score-hot) ${scoreColorPct(v)}%, var(--card)) ${v}%`);
  }
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

/**
 * A colour-scale legend (0 → 100), so the score colours mean something. The
 * gradient bar is sampled from the SAME curved accent→card mix the pins and
 * planner cells use, so what you see on the map matches the key exactly. One
 * direction everywhere: more colour = higher score.
 */
export function scoreScale(caption) {
  return el('div.score-scale', {}, [
    el('div.scale-row', {}, [
      el('span.scale-end', {}, '0'),
      el('span.scale-bar', { 'aria-hidden': 'true', style: `background:${scaleGradient()}` }),
      el('span.scale-end', {}, '100'),
    ]),
    caption ? el('p.scale-cap', {}, caption) : null,
  ]);
}

/** A 12-point SVG sparkline for a 0–1 series; faded where inferred. */
export function sparkline(series, { w = 96, h = 22, inferred = false, months = true } = {}) {
  const max = Math.max(0.0001, ...series.map((s) => (typeof s === 'number' ? s : s.value)));
  const pts = series.map((s, i) => {
    const v = typeof s === 'number' ? s : s.value;
    const x = (i / 11) * (w - 2) + 1;
    const y = h - 1 - (v / max) * (h - 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const ns = 'http://www.w3.org/2000/svg';
  const labelH = months ? 10 : 0;          // room for the month-initial axis
  const totalH = h + labelH;
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', w); svg.setAttribute('height', totalH);
  svg.setAttribute('viewBox', `0 0 ${w} ${totalH}`);
  svg.classList.add('spark'); if (inferred) svg.classList.add('inferred');
  // Faint vertical gridlines marking each of the 12 months (drawn under the data line).
  for (let i = 0; i < 12; i++) {
    const x = (i / 11) * (w - 2) + 1;
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', x.toFixed(1)); line.setAttribute('y1', '0');
    line.setAttribute('x2', x.toFixed(1)); line.setAttribute('y2', String(h));
    line.classList.add('spark-grid');
    svg.append(line);
  }
  const poly = document.createElementNS(ns, 'polyline');
  poly.setAttribute('points', pts.join(' '));
  poly.setAttribute('fill', 'none');
  svg.append(poly);
  // Month-initial axis (J F M A M J J A S O N D) along the bottom.
  if (months) {
    const INIT = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    for (let i = 0; i < 12; i++) {
      const x = (i / 11) * (w - 2) + 1;
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('x', x.toFixed(1));
      t.setAttribute('y', String(totalH - 1));
      t.setAttribute('text-anchor', i === 0 ? 'start' : i === 11 ? 'end' : 'middle');
      t.classList.add('spark-mon');
      t.textContent = INIT[i];
      svg.append(t);
    }
  }
  return svg;
}
