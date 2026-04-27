// HYPHSWORLD Vault Status + Cool Points Add-On
// Works with index.html, vault.js, and app-player.js using localStorage.

(() => {
  const STORAGE = {
    level: "hyphsVaultLevel",
    points: "hyphsCoolPoints",
    daily: "hyphsDailyClaimDate",
    played: "hyphsPlayedTracks"
  };

  const CODES = {
    COOLMAN: { level: 1, points: 25, label: "LEVEL 1 ACTIVE" },
    PRESSURE: { level: 2, points: 50, label: "LEVEL 2 ACTIVE" },
    DUCKSAUCE: { level: 2, points: 50, label: "LEVEL 2 ACTIVE" },
    HYPHSWORLD5: { level: 1, points: 25, label: "LEVEL 1 ACTIVE" },
    AMSWEST: { level: 1, points: 25, label: "LEVEL 1 ACTIVE" }
  };

  const $ = (id) => document.getElementById(id);

  function getLevel() {
    return Number(localStorage.getItem(STORAGE.level) || "0");
  }

  function setLevel(level) {
    const current = getLevel();
    localStorage.setItem(STORAGE.level, String(Math.max(current, level)));
  }

  function getPoints() {
    return Number(localStorage.getItem(STORAGE.points) || "0");
  }

  function addPoints(amount) {
    const next = Math.max(0, getPoints() + amount);
    localStorage.setItem(STORAGE.points, String(next));
    renderStatus();
    return next;
  }

  function levelLabel(level) {
    if (level >= 2) return "ðŸ’Ž Level 2 Active";
    if (level >= 1) return "ðŸ”“ Level 1 Active";
    return "ðŸ”’ Vault Locked";
  }

  function renderStatus() {
    const level = getLevel();
    const points = getPoints();
    const percent = Math.min(100, Math.round((points / 250) * 100));

    if ($("vaultStatusLabel")) $("vaultStatusLabel").textContent = levelLabel(level);
    if ($("coolPointsCount")) $("coolPointsCount").textContent = String(points);
    if ($("coolPointsBar")) $("coolPointsBar").style.width = `${percent}%`;

    if ($("musicVaultStatus")) $("musicVaultStatus").textContent = levelLabel(level).replace(/[ðŸ”’ðŸ”“ðŸ’Ž]/g, "").trim().toUpperCase();
    if ($("musicCoolPoints")) $("musicCoolPoints").textContent = `${points} POINTS`;

    if ($("musicVaultCopy")) {
      $("musicVaultCopy").textContent =
        level >= 2
          ? "Level 2 is active. You can now see deeper player access and private vault energy."
          : level >= 1
            ? "Level 1 is active. Keep pushing for Level 2 access."
            : "Locked. Enter a code to open the first level.";
    }
  }

  function flash(message, type = "success") {
    const msg = $("coolPointsMessage");
    if (!msg) return;
    msg.textContent = message;
    msg.classList.remove("success", "error");
    msg.classList.add(type);
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function setupDailyClaim() {
    const btn = $("dailyPointsBtn");
    if (!btn) return;

    function updateButton() {
      const claimed = localStorage.getItem(STORAGE.daily) === todayKey();
      btn.disabled = claimed;
      btn.textContent = claimed ? "DAILY CLAIMED" : "CLAIM DAILY +5";
    }

    btn.addEventListener("click", () => {
      if (localStorage.getItem(STORAGE.daily) === todayKey()) {
        flash("Daily points already claimed. Come back tomorrow.", "error");
        updateButton();
        return;
      }

      localStorage.setItem(STORAGE.daily, todayKey());
      addPoints(5);
      flash("Daily +5 Cool Points added.");
      updateButton();

      if (typeof gtag === "function") {
        gtag("event", "cool_points_daily_claim", { section: "homepage", points_awarded: 5 });
      }
    });

    updateButton();
  }

  function setupTriviaUnlock() {
    const form = $("triviaForm");
    const input = $("triviaInput");
    const feedback = $("triviaFeedback");

    if (!form || !input || !feedback) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const code = input.value.trim().toUpperCase().replace(/\s+/g, "");
      const unlock = CODES[code];

      feedback.classList.remove("success", "error");

      if (!code) {
        feedback.textContent = "Enter a code first.";
        feedback.classList.add("error");
        return;
      }

      if (!unlock) {
        feedback.textContent = "Not that one. Try another HYPHSWORLD code.";
        feedback.classList.add("error");
        return;
      }

      const before = getLevel();
      setLevel(unlock.level);
      addPoints(unlock.points);

      feedback.textContent =
        before >= unlock.level
          ? `${unlock.label}. +${unlock.points} Cool Points added.`
          : `${unlock.label} UNLOCKED. +${unlock.points} Cool Points added.`;
      feedback.classList.add("success");

      flash(`${unlock.label}. Cool Points updated.`);
      input.value = "";
      renderStatus();

      if (typeof gtag === "function") {
        gtag("event", "vault_code_unlocked", {
          section: "homepage",
          code_entered: code,
          vault_level: unlock.level,
          points_awarded: unlock.points
        });
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderStatus();
    setupDailyClaim();
    setupTriviaUnlock();
  });

  window.HyphsWorldRewards = {
    getLevel,
    setLevel,
    getPoints,
    addPoints,
    renderStatus
  };
})();
