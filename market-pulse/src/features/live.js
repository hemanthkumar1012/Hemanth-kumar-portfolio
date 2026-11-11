import { market, rng, refreshDerived, LAST } from "../data/market.js";
import { pct, tone, clockTime } from "../lib/format.js";
import { $ } from "../lib/dom.js";
import { emit } from "../lib/events.js";
import { state } from "../state.js";
import { toast } from "./toasts.js";

const TICK_MS = 1500;
const TICKS_PER_BATCH = 12;
const ALERT_CHANCE = 0.35;

let timer = null;

export const isLive = () => timer !== null;

function tick() {
  state.flash = {};
  for (let k = 0; k < TICKS_PER_BATCH; k++) {
    const stock = market.stocks[Math.floor(rng.next() * market.stocks.length)];
    const previous = stock.close[LAST];
    const price = previous * (1 + rng.gauss() * 0.0025);
    stock.close[LAST] = price;
    stock.high[LAST] = Math.max(stock.high[LAST], price);
    stock.low[LAST] = Math.min(stock.low[LAST], price);
    refreshDerived(stock);
    state.flash[stock.symbol] = price >= previous ? "fu" : "fd";
  }

  $("sbUpd").textContent = `Last update ${clockTime()}`;
  renderTape();
  emit("tick");

  if (rng.next() < ALERT_CHANCE) {
    const movers = [...market.stocks].sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 5);
    const s = movers[Math.floor(rng.next() * movers.length)];
    toast(
      `${s.symbol} ${s.change >= 0 ? "surging" : "sliding"} ${pct(s.change)}`,
      `${s.sector} · RS ${s.rs} · ${s.last.toFixed(2)}`,
      s.change >= 0 ? "var(--gain)" : "var(--loss)"
    );
  }
}

export function renderTape() {
  const items = [...market.stocks]
    .sort((a, b) => b.marketCap - a.marketCap)
    .slice(0, 24)
    .map((s) => `<span><b>${s.symbol}</b><span class="num ${tone(s.change)}">${s.last.toFixed(1)} ${pct(s.change)}</span></span>`)
    .join("");
  // Doubled so the CSS marquee can loop seamlessly.
  $("tape").innerHTML = items + items;
}

export function toggleLive() {
  const button = $("live");
  if (timer) {
    clearInterval(timer);
    timer = null;
    button.classList.remove("on");
    toast("Live mode paused", "Prices frozen at last tick", "var(--mut)");
    return;
  }
  timer = setInterval(tick, TICK_MS);
  button.classList.add("on");
  toast("Live mode on", `Streaming simulated ticks every ${TICK_MS / 1000}s`, "var(--gain)");
}
