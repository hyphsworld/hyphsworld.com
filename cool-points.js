// File: cool-points.js
(() => {
  const POINTS_KEY = "hyphsworld_points";
  const DAILY_KEY = "hyphsworld_daily_bonus";
  const LEGACY_KEYS = [
    "hyphsworld_points_v1",
    "hyphsworld_points_v2",
  ];

  for (const legacyKey of LEGACY_KEYS) {
    try {
      const raw = localStorage.getItem(legacyKey);
      const legacyValue = Number(raw);

      if (Number.isFinite(legacyValue) && legacyValue > 0) {
        const currentValue = Number(localStorage.getItem(POINTS_KEY) || "0");
        if (!Number.isFinite(currentValue) || currentValue < legacyValue) {
          localStorage.setItem(POINTS_KEY, String(legacyValue));
        }
      }

      localStorage.removeItem(legacyKey);
    } catch {
    }
  }

  function getPoints() {
    const value = Number(localStorage.getItem(POINTS_KEY) || "0");
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }

  function setPoints(value) {
    const safeValue = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    localStorage.setItem(POINTS_KEY, String(safeValue));
    notifyPointsChanged();
    return safeValue;
  }

  function addPoints(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) {
      return getPoints();
    }

    return setPoints(getPoints() + amount);
  }

  function resetPoints() {
    return setPoints(0);
  }

  function rank(points) {
    if (points >= 5000) return "Legend";
    if (points >= 2500) return "Major Motion";
    if (points >= 1000) return "Certified";
    if (points >= 500) return "Pressure";
    if (points >= 100) return "Active";
    return "Rookie";
  }

  function notifyPointsChanged() {
    window.dispatchEvent(
      new CustomEvent("hyphsworld:points-changed", {
        detail: {
          points: getPoints(),
          rank: rank(getPoints()),
        },
      }),
    );
  }

  function trackEvent(name, payload = {}) {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", name, payload);
  }

  function bindEarners() {
    const earners = document.querySelectorAll(".earn-points");

    for (const node of earners) {
      if (node.dataset.boundPoints === "1") continue;

      node.dataset.boundPoints = "1";
      node.addEventListener("click", () => {
        const amount = Number(node.dataset.points || "5");
        const reason = node.dataset.reason || "engagement_click";

        if (!Number.isFinite(amount) || amount <= 0) return;

        addPoints(amount);
        trackEvent("cool_points", {
          points_added: amount,
          reason,
        });
      });
    }
  }

  function dailyBonus() {
    const today = new Date().toDateString();
    const last = localStorage.getItem(DAILY_KEY);

    if (last === today) return;

    localStorage.setItem(DAILY_KEY, today);
    addPoints(25);
    trackEvent("cool_points", {
      points_added: 25,
      reason: "daily_bonus",
    });
  }

  function watchDom() {
    const observer = new MutationObserver(() => {
      bindEarners();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  window.HYPHSWORLD_POINTS = {
    add: addPoints,
    get: getPoints,
    set: setPoints,
    reset: resetPoints,
    rank: () => rank(getPoints()),
  };

  document.addEventListener("DOMContentLoaded", () => {
    bindEarners();
    dailyBonus();
    watchDom();
    notifyPointsChanged();
  });
})();
