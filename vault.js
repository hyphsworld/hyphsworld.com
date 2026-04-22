document.addEventListener("DOMContentLoaded", () => {
  const unlockBtn = document.getElementById("unlockBtn");
  const passwordInput = document.getElementById("vaultPassword");
  const gatePanel = document.getElementById("gatePanel");
  const vaultApp = document.getElementById("vaultApp");
  const vaultMessage = document.getElementById("vaultMessage");

  const level1Panel = document.getElementById("level1Panel");
  const level2Panel = document.getElementById("level2Panel");

  const level1Btn = document.getElementById("level1Btn");
  const level2Btn = document.getElementById("level2Btn");
  const resetVaultBtn = document.getElementById("resetVaultBtn");
  const vaultAccessBadge = document.getElementById("vaultAccessBadge");

  const vaultStatusAccess = document.getElementById("vaultStatusAccess");
  const vaultStatusRoom = document.getElementById("vaultStatusRoom");
  const vaultStatusMove = document.getElementById("vaultStatusMove");

  const MAIN_CODE = "NIKKIMAE";
  const ELITE_CODE = "DUCKSAUCE";
  const STORAGE_KEY = "hyphsworld_vault_access";

  function normalizeCode(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
  }

  function trackVault(eventName, details = {}) {
    if (typeof gtag === "function") {
      gtag("event", eventName, {
        section: "the_vault",
        ...details
      });
    }
  }

  function setMessage(text, color = "#A0A0A0") {
    if (!vaultMessage) return;
    vaultMessage.textContent = text;
    vaultMessage.style.color = color;
  }

  function clearMessage() {
    setMessage("");
  }

  function setAccess(access) {
    sessionStorage.setItem(STORAGE_KEY, access);
  }

  function getAccess() {
    return sessionStorage.getItem(STORAGE_KEY);
  }

  function clearAccess() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function showGate() {
    if (gatePanel) gatePanel.style.display = "block";
    if (vaultApp) vaultApp.style.display = "none";
  }

  function showVaultApp() {
    if (gatePanel) gatePanel.style.display = "none";
    if (vaultApp) vaultApp.style.display = "block";
  }

  function updateLevelButtons(activeLevel) {
    if (level1Btn) level1Btn.classList.toggle("active", activeLevel === 1);
    if (level2Btn) level2Btn.classList.toggle("active", activeLevel === 2);
  }

  function updateStatus(level) {
    const access = getAccess();

    if (vaultStatusAccess) {
      vaultStatusAccess.textContent = access === "elite" ? "ELITE" : "MAIN";
    }

    if (vaultStatusRoom) {
      vaultStatusRoom.textContent = level === 1 ? "LEVEL 1" : "LEVEL 2";
    }

    if (vaultStatusMove) {
      vaultStatusMove.textContent = level === 1 ? "GO TO LEVEL 2" : "GO TO LEVEL 1";
    }

    if (vaultAccessBadge) {
      vaultAccessBadge.textContent = access === "elite" ? "ELITE ACCESS" : "MAIN ACCESS";
      vaultAccessBadge.classList.toggle("elite", access === "elite");
    }
  }

  function showLevel(level) {
    showVaultApp();

    if (level1Panel) {
      level1Panel.style.display = level === 1 ? "block" : "none";
    }

    if (level2Panel) {
      level2Panel.style.display = level === 2 ? "block" : "none";
    }

    updateLevelButtons(level);
    updateStatus(level);

    trackVault("vault_level_view", { level });
  }

  function unlockVault() {
    const entered = normalizeCode(passwordInput ? passwordInput.value : "");

    clearMessage();

    if (!entered) {
      setMessage("ENTER A CODE FIRST", "#F2C2A2");
      return;
    }

    if (entered === MAIN_CODE) {
      setAccess("main");
      setMessage("ACCESS GRANTED", "#C9A34A");
      showLevel(1);
      trackVault("vault_main_access", { trigger: "code_entry", code: "NIKKI MAE" });
      return;
    }

    if (entered === ELITE_CODE) {
      setAccess("elite");
      setMessage("ELITE ACCESS GRANTED", "#C9A34A");
      showLevel(2);
      trackVault("vault_elite_access", { trigger: "code_entry", code: "DUCKSAUCE" });
      return;
    }

    setMessage("CODE NOT RECOGNIZED", "#ff8e8e");
    trackVault("vault_failed_attempt", { entered });
  }

  if (unlockBtn) {
    unlockBtn.addEventListener("click", unlockVault);
  }

  if (passwordInput) {
    passwordInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        unlockVault();
      }
    });

    passwordInput.addEventListener("input", clearMessage);
  }

  if (level1Btn) {
    level1Btn.addEventListener("click", () => {
      const access = getAccess();
      if (access === "main" || access === "elite") {
        showLevel(1);
      }
    });
  }

  if (level2Btn) {
    level2Btn.addEventListener("click", () => {
      const access = getAccess();
      if (access === "main" || access === "elite") {
        showLevel(2);
      }
    });
  }

  if (resetVaultBtn) {
    resetVaultBtn.addEventListener("click", () => {
      clearAccess();
      showGate();
      clearMessage();
      if (passwordInput) passwordInput.value = "";
      trackVault("vault_locked_manual");
    });
  }

  const params = new URLSearchParams(window.location.search);
  const urlCode = normalizeCode(params.get("code"));

  if (urlCode === MAIN_CODE) {
    setAccess("main");
    showLevel(1);
    trackVault("vault_main_access", { trigger: "url_code", code: "NIKKI MAE" });
  } else if (urlCode === ELITE_CODE) {
    setAccess("elite");
    showLevel(2);
    trackVault("vault_elite_access", { trigger: "url_code", code: "DUCKSAUCE" });
  } else {
    const savedAccess = getAccess();

    if (savedAccess === "main") {
      showLevel(1);
    } else if (savedAccess === "elite") {
      showLevel(2);
    } else {
      showGate();
    }
  }
});