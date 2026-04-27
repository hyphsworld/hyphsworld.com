document.addEventListener("DOMContentLoaded", () => {
  const gatePanel = document.getElementById("gatePanel");
  const mainVaultContent = document.getElementById("mainVaultContent");
  const eliteVaultContent = document.getElementById("eliteVaultContent");
  const passwordInput = document.getElementById("vaultPassword");
  const unlockBtn = document.getElementById("unlockBtn");
  const message = document.getElementById("vaultMessage");

  const CODES = {
    COOLMAN: { level: 1, points: 25, label: "LEVEL 1 UNLOCKED" },
    HYPHSWORLD5: { level: 1, points: 25, label: "LEVEL 1 UNLOCKED" },
    AMSWEST: { level: 1, points: 25, label: "LEVEL 1 UNLOCKED" },
    PRESSURE: { level: 2, points: 50, label: "LEVEL 2 UNLOCKED" },
    DUCKSAUCE: { level: 2, points: 50, label: "LEVEL 2 UNLOCKED" }
  };

  function getLevel() {
    return Number(localStorage.getItem("hyphsVaultLevel") || "0");
  }

  function setLevel(level) {
    localStorage.setItem("hyphsVaultLevel", String(Math.max(getLevel(), level)));
  }

  function addCoolPoints(points) {
    const current = Number(localStorage.getItem("hyphsCoolPoints") || "0");
    localStorage.setItem("hyphsCoolPoints", String(current + points));
  }

  function showLevel(level) {
    if (!gatePanel || !mainVaultContent || !eliteVaultContent) return;

    gatePanel.classList.toggle("vault-hidden", level > 0);
    mainVaultContent.classList.toggle("vault-hidden", level < 1);
    eliteVaultContent.classList.toggle("vault-hidden", level < 2);
  }

  function track(eventName, details = {}) {
    if (typeof gtag === "function") {
      gtag("event", eventName, {
        section: "vault",
        ...details
      });
    }
  }

  function unlock() {
    if (!passwordInput || !message) return;

    const code = passwordInput.value.trim().toUpperCase().replace(/\s+/g, "");
    const unlockData = CODES[code];

    message.classList.remove("success", "error");

    if (!code) {
      message.textContent = "ENTER CODE";
      message.classList.add("error");
      return;
    }

    if (!unlockData) {
      message.textContent = "INVALID CODE";
      message.classList.add("error");
      track("vault_code_invalid", { code_entered: code });
      return;
    }

    const previousLevel = getLevel();
    setLevel(unlockData.level);
    addCoolPoints(unlockData.points);
    showLevel(getLevel());

    message.textContent =
      previousLevel >= unlockData.level
        ? `${unlockData.label} â€¢ +${unlockData.points} COOL POINTS`
        : `${unlockData.label} â€¢ +${unlockData.points} COOL POINTS`;
    message.classList.add("success");

    passwordInput.value = "";

    track("vault_code_unlocked", {
      code_entered: code,
      vault_level: unlockData.level,
      points_awarded: unlockData.points
    });
  }

  if (unlockBtn) unlockBtn.addEventListener("click", unlock);
  if (passwordInput) {
    passwordInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") unlock();
    });
  }

  showLevel(getLevel());
});
