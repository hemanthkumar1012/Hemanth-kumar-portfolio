import { market, sectorNames } from "../data/market.js";
import { periodReturn } from "../lib/math.js";
import { pct } from "../lib/format.js";
import { $ } from "../lib/dom.js";
import { emit } from "../lib/events.js";
import { state } from "../state.js";

// ⌘K / "/" command palette: jump to any sector or stock.

let results = [];
let active = 0;

function search(text) {
  const q = text.toLowerCase();
  const sectors = sectorNames.map((name) => ({
    kind: "sector",
    id: name,
    hint: `Sector · ${pct(periodReturn(market.sectorIndex[name], state.days), 1)}`,
  }));
  const stocks = market.stocks.map((s) => ({ kind: "stock", id: s.symbol, hint: `${s.name} · RS ${s.rs}` }));

  return [...sectors, ...stocks]
    .filter((r) => !q || r.id.toLowerCase().includes(q) || r.hint.toLowerCase().includes(q))
    .slice(0, 30);
}

function render() {
  results = search($("palIn").value);
  active = Math.min(active, Math.max(0, results.length - 1));
  $("palList").innerHTML = results
    .map((r, i) => `<li class="${i === active ? "on" : ""}" data-index="${i}"><b>${r.id}</b><small>${r.hint}</small></li>`)
    .join("");
  $("palList").querySelector("li.on")?.scrollIntoView({ block: "nearest" });
}

function choose() {
  const pick = results[active];
  if (!pick) return;
  closePalette();
  emit(pick.kind === "sector" ? "open-sector" : "open-stock", pick.id);
}

export function openPalette() {
  $("pal").classList.add("open");
  $("palIn").value = "";
  active = 0;
  render();
  requestAnimationFrame(() => $("palIn").focus());
}

export function closePalette() {
  $("pal").classList.remove("open");
}

export function initPalette() {
  $("palIn").addEventListener("input", () => {
    active = 0;
    render();
  });

  $("palIn").addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") active = Math.min(results.length - 1, active + 1);
    else if (e.key === "ArrowUp") active = Math.max(0, active - 1);
    else if (e.key === "Enter") return choose();
    else if (e.key === "Escape") return closePalette();
    else return;
    e.preventDefault();
    render();
  });

  $("palList").addEventListener("click", (e) => {
    const li = e.target.closest("li[data-index]");
    if (!li) return;
    active = Number(li.dataset.index);
    choose();
  });

  $("pal").addEventListener("click", (e) => {
    if (e.target.id === "pal") closePalette();
  });
  $("palBtn").addEventListener("click", openPalette);
}
