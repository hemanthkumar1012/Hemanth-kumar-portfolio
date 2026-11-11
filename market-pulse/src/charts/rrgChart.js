import { svgEl, svgText, resetSvg } from "../lib/svg.js";
import { showTip, hideTip } from "../lib/dom.js";
import { quadrantOf } from "../data/market.js";

const QUADRANT_LAYOUT = [
  { name: "Leading", color: "var(--gain)", right: true, top: true },
  { name: "Weakening", color: "var(--warn)", right: true, top: false },
  { name: "Lagging", color: "var(--loss)", right: false, top: false },
  { name: "Improving", color: "var(--acc)", right: false, top: true },
];

/**
 * Relative Rotation Graph. `trails` maps sector -> points (oldest first).
 * The axes are symmetric around 100 so the quadrants stay the same size.
 */
export function drawRrg(svg, { trails, colors, highlight, describe, onSelect }) {
  const width = resetSvg(svg);
  const height = +svg.getAttribute("height");
  const pad = 28;

  const points = Object.values(trails).flat();
  const spanX = Math.max(...points.map((p) => Math.abs(p.x - 100))) + 0.5;
  const spanY = Math.max(...points.map((p) => Math.abs(p.y - 100))) + 0.5;
  const X = (v) => pad + ((v - (100 - spanX)) / (2 * spanX)) * (width - 2 * pad);
  const Y = (v) => pad + (1 - (v - (100 - spanY)) / (2 * spanY)) * (height - 2 * pad);
  const cx = X(100);
  const cy = Y(100);

  for (const q of QUADRANT_LAYOUT) {
    const x0 = q.right ? cx : pad;
    const y0 = q.top ? pad : cy;
    svgEl("rect", { x: x0, y: y0, width: cx - pad, height: cy - pad, fill: q.color, opacity: 0.05 }, svg);
    svgText(svg, q.right ? width - pad - 8 : pad + 8, q.top ? pad + 16 : height - pad - 8, q.name.toUpperCase(), {
      "text-anchor": q.right ? "end" : "start",
      fill: q.color,
      "font-weight": 600,
    });
  }
  svgEl("line", { x1: cx, x2: cx, y1: pad, y2: height - pad, stroke: "var(--line)" }, svg);
  svgEl("line", { x1: pad, x2: width - pad, y1: cy, y2: cy, stroke: "var(--line)" }, svg);
  svgText(svg, width - pad, height - 8, "RS-Ratio →", { "text-anchor": "end" });
  svgText(svg, 8, pad - 10, "↑ RS-Momentum");

  for (const [sector, trail] of Object.entries(trails)) {
    const color = colors[sector];
    const group = svgEl("g", { class: "rrg-sector", opacity: highlight && highlight !== sector ? 0.2 : 1 }, svg);
    const head = trail[trail.length - 1];

    svgEl("path", {
      d: trail.map((p, i) => `${i ? "L" : "M"}${X(p.x)},${Y(p.y)}`).join(""),
      fill: "none",
      stroke: color,
      "stroke-width": 1.5,
      opacity: 0.6,
    }, group);
    trail.slice(0, -1).forEach((p, i) => {
      svgEl("circle", { cx: X(p.x), cy: Y(p.y), r: 1.5 + i * 0.2, fill: color, opacity: 0.35 + i * 0.07 }, group);
    });
    svgEl("circle", { cx: X(head.x), cy: Y(head.y), r: 6, fill: color, stroke: "var(--panel)", "stroke-width": 2 }, group);
    svgText(group, X(head.x) + 9, Y(head.y) + 3, sector, { fill: "var(--txt)", "font-weight": 500 });

    group.style.cursor = "pointer";
    group.addEventListener("mousemove", (e) => showTip(e, describe(sector, head, quadrantOf(head))));
    group.addEventListener("mouseleave", hideTip);
    group.addEventListener("click", () => onSelect(sector));
  }
}
