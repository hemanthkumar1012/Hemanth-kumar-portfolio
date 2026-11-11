import { svgEl, svgText, scaleLinear, linePath, crosshair } from "../lib/svg.js";
import { smaAt, rsi } from "../lib/math.js";

const PANEL = { width: 400, height: 300, price: 170, volume: 40, rsi: 60, gap: 8, right: 40, left: 4 };

/**
 * Price (candles + SMA 20/50), volume and RSI(14) stacked in one SVG.
 * `onReadout(i)` receives the hovered bar index so the caller can print OHLC.
 */
export function drawCandlePanel(svg, stock, { length, onReadout }) {
  const P = PANEL;
  const start = stock.close.length - length;
  const pick = (arr) => arr.slice(start);
  const open = pick(stock.open);
  const high = pick(stock.high);
  const low = pick(stock.low);
  const close = pick(stock.close);
  const volume = pick(stock.volume);
  const sma20 = close.map((_, i) => smaAt(stock.close, 20, start + i));
  const sma50 = close.map((_, i) => smaAt(stock.close, 50, start + i));
  const strength = pick(rsi(stock.close));

  svg.innerHTML = "";
  svg.setAttribute("viewBox", `0 0 ${P.width} ${P.height}`);

  const lo = Math.min(...low, ...sma50);
  const hi = Math.max(...high, ...sma50);
  const barW = (P.width - P.left - P.right) / length;
  const X = (i) => P.left + i * barW + barW / 2;
  const Y = scaleLinear([lo, hi], [P.price, 8]);
  const volTop = P.price + P.gap;
  const VY = scaleLinear([0, Math.max(...volume)], [volTop + P.volume, volTop]);
  const rsiTop = volTop + P.volume + P.gap;
  const RY = scaleLinear([0, 100], [rsiTop + P.rsi, rsiTop]);

  for (let k = 0; k <= 3; k++) {
    const v = lo + ((hi - lo) * k) / 3;
    svgEl("line", { x1: P.left, x2: P.width - P.right, y1: Y(v), y2: Y(v), class: "grid-line" }, svg);
    svgText(svg, P.width - P.right + 4, Y(v) + 3, v.toFixed(0));
  }

  close.forEach((c, i) => {
    const color = c >= open[i] ? "var(--gain)" : "var(--loss)";
    svgEl("line", { x1: X(i), x2: X(i), y1: Y(high[i]), y2: Y(low[i]), stroke: color }, svg);
    svgEl("rect", {
      x: X(i) - barW * 0.35,
      y: Y(Math.max(open[i], c)),
      width: barW * 0.7,
      height: Math.max(0.8, Math.abs(Y(open[i]) - Y(c))),
      fill: color,
    }, svg);
    svgEl("rect", {
      x: X(i) - barW * 0.35,
      y: VY(volume[i]),
      width: barW * 0.7,
      height: volTop + P.volume - VY(volume[i]),
      fill: color,
      opacity: 0.45,
    }, svg);
  });

  svgEl("path", { d: linePath(sma20, X, Y), class: "ln", stroke: "var(--acc)", "stroke-width": 1.3 }, svg);
  svgEl("path", { d: linePath(sma50, X, Y), class: "ln", stroke: "var(--vio)", "stroke-width": 1.3 }, svg);

  svgEl("rect", { x: P.left, y: RY(70), width: P.width - P.left - P.right, height: RY(30) - RY(70), fill: "var(--acc)", opacity: 0.06 }, svg);
  for (const level of [70, 30]) {
    svgEl("line", { x1: P.left, x2: P.width - P.right, y1: RY(level), y2: RY(level), class: "grid-line" }, svg);
    svgText(svg, P.width - P.right + 4, RY(level) + 3, level);
  }
  svgEl("path", { d: linePath(strength, X, RY), class: "ln", stroke: "var(--warn)", "stroke-width": 1.3 }, svg);
  svgText(svg, P.width - P.right + 4, volTop + 10, "Vol");

  const readout = (i) => onReadout({
    date: start + i,
    open: open[i],
    high: high[i],
    low: low[i],
    close: close[i],
    sma20: sma20[i],
    sma50: sma50[i],
    rsi: strength[i],
  });
  readout(length - 1);

  crosshair(svg, {
    left: 0,
    right: P.width,
    top: 0,
    bottom: P.height,
    horizontal: true,
    toIndex: (px) => Math.max(0, Math.min(length - 1, Math.floor((px - P.left) / barW))),
    xOf: X,
    onMove: (i) => readout(i),
    onLeave: () => readout(length - 1),
  });
}

/** Small area chart of a series against a dashed benchmark, as an SVG string. */
export function miniVersus(series, benchmark, height = 140) {
  const width = 400;
  const lo = Math.min(...series, ...benchmark);
  const hi = Math.max(...series, ...benchmark);
  const x = (i) => 4 + (i / (series.length - 1)) * (width - 8);
  const y = (v) => 8 + (1 - (v - lo) / (hi - lo || 1)) * (height - 16);
  const path = (arr) => arr.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const up = series[series.length - 1] >= series[0];
  const color = up ? "var(--gain)" : "var(--loss)";

  return `<svg viewBox="0 0 ${width} ${height}" width="100%">
    <path d="${path(series)}L${x(series.length - 1)},${height}L${x(0)},${height}Z" fill="${color}" opacity=".08"/>
    <path d="${path(benchmark)}" fill="none" stroke="var(--mut)" stroke-dasharray="3 3" stroke-width="1.2"/>
    <path d="${path(series)}" fill="none" stroke="${color}" stroke-width="2"/>
  </svg>`;
}
