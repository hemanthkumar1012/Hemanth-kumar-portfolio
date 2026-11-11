import { $ } from "../lib/dom.js";

const MAX_VISIBLE = 3;
const LIFETIME_MS = 4200;

export function toast(title, body, accent = "var(--txt)") {
  const stack = $("toasts");
  const node = document.createElement("div");
  node.className = "toast";
  node.style.setProperty("--c", accent);
  node.innerHTML = `<b>${title}</b><span>${body}</span>`;
  stack.prepend(node);

  while (stack.children.length > MAX_VISIBLE) stack.lastChild.remove();

  setTimeout(() => {
    node.classList.add("out");
    node.addEventListener("animationend", () => node.remove(), { once: true });
  }, LIFETIME_MS);
}
