import { $$ } from "../lib/dom.js";

/**
 * Replaces a native <select> with a styled menu while keeping the <select> as
 * the source of truth, so existing `input` listeners and `.value` keep working.
 */
export function enhanceSelect(select, { icon, headings = {}, describe }) {
  const wrapper = document.createElement("div");
  wrapper.className = "cs";
  select.parentNode.insertBefore(wrapper, select);
  wrapper.appendChild(select);

  const button = document.createElement("button");
  button.type = "button";
  const menu = document.createElement("div");
  menu.className = "dd";
  wrapper.append(button, menu);

  const sync = () => {
    button.textContent = select.options[select.selectedIndex].text;
    menu.innerHTML = [...select.options]
      .map((opt) => {
        const heading = headings[opt.value] ? `<div class="hd">${headings[opt.value]}</div>` : "";
        return `${heading}
          <a data-value="${opt.value}" class="${opt.value === select.value ? "on" : ""}">
            <i>${opt.value ? icon : "•"}</i>
            <div>${opt.text}<small>${describe(opt.value) || ""}</small></div>
          </a>`;
      })
      .join("");
  };

  menu.addEventListener("click", (e) => {
    const item = e.target.closest("[data-value]");
    if (!item) return;
    e.stopPropagation();
    select.value = item.dataset.value;
    wrapper.classList.remove("open");
    select.dispatchEvent(new Event("input"));
    sync();
  });

  button.addEventListener("click", (e) => {
    e.stopPropagation();
    const wasOpen = wrapper.classList.contains("open");
    closeAllSelects();
    if (!wasOpen) {
      sync();
      wrapper.classList.add("open");
    }
  });

  sync();
  return { sync };
}

export function closeAllSelects() {
  $$(".cs.open").forEach((el) => el.classList.remove("open"));
}
