# Market Pulse

A market analytics dashboard for Indian equities: breadth, sector rotation, relative strength and a sector-rotation backtester, on one page.

Built with vanilla ES modules and hand-written SVG. No frameworks or chart libraries, nothing to install at runtime.

> **Data note:** prices are simulated from a seeded random walk (`src/data/market.js`) so the project runs anywhere without an API key. Everything downstream reads a single `market` object, so swapping in a real feed doesn't touch the UI.

## Features

| Area | What it does |
| --- | --- |
| **Rotation dashboard** | Index candles with EMA 50, plus a sector ranking table (score, Δ1W/Δ4W, RS 1M/3M, RVOL, state) |
| **Market map** | Squarified treemap of every stock, sized by market cap, coloured by period return |
| **Regime gauge** | 0–100 composite of five breadth and trend signals → risk-on / neutral / risk-off |
| **Breadth** | Index vs % above 50/200-DMA with divergence shading, A/D bars and line, rule-based insights |
| **RRG** | Relative Rotation Graph with 8-week trails; click a sector to filter the screener |
| **Correlation** | Sector return correlation matrix and the best diversifying pair |
| **Backtester** | Top-N sector rotation with lookback, rebalance and cost sliders; equity, drawdown, Sharpe, CAGR, win rate |
| **Parameter sweep** | Sharpe across a lookback × top-N grid; click a cell to load it |
| **Compare** | Up to five stocks rebased to 100 against the index |
| **Screener** | Sortable RS table, smart search (`realty leading rs>80 near high`), watchlist, CSV export |
| **Drill-down** | Candles + SMA 20/50 + volume + RSI(14), RS line, sector peers |
| **Everything else** | ⌘K palette, keyboard navigation, simulated live ticks with alerts, shareable URLs, dark/light |

## Running it

```bash
npm run dev     # serves the module version at http://localhost:5173 (ES modules need http://)
npm test        # unit tests: treemap, indicators, query parser, backtest look-ahead
npm run build   # bundles everything into dist/index.html (opens straight from disk)
```

Node 18+ for tests and the build. There are no npm dependencies to install.

## Project layout

```
src/
  main.js              boot, event wiring, keyboard shortcuts
  state.js             UI state (timeframe, filters, watchlist, compare)
  data/
    universe.js        sectors and constituents
    market.js          simulation, breadth, RRG maths, RS ranking
  lib/                 rng, math (SMA/EMA/RSI/Pearson/drawdown), formatting, DOM and SVG helpers, pub/sub
  charts/              pure drawing functions: data in, SVG out
  features/            one module per panel; owns its DOM and talks to others via events
  styles/              base, components, charts
scripts/build.mjs      zero-dependency bundler
tests/                 node:test suites
```

Chart modules don't know about app state; feature modules do. Panels communicate through `lib/events.js` (`open-stock`, `filters`, `compare`, …) rather than importing each other, which keeps the import graph acyclic. The build script enforces that.

## Notes on the maths

- **RS Rank:** percentile of `0.4·R63 + 0.2·R126 + 0.2·R189 + 0.2·R252` across the universe (IBD-style weighting).
- **RRG:** the RS line (sector / index) smoothed over 20 sessions. RS-Ratio = RS against its 50-day mean, RS-Momentum = 10-session change in RS-Ratio, both centred on 100. An approximation of JdK's method, not the licensed formula.
- **Backtest:** ranks on closes up to `t-1` and trades at `t`, so there's no look-ahead (covered by a test that tampers with future prices). Costs are charged on turnover at each rebalance, both legs.
- **Sweep:** the best cell is the best fit to *this* history. Treat it as a pointer, not a strategy.

## Shareable state

The URL hash stores timeframe, search, sector filter, compared symbols and backtest parameters, e.g.

```
#tf=126&q=leading+rs>80&cmp=DLF,LT,BEL&bt=42-2-10-10
```

The **Share** button copies it.

## Build details

`scripts/build.mjs` walks imports from `src/main.js`, orders modules by dependency, strips `import`/`export`, and wraps the result in one IIFE inside `dist/index.html` with the CSS inlined. To keep that safe it fails the build on circular imports, bare imports, or two modules declaring the same top-level name.
