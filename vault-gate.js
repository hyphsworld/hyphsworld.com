// File: vault-gate.js
(() => {
  const CODES = {
    "COOLMAN": 1,
    "PRESSURE": 2,
    "DUCKSAUCE": 2
  };

  const form = document.getElementById("vaultForm");
  const input = document.getElementById("vaultCode");
  const msg = document.getElementById("vaultMessage");

  if (!form || !input || !msg) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const code = input.value.trim().toUpperCase();

    if (!code) {
      msg.textContent = "ENTER CODE";
      return;
    }

    if (!CODES[code]) {
      msg.textContent = "INVALID CODE";
      return;
    }

    const level = CODES[code];
    localStorage.setItem("hyphsVaultLevel", String(level));

    msg.textContent = `LEVEL ${level} UNLOCKED`;

    setTimeout(() => {
      window.location.href = "app-player.html";
    }, 900);
  });
})();
