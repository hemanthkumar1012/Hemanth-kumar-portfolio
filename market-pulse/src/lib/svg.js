const SVG_NS = "http://www.w3.org/2000/svg";

export function svgEl(tag, attrs = {}, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (parent) parent.appendChild(node);
  return node;
}

export function svgText(parent, x, y, text, attrs = {}) {
  const node = svgEl("text", { x, y, ...attrs }, parent);
  node.textContent = text;
  return node;
}

/** Empties an <svg> and returns its rendered width. */
export function resetSvg(svg) {
  svg.innerHTML = "";
  return svg.clientWidth;
}

export function scaleLinear([d0, d1], [r0, r1]) {
  const span = d1 - d0 || 1;
  return (v) => r0 + ((v - d0) / span) * (r1 - r0);
}

export const linePath = (values, x, y) =>
  values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");

export function sparkline(values, { width = 70, height = 26, color = "currentColor" } = {}) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * width},${height - ((v - lo) / (hi - lo || 1)) * height}`)
    .join(" ");
  return `<svg width="${width}" height="${height}"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5"/></svg>`;
}

/**
 * Adds a transparent hit area with a dashed vertical (and optional horizontal)
 * crosshair. `toIndex(px)` maps a pointer x (in SVG units) to a data index.
 */
export function crosshair(svg, { left, right, top, bottom, toIndex, xOf, onMove, onLeave, horizontal = false }) {
  const vLine = svgEl("line", { y1: top, y2: bottom, class: "xhair", opacity: 0 }, svg);
  const hLine = horizontal ? svgEl("line", { x1: left, x2: right, class: "xhair", opacity: 0 }, svg) : null;
  const hit = svgEl("rect", { x: left, y: 0, width: right - left, height: bottom + 20, fill: "transparent" }, svg);

  hit.addEventListener("pointermove", (event) => {
    const box = svg.getBoundingClientRect();
    const viewBoxWidth = svg.viewBox.baseVal && svg.viewBox.baseVal.width;
    const scale = viewBoxWidth ? viewBoxWidth / box.width : 1;
    const px = (event.clientX - box.left) * scale;
    const py = (event.clientY - box.top) * scale;
    const i = toIndex(px);

    vLine.setAttribute("x1", xOf(i));
    vLine.setAttribute("x2", xOf(i));
    vLine.setAttribute("opacity", 1);
    if (hLine) {
      hLine.setAttribute("y1", py);
      hLine.setAttribute("y2", py);
      hLine.setAttribute("opacity", 1);
    }
    onMove(i, event, py);
  });

  hit.addEventListener("pointerleave", () => {
    vLine.setAttribute("opacity", 0);
    hLine?.setAttribute("opacity", 0);
    onLeave?.();
  });
}

/** Index under the pointer for a series of `count` evenly spaced points. */
export const nearestIndex = (left, right, count) => (px) =>
  Math.max(0, Math.min(count - 1, Math.round(((px - left) / (right - left)) * (count - 1))));
