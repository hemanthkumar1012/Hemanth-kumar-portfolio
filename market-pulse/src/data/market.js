import { createRng } from "../lib/rng.js";
import { smaAt, ema, periodReturn } from "../lib/math.js";
import { SECTORS, SECTOR_DRIFT, CONSTITUENTS } from "./universe.js";

/*
 * Simulated market. Everything downstream only reads `market`, so swapping this
 * module for a real feed (NSE bhavcopy, a broker API) leaves the UI untouched.
 */

export const SESSIONS = 260;
export const LAST = SESSIONS - 1;
export const rng = createRng(20261111);

function tradingDays(count, end) {
  const days = [];
  const cursor = new Date(end);
  while (days.length < count) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) days.unshift(new Date(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return days;
}

function simulateIndex() {
  const close = [100];
  for (let i = 1; i < SESSIONS; i++) {
    const correction = i > 190 && i < 215 ? -0.002 : 0;
    close.push(close[i - 1] * (1 + 0.0007 + 0.008 * rng.gauss() + correction));
  }
  return close;
}

/** Fabricates open/high/low around a close series. */
function candlesFor(close, { gap, wick }) {
  const open = [];
  const high = [];
  const low = [];
  close.forEach((c, i) => {
    const o = i ? close[i - 1] * (1 + rng.gauss() * gap) : c;
    open.push(o);
    high.push(Math.max(o, c) * (1 + rng.next() * wick));
    low.push(Math.min(o, c) * (1 - rng.next() * wick));
  });
  return { open, high, low };
}

function simulateStock([symbol, name], sector, indexReturns) {
  const beta = 0.7 + rng.next() * 0.7;
  const alpha = SECTOR_DRIFT[sector] + (rng.next() - 0.5) * 0.0012;
  const vol = 0.008 + rng.next() * 0.012;

  const close = [100 + rng.next() * 3900];
  for (let i = 1; i < SESSIONS; i++) {
    close.push(close[i - 1] * (1 + alpha + beta * indexReturns[i] + vol * rng.gauss()));
  }

  return {
    symbol,
    name,
    sector,
    beta,
    close,
    volume: close.map(() => Math.round((2e5 + rng.next() * 5e6) * (0.6 + rng.next() * 0.8))),
    marketCap: Math.round(5e3 + rng.next() * 1.8e6),
  };
}

function rebasedAverage(members) {
  return Array.from(
    { length: SESSIONS },
    (_, i) => (members.reduce((sum, s) => sum + s.close[i] / s.close[0], 0) / members.length) * 100
  );
}

function computeBreadth(stocks) {
  const above50 = [];
  const above200 = [];
  const netAdvances = [];
  const adLine = [];
  let cumulative = 0;

  for (let i = 0; i < SESSIONS; i++) {
    let a50 = 0;
    let a200 = 0;
    let up = 0;
    for (const s of stocks) {
      if (s.close[i] > smaAt(s.close, 50, i)) a50++;
      if (s.close[i] > smaAt(s.close, 200, i)) a200++;
      if (i && s.close[i] > s.close[i - 1]) up++;
    }
    above50.push((a50 / stocks.length) * 100);
    above200.push((a200 / stocks.length) * 100);

    // Scaled up so the counts feel like a ~500-stock universe.
    const net = i ? (2 * up - stocks.length) * 6 + Math.round(rng.gauss() * 20) : 0;
    netAdvances.push(net);
    cumulative += net;
    adLine.push(cumulative);
  }
  return { above50, above200, netAdvances, adLine };
}

const indexClose = simulateIndex();
const indexReturns = indexClose.map((v, i) => (i ? v / indexClose[i - 1] - 1 : 0));

const allStocks = [];
for (const [sector] of SECTORS) {
  for (const entry of CONSTITUENTS[sector]) {
    const stock = simulateStock(entry, sector, indexReturns);
    Object.assign(stock, candlesFor(stock.close, { gap: 0.003, wick: 0.009 }));
    allStocks.push(stock);
  }
}

export const sectorNames = SECTORS.map(([name]) => name);
export const sectorColor = Object.fromEntries(SECTORS);

export const market = {
  dates: tradingDays(SESSIONS, new Date(2026, 10, 11)),
  index: {
    close: indexClose,
    ...candlesFor(indexClose, { gap: 0.0025, wick: 0.006 }),
    volume: indexClose.map(() => Math.round((4e6 + rng.next() * 3e6) * (rng.next() < 0.06 ? 2.4 : 1))),
    ema50: ema(indexClose, 50),
  },
  stocks: allStocks,
  sectorIndex: Object.fromEntries(
    sectorNames.map((name) => [name, rebasedAverage(allStocks.filter((s) => s.sector === name))])
  ),
  breadth: computeBreadth(allStocks),
};

const bySymbol = new Map(allStocks.map((s) => [s.symbol, s]));
export const findStock = (symbol) => bySymbol.get(symbol);

// ---- Relative Rotation Graph ------------------------------------------------

const rsCache = new Map();

function smoothedRs(sector) {
  if (!rsCache.has(sector)) {
    const raw = market.sectorIndex[sector].map((v, i) => (v / indexClose[i]) * 100);
    rsCache.set(sector, raw.map((_, i) => smaAt(raw, 20, i)));
  }
  return rsCache.get(sector);
}

/**
 * JdK-style approximation. RS-Ratio: the RS line against its own 50-day mean.
 * RS-Momentum: the 10-session change in RS-Ratio. The RS line is smoothed over 20 sessions. Both centred on 100.
 */
export function rrgPoint(sector, i) {
  const rs = smoothedRs(sector);
  const ratioAt = (k) => 100 + (rs[k] / smaAt(rs, 50, k) - 1) * 320;
  // Average the ratio over a few sessions so weekly trail points don't zig-zag.
  const smoothRatio = (k) => (ratioAt(k) + ratioAt(k - 1) + ratioAt(k - 2)) / 3;
  const ratio = smoothRatio(i);
  return { x: ratio, y: 100 + (ratio - smoothRatio(i - 10)) * 1.6 };
}

export function quadrantOf({ x, y }) {
  if (x >= 100) return y >= 100 ? "Leading" : "Weakening";
  return y >= 100 ? "Improving" : "Lagging";
}

export const QUADRANT_COLOR = {
  Leading: "var(--gain)",
  Weakening: "var(--warn)",
  Lagging: "var(--loss)",
  Improving: "var(--acc)",
};

// ---- Per-stock derived fields ---------------------------------------------

/** Recomputes the fields that depend on the latest bar. Called again on live ticks. */
export function refreshDerived(stock) {
  const c = stock.close;
  stock.last = c[LAST];
  stock.change = c[LAST] / c[LAST - 1] - 1;
  stock.vs50 = stock.last / smaAt(c, 50, LAST) - 1;
  stock.fromHigh = stock.last / Math.max(...c.slice(-252)) - 1;
  stock.nearLow = stock.last <= Math.min(...c.slice(-252)) * 1.02;
  const avgVolume = stock.volume.slice(-20).reduce((a, b) => a + b, 0) / 20;
  stock.relVolume = stock.volume[LAST] / avgVolume;
}

function rankRelativeStrength() {
  // IBD-style weighting: the latest quarter counts double.
  for (const s of allStocks) {
    s.rsScore =
      0.4 * periodReturn(s.close, 63) +
      0.2 * periodReturn(s.close, 126) +
      0.2 * periodReturn(s.close, 189) +
      0.2 * periodReturn(s.close, 252);
  }
  const ordered = [...allStocks].sort((a, b) => a.rsScore - b.rsScore);
  ordered.forEach((s, i) => {
    s.rs = Math.max(1, Math.round((i / (ordered.length - 1)) * 99));
  });
}

rankRelativeStrength();
for (const stock of allStocks) {
  refreshDerived(stock);
  stock.quadrant = quadrantOf(rrgPoint(stock.sector, LAST));
}
