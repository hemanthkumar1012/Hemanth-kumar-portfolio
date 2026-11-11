import { market, findStock } from "../data/market.js";
import { periodReturn } from "../lib/math.js";
import { pct, tone } from "../lib/format.js";
import { $ } from "../lib/dom.js";
import { emit } from "../lib/events.js";
import { drawComparison } from "../charts/lineCharts.js";
import { state } from "../state.js";
import { toast } from "./toasts.js";

const MAX_COMPARE = 5;
const PALETTE = ["#ffffff", "#a3a3a3", "#4ade80", "#f87171", "#737373"];

export function seedCompare() {
  if (state.compare.length) return;
  state.compare = [...market.stocks].sort((a, b) => b.rs - a.rs).slice(0, 3).map((s) => s.symbol);
}

export function toggleCompare(symbol) {
  const has = state.compare.includes(symbol);
  if (has) {
    state.compare = state.compare.filter((s) => s !== symbol);
  } else {
    if (state.compare.length >= MAX_COMPARE) state.compare.shift();
    state.compare.push(symbol);
  }
  toast(has ? `${symbol} removed from Compare` : `${symbol} added to Compare`, `${state.compare.length} of ${MAX_COMPARE} slots used`);
  emit("compare");
}

export function renderCompare() {
  const days = state.days;
  const start = market.index.close.length - days;
  const chip = (label, color, value, removable) => `
    <span style="--c:${color}"><i></i>${label}
      <b class="num ${tone(value)}">${pct(value, 1)}</b>
      ${removable ? `<button data-remove="${label}" aria-label="Remove ${label}">×</button>` : ""}
    </span>`;

  $("cmpChips").innerHTML =
    state.compare.map((sym, i) => chip(sym, PALETTE[i], periodReturn(findStock(sym).close, days), true)).join("") +
    chip("NIFTY 500", "#555", periodReturn(market.index.close, days), false);

  const rebase = (series) => series.slice(start).map((v) => (v / series[start]) * 100);
  drawComparison($("cmpSvg"), {
    series: state.compare.map((sym, i) => ({ label: sym, color: PALETTE[i], values: rebase(findStock(sym).close) })),
    benchmark: rebase(market.index.close),
    dates: market.dates,
    start,
  });
}

export function initCompare() {
  $("cmpChips").addEventListener("click", (e) => {
    const button = e.target.closest("[data-remove]");
    if (button) toggleCompare(button.dataset.remove);
  });
}
