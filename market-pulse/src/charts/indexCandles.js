import { svgEl, svgText, resetSvg, scaleLinear, linePath, crosshair } from "../lib/svg.js";

/**
 * Full-width index chart behind the rotation table: candles, volume, EMA 50,
 * high/low markers and right-axis price tags.
 */
export function drawIndexCandles(svg, { index, dates, length, onReadout }) {
  const width = resetSvg(svg);
  const height = +svg.getAttribute("height");
  const m = { l: 8, r: 62, t: 70, b: 24 };
  const volumeHeight = 70;
  const start = index.close.length - length;
  const pick = (arr) => arr.slice(start);
  const open = pick(index.open);
  const high = pick(index.high);
  const low = pick(index.low);
  const close = pick(index.close);
  const volume = pick(index.volume);
  const ema50 = pick(index.ema50);

  const lo = Math.min(...low);
  const hi = Math.max(...high);
  const barW = (width - m.l - m.r) / length;
  const X = (i) => m.l + i * barW + barW / 2;
  const Y = scaleLinear([lo, hi], [height - m.b - volumeHeight * 0.35, m.t]);
  const VY = scaleLinear([0, Math.max(...volume)], [height - m.b, height - m.b - volumeHeight]);

  for (let k = 0; k <= 6; k++) {
    const v = lo + ((hi - lo) * k) / 6;
    svgEl("line", { x1: m.l, x2: width - m.r, y1: Y(v), y2: Y(v), stroke: "var(--line)", opacity: 0.6 }, svg);
    svgText(svg, width - m.r + 6, Y(v) + 3, v.toFixed(2), { class: "pxl" });
  }

  let month = -1;
  for (let i = 0; i < length; i++) {
    const d = dates[start + i];
    if (d.getMonth() === month) continue;
    month = d.getMonth();
    if (i < 3) continue;
    svgEl("line", { x1: X(i), x2: X(i), y1: m.t - 10, y2: height - m.b, stroke: "var(--line)", opacity: 0.35 }, svg);
    const label = month === 0 ? d.getFullYear() : d.toLocaleDateString("en-IN", { month: "short" });
    svgText(svg, X(i), height - 6, label, { "text-anchor": "middle" });
  }

  close.forEach((c, i) => {
    const up = c >= open[i];
    svgEl("rect", {
      x: X(i) - barW * 0.35,
      y: VY(volume[i]),
      width: Math.max(1, barW * 0.7),
      height: height - m.b - VY(volume[i]),
      fill: up ? "rgba(74,222,128,.35)" : "rgba(248,113,113,.35)",
    }, svg);
  });
  close.forEach((c, i) => {
    const color = c >= open[i] ? "var(--gain)" : "var(--loss)";
    svgEl("line", { x1: X(i), x2: X(i), y1: Y(high[i]), y2: Y(low[i]), stroke: color }, svg);
    svgEl("rect", {
      x: X(i) - barW * 0.35,
      y: Y(Math.max(open[i], c)),
      width: Math.max(1, barW * 0.7),
      height: Math.max(0.8, Math.abs(Y(open[i]) - Y(c))),
      fill: color,
    }, svg);
  });
  svgEl("path", { d: linePath(ema50, X, Y), class: "ln", stroke: "var(--acc)", "stroke-width": 1.4 }, svg);

  const priceTag = (y, text, bg, fg) => {
    svgEl("rect", { x: width - m.r + 1, y: y - 8, width: m.r - 2, height: 16, rx: 2, fill: bg }, svg);
    svgText(svg, width - m.r + 5, y + 4, text, { class: "pxl", style: `fill:${fg}` });
  };
  const highAt = high.indexOf(hi);
  const lowAt = low.indexOf(lo);
  const lastClose = close[length - 1];

  svgEl("line", { x1: m.l, x2: width - m.r, y1: Y(lastClose), y2: Y(lastClose), stroke: "var(--txt)", "stroke-dasharray": "2 3", opacity: 0.5 }, svg);
  priceTag(Y(hi), hi.toFixed(2), "var(--panel2)", "var(--txt)");
  priceTag(Y(lo), lo.toFixed(2), "var(--panel2)", "var(--txt)");
  priceTag(Y(lastClose), lastClose.toFixed(2), "var(--txt)", "var(--bg)");
  svgText(svg, X(highAt), Y(hi) - 6, "High", { "text-anchor": "middle" });
  svgText(svg, X(lowAt), Y(lo) + 14, "Low", { "text-anchor": "middle" });

  const readout = (i) => onReadout({
    date: dates[start + i],
    open: open[i],
    high: high[i],
    low: low[i],
    close: close[i],
    prevClose: i ? close[i - 1] : close[i],
    volume: volume[i],
    ema50: ema50[i],
  });
  readout(length - 1);

  crosshair(svg, {
    left: m.l,
    right: width - m.r,
    top: m.t - 10,
    bottom: height - m.b,
    horizontal: true,
    toIndex: (px) => Math.max(0, Math.min(length - 1, Math.floor((px - m.l) / barW))),
    xOf: X,
    onMove: (i) => readout(i),
    onLeave: () => readout(length - 1),
  });
}
