import { sectorNames } from "../data/market.js";

/*
 * Tiny query language for the screener search box.
 *   rs>80  rs>=90  vol>1.5  leading|improving|weakening|lagging
 *   near high  up|gainers  down|losers  above50  <sector prefix>
 * Anything unrecognised falls back to a symbol/name text match.
 */

const QUADRANT_WORDS = ["leading", "improving", "weakening", "lagging"];
const COMPARATORS = {
  ">": (a, b) => a > b,
  ">=": (a, b) => a >= b,
  "<": (a, b) => a < b,
  "<=": (a, b) => a <= b,
};

function sectorFromToken(token) {
  if (token.length < 2) return null;
  return sectorNames.find((name) => name.toLowerCase().replace(/\s/g, "").startsWith(token)) || null;
}

export function parseQuery(text) {
  const query = { terms: [], tags: [] };
  const tokens = text.toLowerCase().split(/\s+/).filter(Boolean);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    let match;

    if ((match = token.match(/^rs(>=|<=|>|<)(\d+)$/))) {
      query.rs = { op: match[1], value: Number(match[2]) };
      query.tags.push(`RS ${match[1]} ${match[2]}`);
    } else if ((match = token.match(/^r?vol(>=|<=|>|<)([\d.]+)$/))) {
      query.relVolume = { op: match[1], value: Number(match[2]) };
      query.tags.push(`Rel. volume ${match[1]} ${match[2]}`);
    } else if (QUADRANT_WORDS.includes(token)) {
      query.quadrant = token[0].toUpperCase() + token.slice(1);
      query.tags.push(query.quadrant);
    } else if (token === "near" && tokens[i + 1] === "high") {
      query.nearHigh = true;
      query.tags.push("Within 5% of 52W high");
      i++;
    } else if (token === "up" || token === "gainers") {
      query.direction = 1;
      query.tags.push("Up today");
    } else if (token === "down" || token === "losers") {
      query.direction = -1;
      query.tags.push("Down today");
    } else if (token === "above50") {
      query.above50 = true;
      query.tags.push("Above 50-DMA");
    } else if (sectorFromToken(token)) {
      query.sector = sectorFromToken(token);
      query.tags.push(query.sector);
    } else {
      query.terms.push(token);
    }
  }
  return query;
}

export function matchesQuery(stock, query) {
  const text = query.terms.join(" ");
  if (text && !stock.symbol.toLowerCase().includes(text) && !stock.name.toLowerCase().includes(text)) return false;
  if (query.rs && !COMPARATORS[query.rs.op](stock.rs, query.rs.value)) return false;
  if (query.relVolume && !COMPARATORS[query.relVolume.op](stock.relVolume, query.relVolume.value)) return false;
  if (query.quadrant && stock.quadrant !== query.quadrant) return false;
  if (query.sector && stock.sector !== query.sector) return false;
  if (query.nearHigh && stock.fromHigh <= -0.05) return false;
  if (query.direction && Math.sign(stock.change) !== query.direction) return false;
  if (query.above50 && stock.vs50 <= 0) return false;
  return true;
}
