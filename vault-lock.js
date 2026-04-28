(() => {
  "use strict";

  const LEVEL_1_URL = "vault.html";
  const UNLOCK_KEY = "hyphsworld_vault_level_1_unlocked";
  const UNLOCK_TIME_KEY = "hyphsworld_vault_level_1_unlocked_at";
  const MAX_UNLOCK_AGE_MS = 1000 * 60 * 60 * 24 * 7;

  /*
    IMPORTANT:
    No public code is stored here.
    This is the SHA-256 hash of the private Level 1 code.
    Frontend locks are good for fan gating, not bank-level security.
  */
  const LEVEL_1_HASH = "651d8948587739f3c0aa840fd250b5b547b98a83a9b84aa24800ff1293dc8ed9";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function normalizeCode(value) {
    return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  }

  async function sha256Hex(message) {
    const data = new TextEncoder().encode(message);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  function isUnlocked() {
    const unlocked = localStorage.getItem(UNLOCK_KEY) === "true" || sessionStorage.getItem(UNLOCK_KEY) === "true";
    const unlockedAt = Number(localStorage.getItem(UNLOCK_TIME_KEY) || sessionStorage.getItem(UNLOCK_TIME_KEY) || "0");
    if (!unlocked || !unlockedAt) return false;

    const isFresh = Date.now() - unlockedAt < MAX_UNLOCK_AGE_MS;
    if (!isFresh) {
      localStorage.removeItem(UNLOCK_KEY);
      localStorage.removeItem(UNLOCK_TIME_KEY);
      sessionStorage.removeItem(UNLOCK_KEY);
      sessionStorage.removeItem(UNLOCK_TIME_KEY);
    }
    return isFresh;
  }

  function setUnlocked() {
    const now = String(Date.now());
    sessionStorage.setItem(UNLOCK_KEY, "true");
    sessionStorage.setItem(UNLOCK_TIME_KEY, now);
    localStorage.setItem(UNLOCK_KEY, "true");
    localStorage.setItem(UNLOCK_TIME_KEY, now);
  }

  function protectVaultPage() {
    const protectedLevel = document.documentElement.getAttribute("data-protected-vault");
    if (!protectedLevel) return;

    if (!isUnlocked()) {
      window.location.replace("index.html#vault");
    }
  }

  function openModal() {
    const modal = $("#vaultModal");
    if (!modal) return;

    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    const input = $("#vaultCode");
    const status = $("#vaultStatus");
    if (status) status.textContent = "";
    if (input) {
      input.value = "";
      setTimeout(() => input.focus(), 80);
    }
  }

  function closeModal() {
    const modal = $("#vaultModal");
    if (!modal) return;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  function setDuckLine(line) {
    const target = $("#duckLine");
    if (target) target.textContent = line;
  }

  function bindHomepageLock() {
    $$(".js-open-vault").forEach((button) => {
      button.addEventListener("click", openModal);
    });

    $$(".js-close-vault").forEach((button) => {
      button.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeModal();
    });

    const modal = $("#vaultModal");
    if (modal) {
      modal.addEventListener("click", (event) => {
        if (event.target === modal) closeModal();
      });
    }

    $$(".js-duck-tip").forEach((button) => {
      button.addEventListener("click", () => {
        openModal();
        setDuckLine("Duck Sauce: I got clues, not confessions. Type what you already know.");
      });
    });

    $$(".js-buck-tip").forEach((button) => {
      button.addEventListener("click", () => {
        openModal();
        setDuckLine("BuckTheBodyguard: No code, no elevator. Keep it moving.");
      });
    });

    $$("[data-duck-line]").forEach((button) => {
      button.addEventListener("click", () => {
        alert(button.getAttribute("data-duck-line"));
      });
    });

    const form = $("#vaultForm");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const input = $("#vaultCode");
      const status = $("#vaultStatus");
      const entered = normalizeCode(input ? input.value : "");

      if (!entered) {
        if (status) status.textContent = "Access denied. Enter a code.";
        return;
      }

      try {
        const enteredHash = await sha256Hex(entered);
        if (enteredHash === LEVEL_1_HASH) {
          setUnlocked();
          if (status) status.textContent = "Access granted. Opening Level 1...";
          window.location.href = LEVEL_1_URL;
        } else {
          if (status) status.textContent = "Access denied. Duck Sauce is laughing.";
          if (input) {
            input.value = "";
            input.focus();
          }
        }
      } catch (error) {
        if (status) status.textContent = "Security check unavailable. Try again.";
      }
    });
  }

  protectVaultPage();
  bindHomepageLock();
})();
