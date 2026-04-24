document.addEventListener("DOMContentLoaded", () => {
  const allowedCodes = ["510", "HYPH", "DUCK", "AMS", "WORLD5", "RICHMOND"];
  const redirectTo = "vault.html";
  const gateCard = document.getElementById("gateCard");
  const displaySlots = Array.from(document.querySelectorAll("#codeDisplay span"));
  const keypad = document.querySelector(".keypad");
  const wordInput = document.getElementById("wordCodeInput");
  const unlockBtn = document.getElementById("unlockBtn");
  const message = document.getElementById("gateMessage");
  let code = "";

  function trackEvent(name, label) {
    if (typeof gtag === "function") {
      gtag("event", name, { event_category: "vault_gate", event_label: label });
    }
  }

  function updateDisplay() {
    displaySlots.forEach((slot, index) => slot.classList.toggle("filled", index < code.length));
  }

  function setMessage(text, type = "") {
    message.textContent = text;
    message.className = "gate-message";
    if (type) message.classList.add(type);
  }

  function normalize(value) {
    return String(value || "").trim().toUpperCase();
  }

  function currentAttempt() {
    return normalize(wordInput.value) || normalize(code);
  }

  function failAttempt(attempt) {
    setMessage("Duck Sauce says: Nahhh... you don’t know the code.", "error");
    gateCard.classList.remove("shake");
    void gateCard.offsetWidth;
    gateCard.classList.add("shake");
    trackEvent("vault_code_wrong", attempt || "empty");
  }

  function unlockVault(attempt) {
    setMessage("Access granted. Welcome 2 HYPHSWORLD.", "success");
    gateCard.classList.add("unlocking");
    trackEvent("vault_code_success", attempt);
    try { sessionStorage.setItem("hyphsworldVaultAccess", "granted"); } catch (e) {}
    setTimeout(() => { window.location.href = redirectTo; }, 900);
  }

  function checkCode() {
    const attempt = currentAttempt();
    if (!attempt) return failAttempt("empty");
    if (allowedCodes.includes(attempt)) unlockVault(attempt);
    else failAttempt(attempt);
  }

  keypad.addEventListener("click", (event) => {
    const key = event.target.dataset.key;
    if (!key) return;
    if (key === "CLEAR") {
      code = "";
      wordInput.value = "";
      setMessage("Access pad cleared.");
    } else if (key === "BACK") {
      code = code.slice(0, -1);
    } else if (code.length < 6) {
      code += key;
      setMessage("Code entered.");
    }
    updateDisplay();
    trackEvent("vault_keypad_press", key);
  });

  unlockBtn.addEventListener("click", checkCode);
  wordInput.addEventListener("input", () => { code = ""; updateDisplay(); });
  wordInput.addEventListener("keydown", (event) => { if (event.key === "Enter") checkCode(); });
  updateDisplay();
});