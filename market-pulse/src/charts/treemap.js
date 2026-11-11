/**
 * Squarified treemap layout (Bruls, Huizing & van Wijk, 2000).
 * Takes items with a `value` and a rectangle, returns [{ item, x, y, w, h }].
 * Rows are grown greedily while the worst aspect ratio keeps improving.
 */
export function squarify(items, rect) {
  const queue = items.filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  const out = [];
  let { x, y, w, h } = rect;
  let remaining = queue.reduce((sum, d) => sum + d.value, 0);

  const worstRatio = (areas, side) => {
    const sum = areas.reduce((a, b) => a + b, 0);
    const max = Math.max(...areas);
    const min = Math.min(...areas);
    return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
  };

  while (queue.length && w > 0 && h > 0) {
    const side = Math.min(w, h);
    const scale = (w * h) / remaining;
    const row = [];
    let best = Infinity;

    while (queue.length) {
      const area = queue[0].value * scale;
      const ratio = worstRatio([...row.map((r) => r.area), area], side);
      if (ratio > best) break;
      best = ratio;
      row.push({ item: queue.shift(), area });
    }

    const rowArea = row.reduce((sum, r) => sum + r.area, 0);
    const thickness = rowArea / side;
    let offset = 0;
    for (const { item, area } of row) {
      const length = area / thickness;
      out.push(w >= h
        ? { item, x, y: y + offset, w: thickness, h: length }
        : { item, x: x + offset, y, w: length, h: thickness });
      offset += length;
    }

    if (w >= h) {
      x += thickness;
      w -= thickness;
    } else {
      y += thickness;
      h -= thickness;
    }
    remaining -= row.reduce((sum, r) => sum + r.item.value, 0);
  }
  return out;
}
