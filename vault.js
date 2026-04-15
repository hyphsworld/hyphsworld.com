document.addEventListener("DOMContentLoaded", () => {
  const unlockBtn = document.getElementById("unlockBtn");
  const passwordInput = document.getElementById("vaultPassword");
  const gatePanel = document.getElementById("gatePanel");
  const vaultContent = document.getElementById("vaultContent");
  const vaultMessage = document.getElementById("vaultMessage");

  const ACCESS_CODE = "HYPH2025";

  function unlockVault() {
    const value = passwordInput.value.trim();

    if (value === ACCESS_CODE) {
      gatePanel.style.display = "none";
      vaultContent.style.display = "block";
    } else {
      vaultMessage.textContent = "Wrong code. Try again.";
    }
  }

  if (unlockBtn) {
    unlockBtn.addEventListener("click", unlockVault);
  }

  if (passwordInput) {
    passwordInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        unlockVault();
      }
    });
  }
});