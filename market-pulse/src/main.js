import { market, findStock, sectorNames } from "./data/market.js";
import { periodReturn } from "./lib/math.js";
import { pct } from "./lib/format.js";
import { $, $$, debounce } from "./lib/dom.js";
import { on } from "./lib/events.js";
import { state } from "./state.js";

import { renderKpis, renderBreadthPanel } from "./features/overview.js";
import { renderRrg, renderSectorHeat, initSectorHeat, renderMarketMap, initMarketMap, renderRegime, renderCorrelation } from "./features/sectors.js";
import { renderRotation, initRotation } from "./features/rotation.js";
import { renderScreener, initScreener, toggleWatch, moveSelection } from "./features/screener.js";
import { enhanceSelect, closeAllSelects } from "./features/customSelect.js";
import { openStock, openSector, closeDrawer, refreshDrawer, initDrawer } from "./features/drawer.js";
import { renderBacktest, initBacktest, currentParams, setParams } from "./features/backtest.js";
import { renderSweep, initSweep } from "./features/sweep.js";
import { renderCompare, initCompare, seedCompare, toggleCompare } from "./features/compare.js";
import { openPalette, closePalette, initPalette } from "./features/palette.js";
import { toggleLive, renderTape } from "./features/live.js";
import { initEffects, dismissSplash, countUp, drawLinesIn } from "./features/effects.js";
import { readUrlState, writeUrlState, copyShareLink } from "./features/urlState.js";
import { toast } from "./features/toasts.js";

const QUADRANT_HINTS = {
  "": "Show every quadrant",
  Leading: "Outperforming, momentum rising",
  Improving: "Lagging but momentum turning up",
  Weakening: "Still strong, momentum fading",
  Lagging: "Underperforming, momentum falling",
};
const RS_HINTS = { 0: "No RS filter", 80: "Top 20% of the universe", 90: "Top 10% — market leaders" };

const selects = [];

function setupSelects() {
  selects.push(
    enhanceSelect($("fSec"), {
      icon: "▦",
      headings: { IT: "Sectors" },
      describe: (v) => {
        if (!v) return `All ${market.stocks.length} stocks in the universe`;
        const count = market.stocks.filter((s) => s.sector === v).length;
        return `${count} stocks · ${pct(periodReturn(market.sectorIndex[v], state.days), 1)} over period`;
      },
    }),
    enhanceSelect($("fQ"), { icon: "◎", headings: { Leading: "Rotation quadrant" }, describe: (v) => QUADRANT_HINTS[v] }),
    enhanceSelect($("fRS"), { icon: "↗", headings: { 80: "Relative strength" }, describe: (v) => RS_HINTS[v] }),
    enhanceSelect($("fW"), {
      icon: "★",
      describe: (v) => (v ? `${state.watchlist.size} starred · press w on a row` : "Every stock"),
    })
  );
}

const syncSelects = () => selects.forEach((s) => s.sync());
const saveUrl = debounce(() => writeUrlState(currentParams()), 250);

function renderAll() {
  renderRotation();
  renderKpis();
  renderMarketMap();
  renderRegime();
  renderCorrelation();
  renderBreadthPanel();
  renderRrg();
  renderSectorHeat();
  renderBacktest();
  renderSweep();
  renderCompare();
  renderScreener();
  syncSelects();
}

function setTimeframe(days, { announce = true } = {}) {
  state.days = days;
  $$("#tf button").forEach((b) => b.classList.toggle("on", Number(b.dataset.d) === days));
  renderAll();
  countUp();
  drawLinesIn();
  saveUrl();
  if (announce) toast(`Timeframe: ${days === 252 ? "1Y" : `${Math.round(days / 21)}M`}`, `${days} sessions · every view recalculated`);
}

function wireEvents() {
  on("open-stock", openStock);
  on("open-sector", openSector);
  on("selection", renderScreener);

  on("filters", () => {
    $("fSec").value = state.sectorFilter;
    renderScreener();
    renderRrg();
    syncSelects();
    saveUrl();
  });

  on("toggle-watch", toggleWatch);
  on("watchlist", () => {
    renderScreener();
    syncSelects();
    refreshDrawer();
  });

  on("toggle-compare", toggleCompare);
  on("compare", () => {
    renderCompare();
    refreshDrawer();
    saveUrl();
  });

  on("backtest", () => {
    renderSweep();
    saveUrl();
  });

  on("tick", renderScreener);
}

function wireChrome() {
  $$("#tf button").forEach((b) => b.addEventListener("click", () => setTimeframe(Number(b.dataset.d))));
  $("theme").addEventListener("click", () => document.body.classList.toggle("light"));
  $("live").addEventListener("click", toggleLive);
  $("share").addEventListener("click", async () => {
    writeUrlState(currentParams());
    const copied = await copyShareLink();
    toast(copied ? "Link copied" : "Copy failed", copied ? "Filters, timeframe, compare and backtest settings are in the URL" : "Copy the address bar instead");
  });

  // Nav dropdown items carry their action in data attributes.
  document.addEventListener("click", (e) => {
    const item = e.target.closest("[data-go],[data-action]");
    if (item?.dataset.go) {
      $(item.dataset.go)?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.activeElement?.blur();
    }
    if (item?.dataset.action === "palette") openPalette();
    if (item?.dataset.action === "live") toggleLive();
    closeAllSelects();
  });

  addEventListener("resize", debounce(renderAll, 150));
}

function wireKeyboard() {
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openPalette();
      return;
    }
    if (e.key === "Escape") {
      closePalette();
      closeAllSelects();
      closeDrawer();
      return;
    }
    if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;

    switch (e.key) {
      case "/":
        e.preventDefault();
        openPalette();
        break;
      case "1":
      case "2":
      case "3":
      case "4":
        setTimeframe([21, 63, 126, 252][Number(e.key) - 1]);
        break;
      case "j":
        moveSelection(1);
        break;
      case "k":
        moveSelection(-1);
        break;
      case "Enter":
        if (state.selected) openStock(state.selected);
        break;
      case "w":
        if (state.selected) toggleWatch(state.selected);
        break;
      default:
    }
  });
}

function boot() {
  initScreener();
  setupSelects();
  initRotation();
  initSectorHeat();
  initMarketMap(findStock);
  initDrawer();
  initBacktest();
  initSweep();
  initCompare();
  initPalette();

  const backtestFromUrl = readUrlState();
  seedCompare();
  if (Object.values(backtestFromUrl).every(Number.isFinite) && Object.keys(backtestFromUrl).length) {
    for (const [id, key] of [["pL", "lookback"], ["pN", "topN"], ["pR", "rebalance"], ["pC", "costBps"]]) {
      $(id).value = backtestFromUrl[key];
    }
  }

  wireEvents();
  wireChrome();
  wireKeyboard();

  renderTape();
  setTimeframe(state.days, { announce: false });
  initEffects();
  dismissSplash();

  $("statsLine").textContent = `${market.stocks.length} stocks · ${sectorNames.length} sectors`;
}

boot();

// Exposed for poking around in DevTools.
window.marketPulse = { market, state, setParams };
