import { market, findStock, QUADRANT_COLOR, rrgPoint, quadrantOf, LAST } from "../data/market.js";
import { periodReturn } from "../lib/math.js";
import { pct, shortDate, tone } from "../lib/format.js";
import { $, divergingFill } from "../lib/dom.js";
import { emit } from "../lib/events.js";
import { drawCandlePanel, miniVersus } from "../charts/candlePanel.js";
import { state } from "../state.js";

let openSymbol = null;

const rankBadge = (rs) => `<span class="rk" style="background:${divergingFill(rs - 50, 50)};color:#fff">${rs}</span>`;

function peersTable(stocks, highlight) {
  return `<table class="peers">${stocks
    .map((s) => `
      <tr data-open="${s.symbol}">
        <td>${s.symbol === highlight ? `<b>${s.symbol}</b>` : s.symbol}</td>
        <td class="num ${tone(periodReturn(s.close, state.days))}">${pct(periodReturn(s.close, state.days), 1)}</td>
        <td>${rankBadge(s.rs)}</td>
      </tr>`)
    .join("")}</table>`;
}

export function openStock(symbol) {
  const s = findStock(symbol);
  if (!s) return;
  openSymbol = symbol;
  state.selected = symbol;

  const days = state.days;
  const start = LAST + 1 - days;
  const price = s.close.slice(start);
  const benchmark = market.index.close.slice(start).map((v) => (v / market.index.close[start]) * price[0]);
  const rsLine = s.close.map((v, i) => v / market.index.close[i]).slice(start);
  const periodRet = periodReturn(s.close, days);
  const excess = periodRet - periodReturn(market.index.close, days);
  const watching = state.watchlist.has(symbol);
  const comparing = state.compare.includes(symbol);
  const peers = market.stocks.filter((x) => x.sector === s.sector).sort((a, b) => b.rs - a.rs);

  $("dbody").innerHTML = `
    <div class="m eyebrow">${s.sector} · <span style="color:${QUADRANT_COLOR[s.quadrant]}">${s.quadrant}</span></div>
    <h2 class="dtitle">${s.symbol} <span class="m">${s.name}</span></h2>
    <div class="num dprice">${s.last.toFixed(2)} <span class="${tone(s.change)}">${pct(s.change)}</span></div>
    <div class="dstats">
      <div><small>RS Rank</small><b>${s.rs}</b></div>
      <div><small>${days}D return</small><b class="${tone(periodRet)}">${pct(periodRet, 1)}</b></div>
      <div><small>vs Index</small><b class="${tone(excess)}">${pct(excess, 1)}</b></div>
      <div><small>Beta</small><b>${s.beta.toFixed(2)}</b></div>
      <div><small>From 52W Hi</small><b>${pct(s.fromHigh, 1)}</b></div>
      <div><small>Rel. Volume</small><b>${s.relVolume.toFixed(2)}×</b></div>
    </div>
    <div class="dactions">
      <button class="btn" data-watch="${symbol}">${watching ? "★ Watching" : "☆ Watch"}</button>
      <button class="btn" data-compare="${symbol}">${comparing ? "✓ Comparing" : "+ Compare"}</button>
    </div>
    <h3 class="dh">Candlestick · SMA 20/50 · Volume · RSI(14)</h3>
    <div id="ohlc" class="num ohlc"></div>
    <svg id="candles" width="100%" style="touch-action:none"></svg>
    <h3 class="dh">Price vs index <small class="m">(dashed = NIFTY 500 rebased)</small></h3>
    ${miniVersus(price, benchmark)}
    <h3 class="dh">Relative-strength line</h3>
    <div class="sub">Rising line = outperforming the market.</div>
    ${miniVersus(rsLine, rsLine.map(() => rsLine[0]), 110)}
    <h3 class="dh">Sector peers</h3>
    ${peersTable(peers, symbol)}`;

  drawCandlePanel($("candles"), s, {
    length: Math.min(Math.max(days, 42), 126),
    onReadout(bar) {
      $("ohlc").innerHTML = `
        <span class="m">${shortDate(market.dates[bar.date])}</span>
        O <b>${bar.open.toFixed(1)}</b> H <b>${bar.high.toFixed(1)}</b> L <b>${bar.low.toFixed(1)}</b>
        C <b class="${tone(bar.close - bar.open)}">${bar.close.toFixed(1)}</b>
        <span style="color:var(--acc)">SMA20 ${bar.sma20.toFixed(1)}</span>
        <span style="color:var(--vio)">SMA50 ${bar.sma50.toFixed(1)}</span>
        <span style="color:var(--warn)">RSI ${bar.rsi.toFixed(0)}</span>`;
    },
  });

  $("drawer").classList.add("open");
  emit("selection");
}

export function openSector(name) {
  openSymbol = null;
  const days = state.days;
  const series = market.sectorIndex[name].slice(-days);
  const benchmark = market.index.close.slice(-days).map((v, _, arr) => (v / arr[0]) * series[0]);
  const members = market.stocks.filter((s) => s.sector === name).sort((a, b) => periodReturn(b.close, days) - periodReturn(a.close, days));
  const r = periodReturn(market.sectorIndex[name], days);
  const quadrant = quadrantOf(rrgPoint(name, LAST));
  const breadth = Math.round((members.filter((s) => s.vs50 > 0).length / members.length) * 100);

  $("dbody").innerHTML = `
    <div class="m eyebrow">Sector · <span style="color:${QUADRANT_COLOR[quadrant]}">${quadrant}</span></div>
    <h2 class="dtitle">${name}</h2>
    <div class="dstats">
      <div><small>${days}D return</small><b class="${tone(r)}">${pct(r, 1)}</b></div>
      <div><small>vs Index</small><b class="${tone(r - periodReturn(market.index.close, days))}">${pct(r - periodReturn(market.index.close, days), 1)}</b></div>
      <div><small>% &gt; 50-DMA</small><b>${breadth}%</b></div>
    </div>
    ${miniVersus(series, benchmark, 200)}
    <h3 class="dh">Constituents</h3>
    ${peersTable(members)}`;

  $("drawer").classList.add("open");
}

export function closeDrawer() {
  openSymbol = null;
  state.selected = "";
  $("drawer").classList.remove("open");
  emit("selection");
}

/** Re-render the open stock panel (watch/compare state changed). */
export function refreshDrawer() {
  if (openSymbol && $("drawer").classList.contains("open")) openStock(openSymbol);
}

export function initDrawer() {
  $("dx").addEventListener("click", closeDrawer);
  $("dbody").addEventListener("click", (e) => {
    const target = e.target.closest("[data-open],[data-watch],[data-compare]");
    if (!target) return;
    if (target.dataset.open) openStock(target.dataset.open);
    if (target.dataset.watch) emit("toggle-watch", target.dataset.watch);
    if (target.dataset.compare) emit("toggle-compare", target.dataset.compare);
  });
}
