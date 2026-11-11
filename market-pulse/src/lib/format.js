export const pct = (v, digits = 2) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(digits)}%`;

export const signed = (v, digits = 1) => `${v >= 0 ? "+" : ""}${v.toFixed(digits)}`;

/** CSS class for a gain/loss number. */
export const tone = (v) => (v >= 0 ? "g" : "l");

export function crore(v) {
  if (v >= 1e5) return `${(v / 1e5).toFixed(2)}L Cr`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K Cr`;
  return `${v.toFixed(0)} Cr`;
}

export const shortDate = (d) =>
  d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });

export const clockTime = (d = new Date()) => d.toLocaleTimeString("en-IN", { hour12: false });
