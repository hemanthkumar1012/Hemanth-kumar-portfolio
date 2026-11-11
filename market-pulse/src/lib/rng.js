/**
 * Seeded Park–Miller generator. The demo data has to look identical on every
 * load so walkthroughs and screenshots stay stable, so Math.random is out.
 */
export function createRng(seed = 1) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;

  const next = () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };

  // Box–Muller transform for normally distributed shocks.
  const gauss = () => {
    let u = 0;
    let v = 0;
    while (!u) u = next();
    while (!v) v = next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  return { next, gauss };
}
