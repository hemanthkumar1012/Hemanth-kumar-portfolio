import { svgEl, svgText, resetSvg } from "../lib/svg.js";
import { showTip, hideTip, tipTitle, tipRow } from "../lib/dom.js";
import { pct, tone } from "../lib/format.js";

/** Horizontal diverging bars, best at the top. rows: [{ name, value }] */
export function drawRankedBars(svg, rows, benchmarkReturn) {
  const width = resetSvg(svg);
  const height = +svg.getAttribute("height");
  const labelWidth = 110;
  const peak = Math.max(...rows.map((r) => Math.abs(r.value)));
  const rowHeight = (height - 4) / rows.length;
  const zero = labelWidth + (width - labelWidth - 50) / 2;
  const half = (width - labelWidth - 50) / 2;

  rows.forEach((row, i) => {
    const w = (Math.abs(row.value) / peak) * half;
    const y = i * rowHeight;
    const positive = row.value >= 0;

    svgText(svg, labelWidth - 8, y + rowHeight / 2 + 3, row.name, { "text-anchor": "end" });
    const bar = svgEl("rect", {
      x: positive ? zero : zero - w,
      y: y + 3,
      width: Math.max(1, w),
      height: rowHeight - 6,
      rx: 2,
      fill: positive ? "var(--gain)" : "var(--loss)",
      opacity: 0.8,
    }, svg);
    svgText(svg, positive ? zero + w + 4 : zero - w - 4, y + rowHeight / 2 + 3, pct(row.value, 1), {
      "text-anchor": positive ? "start" : "end",
      class: "num",
      fill: "var(--txt)",
    });

    bar.addEventListener("mousemove", (e) =>
      showTip(e, tipTitle(row.name) + tipRow("Return", pct(row.value), tone(row.value)) +
        tipRow("vs Index", pct(row.value - benchmarkReturn), tone(row.value - benchmarkReturn))));
    bar.addEventListener("mouseleave", hideTip);
  });
  svgEl("line", { x1: zero, x2: zero, y1: 0, y2: height, stroke: "var(--line)" }, svg);
}

/** Semicircle gauge 0-100 with red / amber / green bands. */
export function drawGauge(svg, score, label, color) {
  svg.innerHTML = "";
  const cx = 110;
  const cy = 110;
  const r = 88;
  const at = (t) => [cx + r * Math.cos(Math.PI * (1 - t)), cy - r * Math.sin(Math.PI * (1 - t))];

  for (const [from, to, stroke] of [[0, 0.4, "var(--loss)"], [0.4, 0.65, "var(--warn)"], [0.65, 1, "var(--gain)"]]) {
    const [x0, y0] = at(from);
    const [x1, y1] = at(to);
    svgEl("path", { d: `M${x0},${y0}A${r},${r} 0 0 1 ${x1},${y1}`, stroke, "stroke-width": 14, fill: "none" }, svg);
  }

  const angle = Math.PI * (1 - score / 100);
  svgEl("line", {
    x1: cx,
    y1: cy,
    x2: cx + (r - 20) * Math.cos(angle),
    y2: cy - (r - 20) * Math.sin(angle),
    stroke: "var(--txt)",
    "stroke-width": 3,
    "stroke-linecap": "round",
    class: "needle",
  }, svg);
  svgEl("circle", { cx, cy, r: 6, fill: "var(--txt)" }, svg);
  svgText(svg, cx, cy + 34, Math.round(score), {
    "text-anchor": "middle",
    style: "font-size:26px;font-weight:700;fill:var(--txt);font-family:var(--mono)",
  });
  svgText(svg, cx, cy + 52, label, {
    "text-anchor": "middle",
    style: `font-size:11px;font-weight:700;fill:${color};letter-spacing:1px`,
  });
}

/**
 * Correlation matrix, shaded from the lowest to the highest off-diagonal value
 * in the window (absolute correlations between sectors are all fairly high).
 */
export function drawCorrelation(svg, names, matrix, windowLabel) {
  const width = resetSvg(svg);
  const height = +svg.getAttribute("height");
  const labelWidth = 96;
  const top = 14;
  const n = names.length;
  const cell = Math.min((width - labelWidth) / n, (height - top - 60) / n);

  const offDiagonal = matrix.flatMap((row, i) => row.filter((_, j) => i < j));
  const lo = Math.min(...offDiagonal);
  const hi = Math.max(...offDiagonal);

  names.forEach((rowName, i) => {
    svgText(svg, labelWidth - 6, top + i * cell + cell / 2 + 3, rowName, { "text-anchor": "end" });
    names.forEach((colName, j) => {
      const v = matrix[i][j];
      const t = i === j ? 1 : (v - lo) / (hi - lo || 1);
      const rect = svgEl("rect", {
        x: labelWidth + j * cell + 1,
        y: top + i * cell + 1,
        width: cell - 2,
        height: cell - 2,
        rx: 3,
        fill: i === j ? "var(--panel2)" : `rgba(212,212,212,${0.08 + 0.85 * t})`,
      }, svg);
      if (cell > 22) {
        svgText(svg, labelWidth + j * cell + cell / 2, top + i * cell + cell / 2 + 3, v.toFixed(2).replace("0.", "."), {
          "text-anchor": "middle",
          style: `font-size:9px;fill:${i !== j && t > 0.55 ? "#000" : "var(--mut)"}`,
        });
      }
      rect.addEventListener("mousemove", (e) =>
        showTip(e, tipTitle(`${rowName} × ${colName}`) + tipRow("Correlation", v.toFixed(3)) + tipRow("Window", windowLabel)));
      rect.addEventListener("mouseleave", hideTip);
    });
  });

  names.forEach((name, j) => {
    const x = labelWidth + j * cell + cell / 2;
    const y = top + n * cell + 10;
    svgText(svg, x, y, name.length > 10 ? `${name.slice(0, 9)}…` : name, {
      "text-anchor": "end",
      transform: `rotate(-45 ${x} ${y})`,
    });
  });
}
