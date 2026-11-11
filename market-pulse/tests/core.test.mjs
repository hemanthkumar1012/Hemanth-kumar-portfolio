import { test } from "node:test";
import assert from "node:assert/strict";

import { squarify } from "../src/charts/treemap.js";
import { rsi, smaAt, drawdowns, pearson } from "../src/lib/math.js";
import { parseQuery, matchesQuery } from "../src/features/query.js";
import { runBacktest } from "../src/features/backtest.js";
import { market } from "../src/data/market.js";

test("squarify fills the rectangle exactly", () => {
  const items = [6, 6, 4, 3, 2, 2, 1].map((value, i) => ({ value, id: i }));
  const rects = squarify(items, { x: 0, y: 0, w: 600, h: 400 });
  const area = rects.reduce((sum, r) => sum + r.w * r.h, 0);

  assert.equal(rects.length, items.length);
  assert.ok(Math.abs(area - 600 * 400) < 1e-6);
  for (const r of rects) {
    assert.ok(r.x >= -1e-9 && r.y >= -1e-9 && r.x + r.w <= 600 + 1e-6 && r.y + r.h <= 400 + 1e-6);
  }
});

test("squarify areas are proportional to values", () => {
  const rects = squarify([{ value: 3 }, { value: 1 }], { x: 0, y: 0, w: 100, h: 100 });
  const [big, small] = rects;
  assert.ok(Math.abs(big.w * big.h - 7500) < 1e-6);
  assert.ok(Math.abs(small.w * small.h - 2500) < 1e-6);
});

test("RSI stays in range and reads high on a steady climb", () => {
  const climb = Array.from({ length: 60 }, (_, i) => 100 + i);
  const values = rsi(climb);
  assert.ok(values.every((v) => v >= 0 && v <= 100));
  assert.ok(values.at(-1) > 95);
});

test("math helpers", () => {
  assert.equal(smaAt([1, 2, 3, 4], 2, 3), 3.5);
  assert.deepEqual(drawdowns([1, 1.2, 0.9, 1.3]).map((v) => +v.toFixed(2)), [0, 0, -0.25, 0]);
  assert.ok(Math.abs(pearson([1, 2, 3], [2, 4, 6]) - 1) < 1e-12);
});

test("query parser understands the screener mini-language", () => {
  const q = parseQuery("realty leading rs>80 near high vol>1.5");
  assert.equal(q.sector, "Realty");
  assert.equal(q.quadrant, "Leading");
  assert.deepEqual(q.rs, { op: ">", value: 80 });
  assert.deepEqual(q.relVolume, { op: ">", value: 1.5 });
  assert.equal(q.nearHigh, true);
  assert.deepEqual(q.terms, []);
});

test("query filters stocks consistently", () => {
  const q = parseQuery("rs>=90");
  const hits = market.stocks.filter((s) => matchesQuery(s, q));
  assert.ok(hits.length > 0);
  assert.ok(hits.every((s) => s.rs >= 90));
});

test("backtest has no look-ahead: future prices don't change past holdings", () => {
  const params = { lookback: 63, topN: 3, rebalance: 21, costBps: 10 };
  const base = runBacktest(params);

  // Corrupt the last 30 sessions of every sector. Holdings chosen before then must not move.
  const cutoff = market.index.close.length - 30;
  const tampered = {
    index: market.index,
    sectorIndex: Object.fromEntries(Object.entries(market.sectorIndex).map(([name, series]) => [
      name,
      series.map((v, i) => (i >= cutoff ? v * (1 + Math.sin(i + name.length)) : v)),
    ])),
  };
  const shifted = runBacktest(params, tampered);
  const lastSafe = cutoff - base.start - 1;

  for (let i = 0; i <= lastSafe; i++) {
    assert.deepEqual(shifted.holdings[i], base.holdings[i], `holdings diverged at step ${i}`);
    assert.equal(shifted.equity[i], base.equity[i]);
  }
});

test("higher costs never improve the result", () => {
  const cheap = runBacktest({ lookback: 42, topN: 2, rebalance: 10, costBps: 0 }).stats.total;
  const pricey = runBacktest({ lookback: 42, topN: 2, rebalance: 10, costBps: 50 }).stats.total;
  assert.ok(pricey < cheap);
});
