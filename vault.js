document.addEventListener("DOMContentLoaded", () => {
  const unlockBtn = document.getElementById("unlockBtn");
  const passwordInput = document.getElementById("vaultPassword");
  const gatePanel = document.getElementById("gatePanel");
  const mainVaultContent = document.getElementById("mainVaultContent");
  const eliteVaultContent = document.getElementById("eliteVaultContent");
  const vaultMessage = document.getElementById("vaultMessage");

  const MAIN_CODE = "HYPH2025";
  const ELITE_CODE = "MOTION2025";

  function normalizeCode(value) {
    return String(value || "").trim().toUpperCase();
  }

  function trackVault(eventName, details = {}) {
    if (typeof gtag === "function") {
      gtag("event", eventName, {
        section: "the_vault",
        ...details
      });
    }
  }

  function hideAllPanels() {
    if (gatePanel) gatePanel.style.display = "none";
    if (mainVaultContent) mainVaultContent.style.display = "none";
    if (eliteVaultContent) eliteVaultContent.style.display = "none";
  }

  function clearMessage() {
    if (!vaultMessage) return;
    vaultMessage.textContent = "";
    vaultMessage.style.color = "#A0A0A0";
  }

  function setMessage(text, color) {
    if (!vaultMessage) return;
    vaultMessage.textContent = text;
    vaultMessage.style.color = color;
  }

  function showGate() {
    if (gatePanel) gatePanel.style.display = "block";
    if (mainVaultContent) mainVaultContent.style.display = "none";
    if (eliteVaultContent) eliteVaultContent.style.display = "none";
  }

  function showMainVault(trigger = "manual") {
    hideAllPanels();
    if (mainVaultContent) {
      mainVaultContent.style.display = "block";
    }
    trackVault("vault_main_access", {
      trigger
    });
  }

  function showEliteVault(trigger = "manual") {
    hideAllPanels();
    if (eliteVaultContent) {
      eliteVaultContent.style.display = "block";
    }
    trackVault("vault_elite_access", {
      trigger
    });
  }

  function showError() {
    setMessage("CODE NOT RECOGNIZED", "#ff8e8e");
    trackVault("vault_failed_attempt");
  }

  function unlockVault() {
    const entered = normalizeCode(passwordInput ? passwordInput.value : "");

    clearMessage();

    if (!entered) {
      setMessage("ENTER A CODE FIRST", "#F2C2A2");
      return;
    }

    if (entered === MAIN_CODE) {
      showMainVault("code_entry");
      return;
    }

    if (entered === ELITE_CODE) {
      showEliteVault("code_entry");
      return;
    }

    showError();
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

  const params = new URLSearchParams(window.location.search);
  const urlCode = normalizeCode(params.get("code"));

  if (urlCode === MAIN_CODE) {
    showMainVault("url_code");
  } else if (urlCode === ELITE_CODE) {
    showEliteVault("url_code");
  } else {
    showGate();
  }
});