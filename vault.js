document.addEventListener("DOMContentLoaded", () => {
  const unlockBtn = document.getElementById("unlockBtn");
  const passwordInput = document.getElementById("vaultPassword");
  const gatePanel = document.getElementById("gatePanel");
  const mainVaultContent = document.getElementById("mainVaultContent");
  const eliteVaultContent = document.getElementById("eliteVaultContent");
  const vaultMessage = document.getElementById("vaultMessage");

  const MAIN_CODE = "HYPH2025";
  const ELITE_CODE = "MOTION2025";

  function trackVault(eventLabel) {
    if (typeof gtag === "function") {
      gtag("event", "vault_access", {
        event_category: "vault",
        event_label: eventLabel
      });
    }
  }

  function hideAllPanels() {
    gatePanel.style.display = "none";
    mainVaultContent.style.display = "none";
    eliteVaultContent.style.display = "none";
  }

  function showMainVault() {
    hideAllPanels();
    mainVaultContent.style.display = "block";
    trackVault("main_code_success");
  }

  function showEliteVault() {
    hideAllPanels();
    eliteVaultContent.style.display = "block";
    trackVault("elite_code_success");
  }

  function showError() {
    vaultMessage.textContent = "Wrong code. Try again.";
    vaultMessage.style.color = "#ff7b7b";
    trackVault("failed_attempt");
  }

  function clearMessage() {
    vaultMessage.textContent = "";
  }

  function unlockVault() {
    const entered = passwordInput.value.trim();

    clearMessage();

    if (!entered) {
      vaultMessage.textContent = "Enter a code first.";
      vaultMessage.style.color = "#f2c2a2";
      return;
    }

    if (entered === MAIN_CODE) {
      showMainVault();
      return;
    }

    if (entered === ELITE_CODE) {
      showEliteVault();
      return;
    }

    showError();
  }

  if (unlockBtn) {
    unlockBtn.addEventListener("click", unlockVault);
  }

  if (passwordInput) {
    passwordInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        unlockVault();
      }
    });

    passwordInput.addEventListener("input", clearMessage);
  }

  // Optional direct URL unlock:
  // vault.html?code=HYPH2025
  const params = new URLSearchParams(window.location.search);
  const urlCode = params.get("code");

  if (urlCode === MAIN_CODE) {
    showMainVault();
  }

  if (urlCode === ELITE_CODE) {
    showEliteVault();
  }
});