import { market, LAST, sectorNames } from "../data/market.js";
import { smaAt, periodReturn } from "../lib/math.js";
import { pct, signed, shortDate, tone } from "../lib/format.js";
import { $, showTip, hideTip, tipTitle, tipRow } from "../lib/dom.js";
import { emit } from "../lib/events.js";
import { drawIndexCandles } from "../charts/indexCandles.js";
import { state } from "../state.js";

const STATE_CLASS = {
  ACCELERATING: "st-a",
  LEADER: "st-l",
  EMERGING: "st-e",
  WATCH: "st-w",
  NEUTRAL: "st-n",
  DETERIORATING: "st-d",
  WEAK: "st-k",
};

/** Raw composite: excess return over 10/21/63 sessions plus a trend bonus. */
function compositeAt(sector, i) {
  const series = market.sectorIndex[sector];
  const excess = (days) => series[i] / series[i - days] - 1 - (market.index.close[i] / market.index.close[i - days] - 1);
  const trend = (series[i] > smaAt(series, 50, i) ? 0.02 : -0.02) + (series[i] > smaAt(series, 200, i) ? 0.015 : -0.015);
  return 0.35 * excess(21) + 0.35 * excess(63) + 0.15 * excess(10) + trend;
}

/** Scores rescaled to 20–90 across sectors so they read like a familiar 0–100 scale. */
function scoresAt(i) {
  const raw = sectorNames.map((name) => compositeAt(name, i));
  const lo = Math.min(...raw);
  const hi = Math.max(...raw);
  return raw.map((v) => 20 + (70 * (v - lo)) / (hi - lo || 1));
}

function classify(row, position, total) {
  if (position < 3) {
    if (row.delta1w > 2) return "ACCELERATING";
    if (row.delta4w > 8) return "EMERGING";
    return "LEADER";
  }
  if (position >= total - 2) return "WEAK";
  if (position >= total - 4) return row.delta1w < 0 ? "DETERIORATING" : "NEUTRAL";
  if (row.delta1w < -3 || row.delta4w < -6) return "WATCH";
  if (row.delta4w > 8) return "EMERGING";
  return "NEUTRAL";
}

export function sectorRankings() {
  const now = scoresAt(LAST);
  const weekAgo = scoresAt(LAST - 5);
  const monthAgo = scoresAt(LAST - 20);

  const rows = sectorNames.map((name, k) => {
    const members = market.stocks.filter((s) => s.sector === name);
    const relVolume = members.reduce((sum, s) => sum + s.relVolume, 0) / members.length;
    return {
      name,
      score: now[k],
      delta1w: now[k] - weekAgo[k],
      delta4w: now[k] - monthAgo[k],
      rs1m: periodReturn(market.sectorIndex[name], 21) - periodReturn(market.index.close, 21),
      rs3m: periodReturn(market.sectorIndex[name], 63) - periodReturn(market.index.close, 63),
      relVolume,
    };
  });

  const lastWeekOrder = sectorNames
    .map((name, k) => ({ name, score: weekAgo[k] }))
    .sort((a, b) => b.score - a.score)
    .map((r) => r.name);

  rows.sort((a, b) => b.score - a.score);
  rows.forEach((row, position) => {
    row.rank = position + 1;
    row.previousRank = lastWeekOrder.indexOf(row.name) + 1;
    row.status = classify(row, position, rows.length);
  });
  return rows;
}

let currentRows = [];

function renderTable() {
  currentRows = sectorRankings();
  const arrow = (r) => (r.previousRank > r.rank ? "▲" : r.previousRank < r.rank ? "▼" : "•");

  $("rkT").innerHTML = `
    <thead><tr>
      <th>Rank</th><th>Prev</th><th>Sector</th><th>Score</th><th>Δ 1W</th><th>Δ 4W</th>
      <th>RS 1M</th><th>RS 3M</th><th>RVOL</th><th>State</th>
    </tr></thead>
    <tbody>${currentRows
      .map((r, i) => `
        <tr class="${STATE_CLASS[r.status]}" data-sector="${r.name}" style="animation-delay:${i * 45}ms">
          <td>${r.rank}</td>
          <td>${r.previousRank} ${arrow(r)}</td>
          <td>${r.name}</td>
          <td>${r.score.toFixed(1)}</td>
          <td>${signed(r.delta1w)}</td>
          <td>${signed(r.delta4w)}</td>
          <td>${signed(r.rs1m * 100, 2)}%</td>
          <td>${signed(r.rs3m * 100, 2)}%</td>
          <td>${r.relVolume.toFixed(2)}</td>
          <td class="st">${r.status}</td>
        </tr>`)
      .join("")}</tbody>`;
}

function renderChart() {
  const length = Math.min(market.index.close.length, Math.max(state.days, 126));
  drawIndexCandles($("rcSvg"), {
    index: market.index,
    dates: market.dates,
    length,
    onReadout(bar) {
      const cls = bar.close >= bar.open ? "g" : "l";
      $("rcMeta").innerHTML = `
        <div><b>NIFTY 500 (sim)</b> · 1D · <span class="m">${shortDate(bar.date)}</span>
          &nbsp;O <b class="num ${cls}">${bar.open.toFixed(2)}</b>
          H <b class="num ${cls}">${bar.high.toFixed(2)}</b>
          L <b class="num ${cls}">${bar.low.toFixed(2)}</b>
          C <b class="num ${cls}">${bar.close.toFixed(2)}</b>
          <span class="num ${cls}">${pct(bar.close / bar.prevClose - 1)}</span></div>
        <div>Vol <b class="num g">${(bar.volume / 1e6).toFixed(2)}M</b></div>
        <div>EMA 50 close <b class="num" style="color:var(--acc)">${bar.ema50.toFixed(2)}</b></div>`;
    },
  });
}

export function renderRotation() {
  renderChart();
  renderTable();
}

export function initRotation() {
  const table = $("rkT");
  table.addEventListener("click", (e) => {
    const row = e.target.closest("tr[data-sector]");
    if (row) emit("open-sector", row.dataset.sector);
  });
  table.addEventListener("mousemove", (e) => {
    const tr = e.target.closest("tr[data-sector]");
    if (!tr) return hideTip();
    const r = currentRows.find((x) => x.name === tr.dataset.sector);
    showTip(e,
      tipTitle(r.name) +
      tipRow("Score", r.score.toFixed(1)) +
      tipRow("Rank change (1W)", `${r.previousRank} → ${r.rank}`) +
      tipRow("RS vs index 3M", pct(r.rs3m), tone(r.rs3m)) +
      tipRow("State", r.status));
  });
  table.addEventListener("mouseleave", hideTip);

  $("rkTog").addEventListener("click", () => {
    const hidden = table.style.display === "none";
    table.style.display = hidden ? "" : "none";
    $("rkTog").textContent = hidden ? "Hide table" : "Show table";
  });
}
