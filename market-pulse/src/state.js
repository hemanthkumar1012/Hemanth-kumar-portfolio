const WATCHLIST_KEY = "marketPulse.watchlist";

function readWatchlist() {
  try {
    return new Set(JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]"));
  } catch {
    // Storage can be blocked (private mode, sandboxed iframes). Not worth failing over.
    return new Set();
  }
}

export const state = {
  days: 63, // window used by every "period" number on the page
  sectorFilter: "",
  selected: "", // symbol highlighted in the screener
  sort: { key: "rs", asc: false },
  compare: [],
  watchlist: readWatchlist(),
  flash: {}, // symbol -> "fu" | "fd" after a live tick
};

export function persistWatchlist() {
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify([...state.watchlist]));
  } catch {
    /* see readWatchlist */
  }
}
