(() => {
  "use strict";

  // HYPHSWORLD VAULT ACCESS — CLEAN PUBLIC VERSION
  // No plaintext codes live in this file.
  // This is browser-side protection for GitHub Pages. For true private security,
  // code validation must move to a server/API later.

  const STORAGE_KEY = "hyphsworld_vault_session_v3";
  const ATTEMPT_KEY = "hyphsworld_vault_attempts_v3";
  const MAX_ATTEMPTS = 5;
  const COOLDOWN_MS = 5 * 60 * 1000;

  const VAULT_CONFIG = {
    master: {
      title: "Master Access",
      unlocks: ["master", "level1", "level2"],
      hash: "651d8948587739f3c0aa840fd250b5b547b98a83a9b84aa24800ff1293dc8ed9",
      successMessage: "Master access accepted. Full Vault unlocked.",
    },
    level1: {
      title: "Quarantine Mixtape",
      unlocks: ["level1"],
      hash: "651d8948587739f3c0aa840fd250b5b547b98a83a9b84aa24800ff1293dc8ed9",
      successMessage: "Level 1 unlocked. First floor open.",
    },
    level2: {
      title: "HYPHSWORLD 5",
      unlocks: ["level2"],
      hash: "REPLACE_WITH_LEVEL_2_SHA256_HASH",
      successMessage: "Level 2 unlocked. Premium floor open.",
    },
  };

  function normalizeCode(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[\s_-]+/g, "");
  }

  async function sha256(value) {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const buffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  function safeRead(key, fallback) {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function safeWrite(key, value) {
    sessionStorage.setItem(key, JSON.stringify(value));
  }

  function getAccess() {
    return safeRead(STORAGE_KEY, {});
  }

  function setAccess(access) {
    safeWrite(STORAGE_KEY, access);
  }

  function getAttempts() {
    return safeRead(ATTEMPT_KEY, {});
  }

  function setAttempts(attempts) {
    safeWrite(ATTEMPT_KEY, attempts);
  }

  function hasAccess(level) {
    const access = getAccess();
    return Boolean(access[level]);
  }

  function grant(levels) {
    const access = getAccess();
    levels.forEach((level) => {
      access[level] = true;
    });
    access.updatedAt = Date.now();
    setAccess(access);
  }

  function clearAccess() {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(ATTEMPT_KEY);
    refreshAll();
  }

  function getAttemptState(level) {
    const attempts = getAttempts();
    return attempts[level] || { count: 0, cooldownUntil: 0 };
  }

  function setAttemptState(level, state) {
    const attempts = getAttempts();
    attempts[level] = state;
    setAttempts(attempts);
  }

  function isCoolingDown(level) {
    return getAttemptState(level).cooldownUntil > Date.now();
  }

  function cooldownText(level) {
    const remaining = Math.max(0, getAttemptState(level).cooldownUntil - Date.now());
    const totalSeconds = Math.ceil(remaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function deny(level) {
    const current = getAttemptState(level);
    const nextCount = Number(current.count || 0) + 1;

    if (nextCount >= MAX_ATTEMPTS) {
      setAttemptState(level, { count: 0, cooldownUntil: Date.now() + COOLDOWN_MS });
      return { locked: true, message: "Too many tries. BuckTheBodyguard put the gate on timeout." };
    }

    setAttemptState(level, { count: nextCount, cooldownUntil: 0 });
    return { locked: false, message: `Code denied. ${MAX_ATTEMPTS - nextCount} tries left before cooldown.` };
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function updateBadges() {
    const badgeMap = {
      gateBadgeMaster: ["master", "Master"],
      gateBadgeLevel1: ["level1", "Level 1"],
      gateBadgeLevel2: ["level2", "Level 2"],
    };

    Object.entries(badgeMap).forEach(([id, [level, label]]) => {
      const el = document.getElementById(id);
      if (!el) return;
      const on = hasAccess(level);
      el.textContent = on ? `${label} Unlocked` : `${label} Locked`;
      el.className = on ? "vault-badge on" : "vault-badge off";
    });
  }

  function updateProtectedSections() {
    document.querySelectorAll("[data-required-level]").forEach((section) => {
      const level = section.dataset.requiredLevel;
      section.hidden = !hasAccess(level);
    });

    document.querySelectorAll("[data-locked-level]").forEach((section) => {
      const level = section.dataset.lockedLevel;
      section.hidden = hasAccess(level);
    });
  }

  function updateCard(card) {
    const level = card.dataset.level;
    const config = VAULT_CONFIG[level];
    if (!config) return;

    const stateEl = card.querySelector('[data-role="state"]');
    const inputEl = card.querySelector('[data-role="input"]');
    const submitEl = card.querySelector('[data-role="submit"]');
    const messageEl = card.querySelector('[data-role="message"]');
    const linksEl = card.querySelector('[data-role="links"]');

    const unlocked = hasAccess(level);
    const cooling = isCoolingDown(level);

    if (stateEl) {
      stateEl.className = unlocked ? "vault-state unlocked" : cooling ? "vault-state cooldown" : "vault-state ready";
      stateEl.textContent = unlocked ? "Unlocked" : cooling ? "Cooldown" : "Locked";
    }

    if (inputEl) {
      inputEl.disabled = unlocked || cooling;
      inputEl.value = unlocked ? "" : inputEl.value;
      inputEl.placeholder = unlocked ? "ACCESS GRANTED" : level === "master" ? "ENTER MAIN CODE" : "ENTER CODE";
      inputEl.autocomplete = "off";
      inputEl.spellcheck = false;
    }

    if (submitEl) submitEl.disabled = unlocked || cooling;
    if (linksEl) linksEl.hidden = !unlocked;

    if (messageEl) {
      messageEl.className = unlocked ? "vault-message ok" : cooling ? "vault-message bad" : "vault-message";
      messageEl.textContent = unlocked
        ? config.successMessage
        : cooling
          ? `Gate cooling down. Try again in ${cooldownText(level)}.`
          : "Code required. Nothing public, nothing loose.";
    }
  }

  function refreshAll() {
    updateBadges();
    updateProtectedSections();
    document.querySelectorAll("[data-level]").forEach(updateCard);
    setText("vaultAccessStatus", hasAccess("level1") || hasAccess("level2") ? "YOU MADE IT IN." : "RESTRICTED ACCESS");
  }

  async function handleSubmit(event, card) {
    event.preventDefault();

    const level = card.dataset.level;
    const config = VAULT_CONFIG[level];
    if (!config) return;

    const inputEl = card.querySelector('[data-role="input"]');
    const messageEl = card.querySelector('[data-role="message"]');
    const submitted = normalizeCode(inputEl ? inputEl.value : "");

    if (!submitted) {
      if (messageEl) {
        messageEl.className = "vault-message bad";
        messageEl.textContent = "Enter a code first.";
      }
      return;
    }

    if (isCoolingDown(level)) {
      refreshAll();
      return;
    }

    if (!config.hash || config.hash.startsWith("REPLACE_WITH")) {
      if (messageEl) {
        messageEl.className = "vault-message bad";
        messageEl.textContent = "This level code has not been activated yet.";
      }
      return;
    }

    const submittedHash = await sha256(submitted);
    if (submittedHash === config.hash) {
      grant(config.unlocks);
      setAttemptState(level, { count: 0, cooldownUntil: 0 });
      if (inputEl) inputEl.value = "";
      if (typeof window.gtag === "function") {
        window.gtag("event", "vault_unlock", { level, title: config.title });
      }
      refreshAll();
      return;
    }

    const result = deny(level);
    if (messageEl) {
      messageEl.className = "vault-message bad";
      messageEl.textContent = result.message;
    }
    if (typeof window.gtag === "function") {
      window.gtag("event", "vault_denied", { level });
    }
    refreshAll();
  }

  function bindCard(card) {
    const form = card.querySelector('[data-role="form"]');
    const input = card.querySelector('[data-role="input"]');
    const clear = card.querySelector('[data-role="clear"]');

    if (form) form.addEventListener("submit", (event) => handleSubmit(event, card));
    if (input) input.addEventListener("input", () => { input.value = input.value.toUpperCase(); });
    if (clear) clear.addEventListener("click", () => { if (input) input.value = ""; refreshAll(); });
  }

  function protectVaultPage() {
    const restrictedPage = document.body && document.body.dataset.vaultRestricted === "true";
    if (!restrictedPage) return;
    if (!hasAccess("level1") && !hasAccess("level2")) {
      window.location.replace("vault-gate.html");
    }
  }

  function init() {
    document.querySelectorAll("[data-level]").forEach(bindCard);
    document.querySelectorAll("[data-role='reset-vault']").forEach((button) => {
      button.addEventListener("click", clearAccess);
    });
    protectVaultPage();
    refreshAll();
    window.setInterval(refreshAll, 1000);
  }

  window.HYPHSWORLD_VAULT = {
    clearAccess,
    refresh: refreshAll,
    hashPreview: sha256,
  };

  document.addEventListener("DOMContentLoaded", init);
})();
