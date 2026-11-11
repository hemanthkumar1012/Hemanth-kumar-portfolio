export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const mean = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;

export function stdev(values) {
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

/** Simple moving average of the `n` values ending at `i` (pads with the first value). */
export function smaAt(series, n, i) {
  let sum = 0;
  for (let k = i - n + 1; k <= i; k++) sum += series[Math.max(0, k)];
  return sum / n;
}

export function ema(series, n) {
  const k = 2 / (n + 1);
  const out = [series[0]];
  for (let i = 1; i < series.length; i++) out.push(series[i] * k + out[i - 1] * (1 - k));
  return out;
}

/** Wilder's RSI. The first `n` values are seeded at 50. */
export function rsi(closes, n = 14) {
  const out = [50];
  let gain = 0;
  let loss = 0;

  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const up = Math.max(change, 0);
    const down = Math.max(-change, 0);

    if (i <= n) {
      gain += up;
      loss += down;
      if (i === n) {
        gain /= n;
        loss /= n;
      }
      out.push(50);
      continue;
    }

    gain = (gain * (n - 1) + up) / n;
    loss = (loss * (n - 1) + down) / n;
    out.push(100 - 100 / (1 + gain / (loss || 1e-9)));
  }
  return out;
}

export function pearson(a, b) {
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return num / Math.sqrt(da * db);
}

/** Return over the last `days` sessions of a price series. */
export function periodReturn(series, days) {
  const last = series.length - 1;
  return series[last] / series[Math.max(0, last - days)] - 1;
}

export const dailyReturns = (series) => series.slice(1).map((v, i) => v / series[i] - 1);

/** Running drawdown from the high-water mark, as negative fractions. */
export function drawdowns(equity) {
  let peak = -Infinity;
  return equity.map((v) => {
    peak = Math.max(peak, v);
    return v / peak - 1;
  });
}
