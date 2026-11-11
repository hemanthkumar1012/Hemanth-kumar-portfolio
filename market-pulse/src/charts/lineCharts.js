import { svgEl, svgText, resetSvg, scaleLinear, linePath, crosshair, nearestIndex } from "../lib/svg.js";
import { showTip, hideTip, tipTitle, tipRow } from "../lib/dom.js";
import { pct, shortDate } from "../lib/format.js";

/** Backtest equity curves (top) and the strategy's underwater curve (bottom). */
export function drawEquity(equitySvg, drawdownSvg, result, dates, holdingsAt) {
  const width = resetSvg(equitySvg);
  const height = +equitySvg.getAttribute("height");
  const m = { l: 40, r: 10, t: 10, b: 20 };
  const { equity, benchmark, equalWeight, drawdown, start } = result;
  const n = equity.length;
  const all = [...equity, ...benchmark, ...equalWeight];
  const x = scaleLinear([0, n - 1], [m.l, width - m.r]);
  const y = scaleLinear([Math.min(...all), Math.max(...all)], [height - m.b, m.t]);
  const lo = Math.min(...all);
  const hi = Math.max(...all);

  for (let k = 0; k <= 4; k++) {
    const v = lo + ((hi - lo) * k) / 4;
    svgEl("line", { x1: m.l, x2: width - m.r, y1: y(v), y2: y(v), class: "grid-line" }, equitySvg);
    svgText(equitySvg, m.l - 6, y(v) + 3, `${((v - 1) * 100).toFixed(0)}%`, { "text-anchor": "end" });
  }
  for (let k = 0; k < 4; k++) {
    const i = Math.round((k * (n - 1)) / 3);
    const anchor = k === 0 ? "start" : k === 3 ? "end" : "middle";
    svgText(equitySvg, x(i), height - 4, shortDate(dates[start + i]), { "text-anchor": anchor });
  }

  const defs = svgEl("defs", {}, equitySvg);
  const gradient = svgEl("linearGradient", { id: "equityFill", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  svgEl("stop", { offset: 0, "stop-color": "#fff", "stop-opacity": 0.14 }, gradient);
  svgEl("stop", { offset: 1, "stop-color": "#fff", "stop-opacity": 0 }, gradient);

  svgEl("path", { d: `${linePath(equity, x, y)}L${x(n - 1)},${height - m.b}L${x(0)},${height - m.b}Z`, fill: "url(#equityFill)" }, equitySvg);
  svgEl("path", { d: linePath(equalWeight, x, y), class: "ln ln-ew" }, equitySvg);
  svgEl("path", { d: linePath(benchmark, x, y), class: "ln ln-bench" }, equitySvg);
  svgEl("path", { d: linePath(equity, x, y), class: "ln ln-strategy" }, equitySvg);
  const dot = svgEl("circle", { r: 4, fill: "var(--txt)", opacity: 0 }, equitySvg);

  crosshair(equitySvg, {
    left: m.l,
    right: width - m.r,
    top: m.t,
    bottom: height - m.b,
    toIndex: nearestIndex(m.l, width - m.r, n),
    xOf: x,
    onMove(i, event) {
      dot.setAttribute("cx", x(i));
      dot.setAttribute("cy", y(equity[i]));
      dot.setAttribute("opacity", 1);
      showTip(event,
        tipTitle(shortDate(dates[start + i])) +
        tipRow("Strategy", pct(equity[i] - 1, 1)) +
        tipRow("NIFTY 500", pct(benchmark[i] - 1, 1)) +
        tipRow("Equal-weight", pct(equalWeight[i] - 1, 1)) +
        tipRow("Drawdown", pct(drawdown[i], 1), "l") +
        `<div class="r">Holding<b style="font-family:var(--f);font-size:11px">${holdingsAt(i).join(", ")}</b></div>`);
    },
    onLeave() {
      hideTip();
      dot.setAttribute("opacity", 0);
    },
  });

  resetSvg(drawdownSvg);
  const ddHeight = +drawdownSvg.getAttribute("height");
  const worst = Math.min(...drawdown, -0.01);
  const ddY = scaleLinear([0, worst], [4, ddHeight - 4]);
  svgEl("path", { d: `${linePath(drawdown, x, ddY)}L${x(n - 1)},4L${x(0)},4Z`, class: "dd-area" }, drawdownSvg);
  svgEl("line", { x1: m.l, x2: width - m.r, y1: 4, y2: 4, stroke: "var(--line)" }, drawdownSvg);
  svgText(drawdownSvg, m.l - 6, 12, "0%", { "text-anchor": "end" });
  svgText(drawdownSvg, m.l - 6, ddHeight - 4, `${(worst * 100).toFixed(0)}%`, { "text-anchor": "end" });
}

/** Several series rebased to 100, end-of-line labels, shared tooltip. */
export function drawComparison(svg, { series, benchmark, dates, start }) {
  const width = resetSvg(svg);
  const height = +svg.getAttribute("height");
  const m = { l: 40, r: 60, t: 10, b: 20 };
  const n = benchmark.length;
  const all = [...series.flatMap((s) => s.values), ...benchmark];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const x = scaleLinear([0, n - 1], [m.l, width - m.r]);
  const y = scaleLinear([lo, hi], [height - m.b, m.t]);

  for (let k = 0; k <= 4; k++) {
    const v = lo + ((hi - lo) * k) / 4;
    svgEl("line", { x1: m.l, x2: width - m.r, y1: y(v), y2: y(v), class: "grid-line" }, svg);
    svgText(svg, m.l - 6, y(v) + 3, v.toFixed(0), { "text-anchor": "end" });
  }
  svgEl("line", { x1: m.l, x2: width - m.r, y1: y(100), y2: y(100), stroke: "#555" }, svg);
  svgEl("path", { d: linePath(benchmark, x, y), class: "ln ln-bench" }, svg);

  for (const s of series) {
    svgEl("path", { d: linePath(s.values, x, y), class: "ln", stroke: s.color, "stroke-width": 1.8 }, svg);
    const endY = y(s.values[n - 1]);
    svgEl("rect", { x: width - m.r + 2, y: endY - 8, width: m.r - 4, height: 16, rx: 3, fill: s.color }, svg);
    svgText(svg, width - m.r + 6, endY + 4, s.label.slice(0, 7), { class: "pxl", style: "fill:#000;font-weight:600" });
  }

  const asChange = (v) => `${v - 100 >= 0 ? "+" : ""}${(v - 100).toFixed(1)}%`;
  crosshair(svg, {
    left: m.l,
    right: width - m.r,
    top: m.t,
    bottom: height - m.b,
    toIndex: nearestIndex(m.l, width - m.r, n),
    xOf: x,
    onMove(i, event) {
      const rows = series
        .map((s) => `<div class="r"><span style="color:${s.color}">● ${s.label}</span><b>${asChange(s.values[i])}</b></div>`)
        .join("");
      showTip(event, tipTitle(shortDate(dates[start + i])) + rows + tipRow("NIFTY 500", asChange(benchmark[i])));
    },
    onLeave: hideTip,
  });
}
