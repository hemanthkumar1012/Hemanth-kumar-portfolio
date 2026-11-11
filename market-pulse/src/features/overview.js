import { market, LAST, sectorNames, rrgPoint, quadrantOf } from "../data/market.js";
import { periodReturn } from "../lib/math.js";
import { pct } from "../lib/format.js";
import { sparkline } from "../lib/svg.js";
import { $ } from "../lib/dom.js";
import { drawBreadthChart } from "../charts/breadthChart.js";
import { drawAdvanceDecline } from "../charts/advanceDecline.js";
import { state } from "../state.js";

export function renderKpis() {
  const { index, breadth, stocks, sectorIndex } = market;
  const days = state.days;
  const then = LAST - days;
  const recent = (series) => series.slice(-days);

  const advancers = stocks.filter((s) => s.change > 0).length;
  const decliners = stocks.length - advancers;
  const nearHigh = stocks.filter((s) => s.fromHigh > -0.02).length;
  const nearLow = stocks.filter((s) => s.nearLow).length;
  const breadthChange = breadth.above50[LAST] - breadth.above50[then];
  const dayChange = index.close[LAST] / index.close[LAST - 1] - 1;
  const leader = sectorNames
    .map((name) => ({ name, r: periodReturn(sectorIndex[name], days) }))
    .sort((a, b) => b.r - a.r)[0];

  const cards = [
    { label: "NIFTY 500 (sim)", value: index.close[LAST].toFixed(2), delta: pct(dayChange), up: dayChange >= 0, spark: recent(index.close) },
    { label: "Period return", value: pct(periodReturn(index.close, days)), delta: `${days} sessions`, up: periodReturn(index.close, days) >= 0, spark: recent(index.close) },
    { label: "% above 50-DMA", value: `${breadth.above50[LAST].toFixed(1)}%`, delta: `${breadthChange >= 0 ? "+" : ""}${breadthChange.toFixed(1)} pts`, up: breadthChange >= 0, spark: recent(breadth.above50) },
    { label: "Advancers / Decliners", value: `${advancers} / ${decliners}`, delta: `A/D ratio ${(advancers / Math.max(1, decliners)).toFixed(2)}`, up: advancers >= decliners, spark: recent(breadth.adLine) },
    { label: "Near 52W high / low", value: `${nearHigh} / ${nearLow}`, delta: "within 2%", up: nearHigh >= nearLow, spark: recent(breadth.above200) },
    { label: "Leading sector", value: leader.name, delta: pct(leader.r), up: true, spark: recent(sectorIndex[leader.name]) },
  ];

  $("kpis").innerHTML = cards
    .map((c) => `
      <div class="card kpi">
        <div class="lbl">${c.label}</div>
        <div class="v num">${c.value}</div>
        <div class="d num ${c.up ? "g" : "l"}">${c.delta}</div>
        ${sparkline(c.spark, { width: 64, height: 24, color: c.up ? "var(--gain)" : "var(--loss)" })}
      </div>`)
    .join("");
}

/** Plain-language reads generated from simple rules. Kept deliberately short. */
function insights() {
  const { index, breadth, stocks } = market;
  const days = state.days;
  const indexReturn = periodReturn(index.close, days);
  const breadthChange = breadth.above50[LAST] - breadth.above50[LAST - days];
  const out = [];

  if (indexReturn > 0 && breadthChange < 0) {
    out.push(["var(--loss)", `Index up <b class="g">${pct(indexReturn)}</b> but breadth fell <b class="l">${breadthChange.toFixed(1)} pts</b> — the rally is narrowing to fewer names.`]);
  } else if (indexReturn > 0) {
    out.push(["var(--gain)", `Rally is broad: index <b class="g">${pct(indexReturn)}</b> with breadth up <b class="g">+${breadthChange.toFixed(1)} pts</b>.`]);
  } else {
    const read = breadthChange >= 0 ? "breadth holding up — watch for a base" : "breadth confirming weakness";
    out.push(["var(--warn)", `Index <b class="l">${pct(indexReturn)}</b> over the period; ${read}.`]);
  }

  const byQuadrant = (q) => sectorNames.filter((name) => quadrantOf(rrgPoint(name, LAST)) === q);
  const improving = byQuadrant("Improving");
  const weakening = byQuadrant("Weakening");
  if (improving.length) out.push(["var(--acc)", `Rotating in: <b>${improving.join(", ")}</b> moved into the Improving quadrant.`]);
  if (weakening.length) out.push(["var(--warn)", `Losing momentum: <b>${weakening.join(", ")}</b> ${weakening.length > 1 ? "are" : "is"} weakening.`]);

  const leaders = [...stocks]
    .filter((s) => s.fromHigh > -0.05)
    .sort((a, b) => b.rs - a.rs)
    .slice(0, 3)
    .map((s) => s.symbol);
  out.push(["var(--vio)", `High-RS names near 52W highs: <b>${leaders.join(", ")}</b>.`]);
  return out;
}

export function renderBreadthPanel() {
  const start = market.index.close.length - state.days;
  const recent = (series) => series.slice(start);
  const { breadth } = market;

  const divergences = drawBreadthChart($("breadth"), {
    index: recent(market.index.close),
    above50: recent(breadth.above50),
    above200: recent(breadth.above200),
    netAdvances: recent(breadth.netAdvances),
    dates: recent(market.dates),
  });
  $("brTag").innerHTML = divergences
    ? `<span class="pill l">${divergences} divergence sessions</span>`
    : `<span class="pill g">Breadth confirming</span>`;

  drawAdvanceDecline($("ad"), {
    net: recent(breadth.netAdvances),
    line: recent(breadth.adLine),
    dates: recent(market.dates),
  });

  $("insights").innerHTML = insights()
    .map(([color, text]) => `<div><i style="--c:${color}"></i><span>${text}</span></div>`)
    .join("");
}
