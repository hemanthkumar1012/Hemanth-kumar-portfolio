import { $, $$ } from "../lib/dom.js";
import { clockTime } from "../lib/format.js";

// Purely presentational behaviour: reveal-on-scroll, count-up, line draw-in,
// card spotlight, scroll progress, status-bar clock and the splash screen.

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function countUp(selector = ".kpi .v") {
  if (prefersReducedMotion()) return;
  for (const el of $$(selector)) {
    if (el.dataset.animating) continue;
    const finalText = el.textContent;
    const number = finalText.match(/-?[\d.]+/);
    if (!number || el.dataset.shown === finalText) continue;

    el.dataset.shown = finalText;
    el.dataset.animating = "1";
    const target = parseFloat(number[0]);
    const decimals = (number[0].split(".")[1] || "").length;
    const startedAt = performance.now();

    const step = () => {
      const t = Math.max(0, Math.min(1, (performance.now() - startedAt) / 900));
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = finalText.replace(number[0], (target * eased).toFixed(decimals));
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = finalText;
        delete el.dataset.animating;
      }
    };
    requestAnimationFrame(step);
  }
}

export function drawLinesIn() {
  if (prefersReducedMotion()) return;
  for (const path of $$("#breadth .ln, #ad .ln, #rcSvg .ln, #btEq .ln-strategy")) {
    const length = path.getTotalLength();
    if (!length) continue;
    path.style.setProperty("--len", length);
    path.classList.remove("draw");
    void path.getBoundingClientRect(); // restart the animation
    path.classList.add("draw");
  }
}

function revealOnScroll() {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("in");
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.08 });

  for (const el of $$("main > .card, main > .grid, main > .hero, main > .q, main > .note")) {
    el.classList.add("rv");
    observer.observe(el);
  }
}

function cardSpotlight() {
  document.addEventListener("pointermove", (e) => {
    const card = e.target.closest?.(".card");
    if (!card) return;
    const box = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - box.left}px`);
    card.style.setProperty("--my", `${e.clientY - box.top}px`);
  });
}

function scrollProgress() {
  addEventListener("scroll", () => {
    const doc = document.documentElement;
    $("prog").style.width = `${(doc.scrollTop / (doc.scrollHeight - doc.clientHeight)) * 100}%`;
  }, { passive: true });
}

function statusClock() {
  const update = () => { $("sbClock").textContent = `${clockTime()} IST`; };
  update();
  setInterval(update, 1000);
}

export function initEffects() {
  revealOnScroll();
  cardSpotlight();
  scrollProgress();
  statusClock();
}

export function dismissSplash() {
  setTimeout(() => {
    $("sk").classList.add("hide");
    drawLinesIn();
    countUp();
  }, 650);
}
