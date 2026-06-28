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

/** A 12-point SVG sparkline for a 0–1 series; faded where inferred. */
export function sparkline(series, { w = 96, h = 22, inferred = false } = {}) {
  const max = Math.max(0.0001, ...series.map((s) => (typeof s === 'number' ? s : s.value)));
  const pts = series.map((s, i) => {
    const v = typeof s === 'number' ? s : s.value;
    const x = (i / 11) * (w - 2) + 1;
    const y = h - 1 - (v / max) * (h - 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', w); svg.setAttribute('height', h);
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
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
  return svg;
}
