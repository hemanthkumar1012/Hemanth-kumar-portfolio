import { svgEl, svgText, resetSvg, scaleLinear } from "../lib/svg.js";
import { showTip, hideTip, tipTitle, tipRow } from "../lib/dom.js";
import { shortDate, tone } from "../lib/format.js";

/** Net advancers as bars around a zero line, with the cumulative A/D line on top. */
export function drawAdvanceDecline(svg, { net, line, dates }) {
  const width = resetSvg(svg);
  const height = +svg.getAttribute("height");
  const m = { l: 34, r: 8, t: 8, b: 18 };
  const peak = Math.max(...net.map(Math.abs));
  const barWidth = (width - m.l - m.r) / net.length;
  const zero = m.t + (height - m.t - m.b) / 2;
  const half = (height - m.t - m.b) / 2;
  const yLine = scaleLinear([Math.min(...line), Math.max(...line)], [height - m.b, m.t]);

  net.forEach((v, i) => {
    const h = (Math.abs(v) / peak) * half;
    const bar = svgEl("rect", {
      x: m.l + i * barWidth + 0.5,
      y: v >= 0 ? zero - h : zero,
      width: Math.max(1, barWidth - 1),
      height: h,
      rx: 1,
      fill: v >= 0 ? "var(--gain)" : "var(--loss)",
      opacity: 0.75,
    }, svg);
    bar.addEventListener("mousemove", (e) =>
      showTip(e, tipTitle(shortDate(dates[i])) + tipRow("Net advancers", v, tone(v)) + tipRow("Cum. A/D", line[i])));
    bar.addEventListener("mouseleave", hideTip);
  });

  svgEl("line", { x1: m.l, x2: width - m.r, y1: zero, y2: zero, stroke: "var(--line)" }, svg);
  const d = line.map((v, i) => `${i ? "L" : "M"}${m.l + i * barWidth + barWidth / 2},${yLine(v)}`).join("");
  svgEl("path", { d, class: "ln ln-ad" }, svg);

  svgText(svg, m.l - 4, m.t + 8, `+${peak}`, { "text-anchor": "end" });
  svgText(svg, m.l - 4, height - m.b, `-${peak}`, { "text-anchor": "end" });
  svgText(svg, width - m.r, height - 4, "— cumulative A/D line", { "text-anchor": "end", fill: "var(--warn)" });
}
