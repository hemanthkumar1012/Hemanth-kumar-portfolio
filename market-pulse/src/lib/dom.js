export const $ = (id) => document.getElementById(id);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function showTip(event, html) {
  const tip = $("tip");
  tip.innerHTML = html;
  tip.style.opacity = 1;
  const x = Math.min(event.clientX + 14, innerWidth - tip.offsetWidth - 10);
  const y = Math.min(event.clientY + 14, innerHeight - tip.offsetHeight - 10);
  tip.style.transform = `translate(${x}px, ${y}px)`;
}

export function hideTip() {
  $("tip").style.opacity = 0;
}

export const tipTitle = (text) => `<div class="t">${text}</div>`;
export const tipRow = (label, value, cls = "") => `<div class="r">${label}<b class="${cls}">${value}</b></div>`;

/** Gain/loss fill shared by every heat-style view, so one colour always means one thing. */
export function divergingFill(value, maxAbs) {
  const t = Math.max(-1, Math.min(1, value / (maxAbs || 1)));
  return t >= 0 ? `rgba(22,163,74,${0.25 + 0.75 * t})` : `rgba(220,38,38,${0.25 + 0.75 * -t})`;
}

export function debounce(fn, wait = 150) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
