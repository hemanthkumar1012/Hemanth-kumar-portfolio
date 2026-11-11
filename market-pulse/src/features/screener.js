import { market, sectorNames, QUADRANT_COLOR } from "../data/market.js";
import { periodReturn } from "../lib/math.js";
import { pct, crore, tone } from "../lib/format.js";
import { $, $$, divergingFill } from "../lib/dom.js";
import { sparkline } from "../lib/svg.js";
import { emit } from "../lib/events.js";
import { state, persistWatchlist } from "../state.js";
import { parseQuery, matchesQuery } from "./query.js";

const COLUMNS = [
  { key: "symbol", label: "Symbol" },
  { key: "sector", label: "Sector" },
  { key: "last", label: "Price" },
  { key: "change", label: "1D" },
  { key: "periodReturn", label: "Period" },
  { key: "rs", label: "RS Rank" },
  { key: "quadrant", label: "Quadrant" },
  { key: "vs50", label: "vs 50-DMA" },
  { key: "fromHigh", label: "From 52W Hi" },
  { key: "relVolume", label: "Rel. Vol" },
  { key: "marketCap", label: "Mkt Cap" },
  { key: null, label: "Trend" },
];

export function visibleRows() {
  const query = parseQuery($("search").value);
  const sector = $("fSec").value;
  const quadrant = $("fQ").value;
  const minRs = Number($("fRS").value);
  const watchOnly = $("fW").value === "w";
  const { key, asc } = state.sort;

  return market.stocks
    .map((s) => {
      s.periodReturn = periodReturn(s.close, state.days);
      return s;
    })
    .filter((s) =>
      (!sector || s.sector === sector) &&
      (!quadrant || s.quadrant === quadrant) &&
      s.rs >= minRs &&
      (!watchOnly || state.watchlist.has(s.symbol)) &&
      matchesQuery(s, query))
    .sort((a, b) => {
      const order = typeof a[key] === "string" ? a[key].localeCompare(b[key]) : a[key] - b[key];
      return asc ? order : -order;
    });
}

function rowHtml(s, maxPeriod) {
  const watched = state.watchlist.has(s.symbol);
  const flash = state.flash[s.symbol] || "";
  const barColor = s.periodReturn >= 0 ? "var(--gain)" : "var(--loss)";

  return `
    <tr data-symbol="${s.symbol}" class="${s.symbol === state.selected ? "sel" : ""}">
      <td><span class="star ${watched ? "on" : ""}" data-watch="${s.symbol}">${watched ? "★" : "☆"}</span><b>${s.symbol}</b><div class="m sub-name">${s.name}</div></td>
      <td class="m">${s.sector}</td>
      <td class="num ${flash}">${s.last.toFixed(2)}</td>
      <td class="num ${tone(s.change)} ${flash}">${pct(s.change)}</td>
      <td class="num ${tone(s.periodReturn)}">${pct(s.periodReturn, 1)}<span class="bar" style="width:${(Math.abs(s.periodReturn) / maxPeriod) * 40}px;background:${barColor}"></span></td>
      <td><span class="rk" style="background:${divergingFill(s.rs - 50, 50)};color:#fff">${s.rs}</span></td>
      <td><span class="qd" style="color:${QUADRANT_COLOR[s.quadrant]};background:var(--panel2)">${s.quadrant}</span></td>
      <td class="num ${tone(s.vs50)}">${pct(s.vs50, 1)}</td>
      <td class="num ${s.fromHigh > -0.05 ? "g" : "m"}">${pct(s.fromHigh, 1)}</td>
      <td class="num" style="color:${s.relVolume > 1.5 ? "var(--warn)" : "inherit"}">${s.relVolume.toFixed(2)}×</td>
      <td class="num m">${crore(s.marketCap)}</td>
      <td>${sparkline(s.close.slice(-state.days), { width: 64, height: 20, color: barColor })}</td>
    </tr>`;
}

export function renderScreener() {
  const rows = visibleRows();
  const maxPeriod = Math.max(...rows.map((s) => Math.abs(s.periodReturn)), 0.01);

  $$("#tbl th").forEach((th) => {
    const active = th.dataset.key === state.sort.key;
    th.className = active ? `s${state.sort.asc ? " asc" : ""}` : "";
  });
  $("tbl").querySelector("tbody").innerHTML = rows.map((s) => rowHtml(s, maxPeriod)).join("");
  $("cnt").textContent = `${rows.length} of ${market.stocks.length} stocks`;
  $("qtag").innerHTML = parseQuery($("search").value).tags.map((t) => `<span>${t}</span>`).join("");
}

export function toggleWatch(symbol) {
  if (state.watchlist.has(symbol)) state.watchlist.delete(symbol);
  else state.watchlist.add(symbol);
  persistWatchlist();
  emit("watchlist", symbol);
}

export function moveSelection(step) {
  const rows = visibleRows();
  if (!rows.length) return;
  const current = rows.findIndex((s) => s.symbol === state.selected);
  const next = Math.max(0, Math.min(rows.length - 1, current + step));
  state.selected = rows[next].symbol;
  renderScreener();
  $("tbl").querySelector("tr.sel")?.scrollIntoView({ block: "nearest" });
}

function exportCsv() {
  const header = ["Symbol", "Name", "Sector", "Price", "1D %", "Period %", "RS", "Quadrant", "vs 50DMA %", "From 52W High %", "Rel Vol"];
  const lines = visibleRows().map((s) => [
    s.symbol,
    `"${s.name}"`,
    s.sector,
    s.last.toFixed(2),
    (s.change * 100).toFixed(2),
    (s.periodReturn * 100).toFixed(2),
    s.rs,
    s.quadrant,
    (s.vs50 * 100).toFixed(2),
    (s.fromHigh * 100).toFixed(2),
    s.relVolume.toFixed(2),
  ].join(","));

  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" }));
  link.download = `rs_screener_${state.days}d.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function initScreener() {
  $("tbl").querySelector("thead").innerHTML =
    `<tr>${COLUMNS.map((c) => `<th${c.key ? ` data-key="${c.key}"` : ""}>${c.label}</th>`).join("")}</tr>`;

  $("tbl").querySelector("thead").addEventListener("click", (e) => {
    const key = e.target.closest("th")?.dataset.key;
    if (!key) return;
    state.sort = { key, asc: state.sort.key === key ? !state.sort.asc : false };
    renderScreener();
  });

  $("tbl").querySelector("tbody").addEventListener("click", (e) => {
    const star = e.target.closest("[data-watch]");
    if (star) {
      toggleWatch(star.dataset.watch);
      return;
    }
    const row = e.target.closest("tr[data-symbol]");
    if (row) emit("open-stock", row.dataset.symbol);
  });

  for (const name of sectorNames) $("fSec").insertAdjacentHTML("beforeend", `<option>${name}</option>`);

  for (const id of ["search", "fSec", "fQ", "fRS", "fW"]) {
    $(id).addEventListener("input", () => {
      if (id === "fSec") state.sectorFilter = $("fSec").value;
      emit("filters");
    });
  }

  $("csv").addEventListener("click", exportCsv);
}
