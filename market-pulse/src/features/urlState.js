import { $ } from "../lib/dom.js";
import { findStock } from "../data/market.js";
import { state } from "../state.js";

/*
 * Persists the view in the URL hash so a link reproduces exactly what you see:
 *   #tf=126&q=realty+leading&sector=IT&cmp=DLF,LT&bt=63-3-21-10
 */

const VALID_DAYS = [21, 63, 126, 252];

export function readUrlState() {
  const params = new URLSearchParams(location.hash.slice(1));
  const patch = {};

  const days = Number(params.get("tf"));
  if (VALID_DAYS.includes(days)) state.days = days;

  if (params.get("q")) $("search").value = params.get("q");
  if (params.get("sector")) {
    state.sectorFilter = params.get("sector");
    $("fSec").value = state.sectorFilter;
  }
  if (params.get("cmp")) {
    state.compare = params.get("cmp").split(",").filter((sym) => findStock(sym)).slice(0, 5);
  }
  if (params.get("bt")) {
    const [lookback, topN, rebalance, costBps] = params.get("bt").split("-").map(Number);
    Object.assign(patch, { lookback, topN, rebalance, costBps });
  }
  return patch;
}

export function writeUrlState(backtestParams) {
  const params = new URLSearchParams();
  if (state.days !== 63) params.set("tf", state.days);
  if ($("search").value.trim()) params.set("q", $("search").value.trim());
  if (state.sectorFilter) params.set("sector", state.sectorFilter);
  if (state.compare.length) params.set("cmp", state.compare.join(","));
  if (backtestParams) {
    const { lookback, topN, rebalance, costBps } = backtestParams;
    params.set("bt", [lookback, topN, rebalance, costBps].join("-"));
  }
  const hash = params.toString();
  try {
    history.replaceState(null, "", hash ? `#${hash}` : location.pathname + location.search);
  } catch {
    // Sandboxed iframes (srcdoc previews, some embeds) forbid history changes.
    // The page still works; links just won't carry state there.
  }
}

export async function copyShareLink() {
  try {
    await navigator.clipboard.writeText(location.href);
    return true;
  } catch {
    return false;
  }
}
