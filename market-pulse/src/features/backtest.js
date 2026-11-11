import { market } from "../data/market.js";
import { mean, stdev, dailyReturns, drawdowns } from "../lib/math.js";
import { pct, tone } from "../lib/format.js";
import { $ } from "../lib/dom.js";
import { emit } from "../lib/events.js";
import { drawEquity } from "../charts/lineCharts.js";

const TRADING_DAYS = 252;
const WARMUP = 130; // enough history for the longest lookback on the slider

/**
 * Top-N sector rotation, equal weight.
 *
 * Ranking at session `i` only uses closes up to `i - 1`, so there is no
 * look-ahead. Costs are charged on turnover at each rebalance, both legs.
 */
export function runBacktest({ lookback, topN, rebalance, costBps }, data = market) {
  const { sectorIndex, index } = data;
  const names = Object.keys(sectorIndex);
  const sessions = index.close.length;
  const start = Math.max(WARMUP, lookback + 1);

  let equity = 1;
  let equalWeight = 1;
  let holdings = [];
  let trades = 0;
  let periods = 0;
  let winningPeriods = 0;
  let periodStartEquity = 1;

  const curve = [];
  const bench = [];
  const ew = [];
  const held = [];

  for (let i = start; i < sessions; i++) {
    if ((i - start) % rebalance === 0) {
      const excess = (name) =>
        sectorIndex[name][i - 1] / sectorIndex[name][i - 1 - lookback] -
        index.close[i - 1] / index.close[i - 1 - lookback];
      const next = [...names].sort((a, b) => excess(b) - excess(a)).slice(0, topN);
      const swapped = next.filter((name) => !holdings.includes(name)).length;

      if (holdings.length) {
        periods++;
        if (equity > periodStartEquity) winningPeriods++;
      }
      periodStartEquity = equity;
      equity *= 1 - (swapped / topN) * (costBps / 1e4) * 2;
      trades += swapped;
      holdings = next;
    }

    const dayReturn = (name) => sectorIndex[name][i] / sectorIndex[name][i - 1] - 1;
    equity *= 1 + mean(holdings.map(dayReturn));
    equalWeight *= 1 + mean(names.map(dayReturn));

    curve.push(equity);
    bench.push(index.close[i] / index.close[start - 1]);
    ew.push(equalWeight);
    held.push(holdings);
  }

  const returns = dailyReturns([1, ...curve]);
  const volatility = stdev(returns);
  const dd = drawdowns(curve);
  const years = curve.length / TRADING_DAYS;
  const total = curve[curve.length - 1] - 1;

  return {
    start,
    equity: curve,
    benchmark: bench,
    equalWeight: ew,
    drawdown: dd,
    holdings: held,
    stats: {
      total,
      cagr: Math.pow(1 + total, 1 / years) - 1,
      excess: curve[curve.length - 1] - bench[bench.length - 1],
      sharpe: volatility ? (mean(returns) / volatility) * Math.sqrt(TRADING_DAYS) : 0,
      maxDrawdown: Math.min(...dd),
      winRate: periods ? winningPeriods / periods : 0,
      trades,
    },
  };
}

const SLIDERS = {
  pL: { key: "lookback", format: (v) => `${v}d` },
  pN: { key: "topN", format: (v) => `${v}` },
  pR: { key: "rebalance", format: (v) => `${v}d` },
  pC: { key: "costBps", format: (v) => `${v} bps` },
};

export function currentParams() {
  const params = {};
  for (const [id, { key }] of Object.entries(SLIDERS)) params[key] = Number($(id).value);
  return params;
}

export function setParams(partial) {
  for (const [id, { key }] of Object.entries(SLIDERS)) {
    if (partial[key] !== undefined) $(id).value = partial[key];
  }
  renderBacktest();
  emit("backtest");
}

export function renderBacktest() {
  const params = currentParams();
  for (const [id, { key, format }] of Object.entries(SLIDERS)) $(`v${id.slice(1)}`).textContent = format(params[key]);

  const result = runBacktest(params);
  const s = result.stats;
  const metrics = [
    ["Total return", pct(s.total, 1), tone(s.total)],
    ["CAGR", pct(s.cagr, 1), tone(s.cagr)],
    ["vs NIFTY 500", pct(s.excess, 1), tone(s.excess)],
    ["Sharpe", s.sharpe.toFixed(2), s.sharpe >= 1 ? "g" : s.sharpe < 0 ? "l" : ""],
    ["Max drawdown", pct(s.maxDrawdown, 1), "l"],
    ["Win rate", `${(s.winRate * 100).toFixed(0)}%`, s.winRate >= 0.5 ? "g" : "l"],
  ];

  $("mets").innerHTML = metrics.map(([label, value, cls]) => `<div><small>${label}</small><b class="${cls}">${value}</b></div>`).join("");
  $("hold").innerHTML = result.holdings[result.holdings.length - 1].map((name) => `<span>${name}</span>`).join("");
  $("btTag").innerHTML = `
    <span class="pill ${s.excess >= 0 ? "g" : "l"}">${s.excess >= 0 ? "Beat" : "Lagged"} index by ${pct(Math.abs(s.excess), 1).slice(1)}</span>
    <span class="pill n">${s.trades} trades</span>`;

  drawEquity($("btEq"), $("btDd"), result, market.dates, (i) => result.holdings[i]);
}

export function initBacktest() {
  for (const id of Object.keys(SLIDERS)) {
    $(id).addEventListener("input", () => {
      renderBacktest();
      emit("backtest");
    });
  }
}
