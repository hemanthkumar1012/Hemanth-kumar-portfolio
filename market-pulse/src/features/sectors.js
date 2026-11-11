import { market, LAST, sectorNames, sectorColor, rrgPoint, QUADRANT_COLOR } from "../data/market.js";
import { periodReturn, pearson, dailyReturns, smaAt } from "../lib/math.js";
import { pct, tone } from "../lib/format.js";
import { $, divergingFill, showTip, hideTip, tipTitle, tipRow } from "../lib/dom.js";
import { emit } from "../lib/events.js";
import { drawRrg } from "../charts/rrgChart.js";
import { drawRankedBars, drawGauge, drawCorrelation } from "../charts/smallCharts.js";
import { squarify } from "../charts/treemap.js";
import { state } from "../state.js";

// ---- Relative Rotation Graph ----------------------------------------------

const TRAIL_WEEKS = 8;

export function renderRrg() {
  const trails = {};
  for (const name of sectorNames) {
    trails[name] = [];
    for (let week = TRAIL_WEEKS - 1; week >= 0; week--) trails[name].push(rrgPoint(name, LAST - week * 5));
  }

  drawRrg($("rrg"), {
    trails,
    colors: sectorColor,
    highlight: state.sectorFilter,
    describe: (name, p, quadrant) =>
      tipTitle(name) +
      `<div class="r">Quadrant<b style="color:${QUADRANT_COLOR[quadrant]}">${quadrant}</b></div>` +
      tipRow("RS-Ratio", p.x.toFixed(2)) +
      tipRow("RS-Momentum", p.y.toFixed(2)) +
      tipRow(`${state.days}-day return`, pct(periodReturn(market.sectorIndex[name], state.days)), tone(periodReturn(market.sectorIndex[name], state.days))),
    onSelect(name) {
      state.sectorFilter = state.sectorFilter === name ? "" : name;
      emit("filters");
    },
  });
}

// ---- Heatmap + ranked bars -------------------------------------------------

export function renderSectorHeat() {
  const rows = sectorNames
    .map((name) => ({ name, value: periodReturn(market.sectorIndex[name], state.days) }))
    .sort((a, b) => b.value - a.value);
  const peak = Math.max(...rows.map((r) => Math.abs(r.value)));

  $("heat").innerHTML = rows
    .map((r) => `<div class="cell" data-sector="${r.name}" style="background:${divergingFill(r.value, peak)}"><b>${r.name}</b><span>${pct(r.value, 1)}</span></div>`)
    .join("");
  $("hmTag").textContent = `${state.days}-session return`;

  drawRankedBars($("secbars"), rows, periodReturn(market.index.close, state.days));
}

export function initSectorHeat() {
  $("heat").addEventListener("click", (e) => {
    const cell = e.target.closest("[data-sector]");
    if (cell) emit("open-sector", cell.dataset.sector);
  });
}

// ---- Market map (treemap) --------------------------------------------------

export function renderMarketMap() {
  const container = $("tm");
  const width = container.clientWidth;
  const height = container.clientHeight;
  const sectors = sectorNames.map((name) => ({
    name,
    value: market.stocks.filter((s) => s.sector === name).reduce((sum, s) => sum + s.marketCap, 0),
  }));
  // Clip the colour scale so a couple of outliers don't wash everything else out.
  const peak = Math.max(...market.stocks.map((s) => Math.abs(periodReturn(s.close, state.days)))) * 0.7;

  let html = "";
  for (const block of squarify(sectors, { x: 0, y: 0, w: width, h: height })) {
    html += `<div class="sc" style="left:${block.x}px;top:${block.y}px;width:${block.w}px;height:${block.h}px"><i>${block.w > 60 ? block.item.name : ""}</i></div>`;

    const members = market.stocks
      .filter((s) => s.sector === block.item.name)
      .map((stock) => ({ stock, value: stock.marketCap }));
    for (const tile of squarify(members, block)) {
      const r = periodReturn(tile.item.stock.close, state.days);
      const roomy = tile.w > 46 && tile.h > 34;
      html += `<div class="st" data-symbol="${tile.item.stock.symbol}" style="left:${tile.x}px;top:${tile.y}px;width:${tile.w}px;height:${tile.h}px;background:${divergingFill(r, peak)}">${roomy ? `<b>${tile.item.stock.symbol}</b><span>${pct(r, 1)}</span>` : ""}</div>`;
    }
  }
  container.innerHTML = html;
}

export function initMarketMap(findStock) {
  const container = $("tm");
  container.addEventListener("click", (e) => {
    const tile = e.target.closest("[data-symbol]");
    if (tile) emit("open-stock", tile.dataset.symbol);
  });
  container.addEventListener("mousemove", (e) => {
    const tile = e.target.closest("[data-symbol]");
    if (!tile) return hideTip();
    const s = findStock(tile.dataset.symbol);
    const r = periodReturn(s.close, state.days);
    showTip(e, tipTitle(`${s.symbol} · ${s.name}`) + tipRow("Sector", s.sector) + tipRow(`${state.days}D return`, pct(r), tone(r)) + tipRow("RS Rank", s.rs));
  });
  container.addEventListener("mouseleave", hideTip);
}

// ---- Regime gauge ----------------------------------------------------------

export function renderRegime() {
  const { index, breadth, stocks } = market;
  const positive = (stocks.filter((s) => periodReturn(s.close, state.days) > 0).length / stocks.length) * 100;
  const advancers = (stocks.filter((s) => s.change > 0).length / stocks.length) * 100;
  const above50 = index.close[LAST] > smaAt(index.close, 50, LAST);
  const above200 = index.close[LAST] > smaAt(index.close, 200, LAST);
  const trend = above50 ? (above200 ? 100 : 60) : above200 ? 40 : 0;

  const signals = [
    ["% > 50-DMA", breadth.above50[LAST]],
    ["% > 200-DMA", breadth.above200[LAST]],
    ["Positive period return", positive],
    ["Advancers today", advancers],
    ["Index trend", trend],
  ];
  const score = signals.reduce((sum, [, v]) => sum + v, 0) / signals.length;
  const [label, color] = score >= 65 ? ["RISK-ON", "var(--gain)"] : score >= 40 ? ["NEUTRAL", "var(--warn)"] : ["RISK-OFF", "var(--loss)"];
  const band = (v) => (v >= 65 ? "var(--gain)" : v >= 40 ? "var(--warn)" : "var(--loss)");

  drawGauge($("gauge"), score, label, color);
  $("comp").innerHTML = signals
    .map(([name, v]) => `<div><span>${name}</span><em><u style="width:${v}%;background:${band(v)}"></u></em><b class="num" style="color:var(--txt);text-align:right">${v.toFixed(0)}</b></div>`)
    .join("");
}

// ---- Correlation matrix ----------------------------------------------------

export function renderCorrelation() {
  const returns = sectorNames.map((name) => dailyReturns(market.sectorIndex[name].slice(-state.days - 1)));
  const matrix = returns.map((a, i) => returns.map((b, j) => (i === j ? 1 : pearson(a, b))));

  let best = { value: Infinity };
  matrix.forEach((row, i) => row.forEach((v, j) => {
    if (i < j && v < best.value) best = { value: v, a: sectorNames[i], b: sectorNames[j] };
  }));

  drawCorrelation($("corr"), sectorNames, matrix, `${state.days} sessions`);
  $("corrTag").innerHTML = `<span class="pill n">Best diversifier: ${best.a} × ${best.b} (${best.value.toFixed(2)})</span>`;
}
