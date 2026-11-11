import { $ } from "../lib/dom.js";
import { runBacktest, currentParams, setParams } from "./backtest.js";

const LOOKBACKS = [10, 21, 42, 63, 84, 105, 126];
const TOP_N = [1, 2, 3, 4, 5, 6];

let cache = null; // keyed by rebalance + cost; the grid only changes when those do

/** Sharpe for every lookback × topN pair at the current rebalance/cost. */
function computeGrid({ rebalance, costBps }) {
  const key = `${rebalance}:${costBps}`;
  if (cache?.key === key) return cache.grid;

  const grid = TOP_N.map((topN) =>
    LOOKBACKS.map((lookback) => runBacktest({ lookback, topN, rebalance, costBps }).stats.sharpe));
  cache = { key, grid };
  return grid;
}

/** Below zero is red; above zero shades from grey to green relative to the best cell. */
function shade(value, hi) {
  if (value < 0) return `rgba(220,38,38,${Math.min(0.9, 0.3 + -value)})`;
  const t = value / (hi || 1);
  return `rgba(22,163,74,${0.12 + 0.78 * t * t})`;
}

export function renderSweep() {
  const params = currentParams();
  const grid = computeGrid(params);
  const flat = grid.flat();
  const hi = Math.max(...flat);
  let best = { value: -Infinity };

  grid.forEach((row, r) => row.forEach((value, c) => {
    if (value > best.value) best = { value, r, c };
  }));

  const container = $("sweep");
  container.style.gridTemplateColumns = `56px repeat(${LOOKBACKS.length}, 1fr)`;

  let html = `<div class="axis">N \\ L</div>${LOOKBACKS.map((l) => `<div class="axis">${l}d</div>`).join("")}`;
  grid.forEach((row, r) => {
    html += `<div class="axis">Top ${TOP_N[r]}</div>`;
    row.forEach((value, c) => {
      const isBest = r === best.r && c === best.c;
      const isCurrent = TOP_N[r] === params.topN && LOOKBACKS[c] === params.lookback;
      html += `<div class="cellx ${isBest ? "best" : ""} ${isCurrent ? "current" : ""}"
        style="background:${shade(value, hi)}"
        data-lookback="${LOOKBACKS[c]}" data-top="${TOP_N[r]}"
        title="Lookback ${LOOKBACKS[c]}d · top ${TOP_N[r]} · Sharpe ${value.toFixed(2)}">${value.toFixed(2)}</div>`;
    });
  });
  container.innerHTML = html;

  $("sweepTag").innerHTML = `<span class="pill n">Best: ${LOOKBACKS[best.c]}d · top ${TOP_N[best.r]} · Sharpe ${best.value.toFixed(2)}</span>`;
}

export function initSweep() {
  $("sweep").addEventListener("click", (e) => {
    const cell = e.target.closest("[data-lookback]");
    if (!cell) return;
    setParams({ lookback: Number(cell.dataset.lookback), topN: Number(cell.dataset.top) });
  });
}
