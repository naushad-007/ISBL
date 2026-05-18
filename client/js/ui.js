export const byId = (id) => document.getElementById(id);

export const goToScreen = (id) => {
  document.querySelectorAll(".screen").forEach((screen) => screen.classList.remove("active"));
  const target = byId(`screen-${id}`);
  if (target) target.classList.add("active");
};

export const initTabs = (barId) => {
  const bar = byId(barId);
  if (!bar) return;
  bar.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      bar.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("on"));
      btn.classList.add("on");
      const panelId = btn.dataset.panel;
      btn.closest(".screen").querySelectorAll(".panel").forEach((p) => p.classList.remove("on"));
      byId(panelId)?.classList.add("on");
    });
  });
};

export const toast = (message, type = "ok") => {
  const root = byId("toasts");
  if (!root) return;
  const node = document.createElement("div");
  node.className = `toast ${type}`;
  node.innerHTML = `<div class="td"></div>${message}`;
  root.appendChild(node);
  setTimeout(() => {
    node.style.animation = "toastOut 0.3s forwards";
    setTimeout(() => node.remove(), 300);
  }, 3000);
};

export const clearErrors = () => {
  ["t-err", "a-err", "m-err"].forEach((id) => {
    const node = byId(id);
    if (node) node.textContent = "";
  });
};

export const setLoading = (button, loading, label) => {
  if (!button) return;
  if (loading) {
    button.disabled = true;
    button.dataset.original = button.innerHTML;
    const isWarn = button.classList.contains("btn-danger");
    button.innerHTML = `<span class="spin${isWarn ? " warn" : ""}"></span>&nbsp;${label}`;
    return;
  }
  button.disabled = false;
  button.innerHTML = button.dataset.original || label;
};

export const startClock = (dateId, timeId) => {
  const tick = () => {
    const now = new Date();
    const date = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    const time = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
    const dateNode = byId(dateId);
    const timeNode = byId(timeId);
    if (dateNode) dateNode.textContent = date;
    if (timeNode) timeNode.textContent = time;
  };
  tick();
  return setInterval(tick, 30000);
};

export const initRipple = () => {
  document.addEventListener("click", (event) => {
    const target = event.target.closest(".btn, .entry-card");
    if (!target) return;
    const ripple = document.createElement("span");
    ripple.className = "ripple-el";
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${event.clientX - rect.left - size / 2}px;top:${event.clientY - rect.top - size / 2}px`;
    target.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
  });
};
