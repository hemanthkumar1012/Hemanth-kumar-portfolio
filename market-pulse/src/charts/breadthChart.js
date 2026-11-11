import { svgEl, svgText, resetSvg, scaleLinear, linePath, crosshair, nearestIndex } from "../lib/svg.js";
import { showTip, hideTip, tipTitle, tipRow } from "../lib/dom.js";
import { shortDate, tone } from "../lib/format.js";

/**
 * Index on the left axis, % of stocks above their 50/200-DMA on the right.
 * Shades sessions where price rose but participation fell (bearish divergence)
 * and returns how many there were.
 */
export function drawBreadthChart(svg, { index, above50, above200, netAdvances, dates }) {
  const width = resetSvg(svg);
  const height = +svg.getAttribute("height");
  const m = { l: 40, r: 40, t: 10, b: 22 };
  const n = index.length;
  const lo = Math.min(...index);
  const hi = Math.max(...index);

  const x = scaleLinear([0, n - 1], [m.l, width - m.r]);
  const yIndex = scaleLinear([lo, hi], [height - m.b, m.t]);
  const yPct = scaleLinear([0, 100], [height - m.b, m.t]);

  let divergences = 0;
  for (let i = 10; i < n; i++) {
    const priceUp = index[i] > index[i - 10];
    const breadthDown = above50[i] < above50[i - 10] - 6;
    if (priceUp && breadthDown) {
      svgEl("rect", {
        x: x(i - 1),
        y: m.t,
        width: Math.max(1, x(i) - x(i - 1) + 1),
        height: height - m.t - m.b,
        class: "div-zone",
      }, svg);
      divergences++;
    }
  }

  for (const v of [0, 25, 50, 75, 100]) {
    svgEl("line", { x1: m.l, x2: width - m.r, y1: yPct(v), y2: yPct(v), class: v === 50 ? "grid-line solid" : "grid-line" }, svg);
    svgText(svg, width - m.r + 6, yPct(v) + 3, `${v}%`);
  }
  for (let k = 0; k <= 4; k++) {
    const v = lo + ((hi - lo) * k) / 4;
    svgText(svg, m.l - 6, yIndex(v) + 3, v.toFixed(0), { "text-anchor": "end" });
  }
  for (let k = 0; k < 5; k++) {
    const i = Math.round((k * (n - 1)) / 4);
    svgText(svg, x(i), height - 6, shortDate(dates[i]), { "text-anchor": "middle" });
  }

  const baseline = `L${x(n - 1)},${height - m.b}L${x(0)},${height - m.b}Z`;
  svgEl("path", { d: linePath(above200, x, yPct) + baseline, class: "area-200" }, svg);
  svgEl("path", { d: linePath(above200, x, yPct), class: "ln ln-200" }, svg);
  svgEl("path", { d: linePath(above50, x, yPct), class: "ln ln-50" }, svg);
  svgEl("path", { d: linePath(index, x, yIndex), class: "ln ln-index" }, svg);

  const series = [
    [index, yIndex, "dot-index"],
    [above50, yPct, "dot-50"],
    [above200, yPct, "dot-200"],
  ];
  const dots = series.map(([, , cls]) => svgEl("circle", { r: 3.5, class: cls, opacity: 0 }, svg));

  crosshair(svg, {
    left: m.l,
    right: width - m.r,
    top: m.t,
    bottom: height - m.b,
    toIndex: nearestIndex(m.l, width - m.r, n),
    xOf: x,
    onMove(i, event) {
      series.forEach(([values, y], k) => {
        dots[k].setAttribute("cx", x(i));
        dots[k].setAttribute("cy", y(values[i]));
        dots[k].setAttribute("opacity", 1);
      });
      showTip(event,
        tipTitle(shortDate(dates[i])) +
        tipRow("Index", index[i].toFixed(2)) +
        tipRow("% &gt; 50-DMA", `${above50[i].toFixed(1)}%`) +
        tipRow("% &gt; 200-DMA", `${above200[i].toFixed(1)}%`) +
        tipRow("Net A/D", netAdvances[i], tone(netAdvances[i])));
    },
    onLeave() {
      hideTip();
      dots.forEach((d) => d.setAttribute("opacity", 0));
    },
  });

  return divergences;
}
