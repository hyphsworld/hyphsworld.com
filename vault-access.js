// File: vault-access.js
(() => {
  const STORAGE_KEY = "hyphsworld_vault_access_v2";
  const MAX_ATTEMPTS = 5;
  const COOLDOWN_MS = 5 * 60 * 1000;

  const VAULT_CONFIG = {
    master: {
      title: "Master Access",
      codes: ["510", "HYPH510", "MASTER510", "ALLACCESS"],
      successMessage: "Master code accepted. Full Vault unlocked.",
    },
    level1: {
      title: "Quarantine Mixtape",
      codes: ["QUARANTINE", "QUARANTINE2026", "LEVEL1", "510Q"],
      successMessage: "Level 1 unlocked. Hidden era open.",
    },
    level2: {
      title: "HYPHSWORLD 5",
      codes: ["WORLD5", "HYPHSWORLD5", "LEVEL2", "510W5"],
      successMessage: "Level 2 unlocked. Current pressure open.",
    },
  };

  function normalizeCode(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[\s_-]+/g, "");
  }

  function getStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function setStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function defaultState() {
    return {
      unlocked: false,
      attempts: 0,
      cooldownUntil: 0,
    };
  }

  function getLevelState(level) {
    const store = getStore();
    const entry = store[level];

    if (!entry || typeof entry !== "object") {
      return defaultState();
    }

    return {
      unlocked: Boolean(entry.unlocked),
      attempts: Number.isFinite(entry.attempts) ? entry.attempts : 0,
      cooldownUntil: Number.isFinite(entry.cooldownUntil) ? entry.cooldownUntil : 0,
    };
  }

  function setLevelState(level, nextState) {
    const store = getStore();
    store[level] = {
      unlocked: Boolean(nextState.unlocked),
      attempts: Number(nextState.attempts) || 0,
      cooldownUntil: Number(nextState.cooldownUntil) || 0,
    };
    setStore(store);
  }

  function unlockSingle(level) {
    setLevelState(level, {
      unlocked: true,
      attempts: 0,
      cooldownUntil: 0,
    });
  }

  function unlockAllLevels() {
    unlockSingle("master");
    unlockSingle("level1");
    unlockSingle("level2");
  }

  function isCoolingDown(state) {
    return state.cooldownUntil > Date.now();
  }

  function formatRemaining(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function addPoints(amount, reason) {
    if (window.HYPHSWORLD_POINTS && typeof window.HYPHSWORLD_POINTS.add === "function") {
      window.HYPHSWORLD_POINTS.add(amount);
    }

    if (typeof window.gtag === "function") {
      window.gtag("event", "vault_reward", { amount, reason });
    }
  }

  function updateCardUI(card, level) {
    const config = VAULT_CONFIG[level];
    const state = getLevelState(level);
    const stateEl = card.querySelector('[data-role="state"]');
    const inputEl = card.querySelector('[data-role="input"]');
    const submitEl = card.querySelector('[data-role="submit"]');
    const messageEl = card.querySelector('[data-role="message"]');
    const linksEl = card.querySelector('[data-role="links"]');

    stateEl.className = "vault-state";
    messageEl.className = "vault-message";

    if (state.unlocked) {
      stateEl.classList.add("unlocked");
      stateEl.textContent = "Unlocked";
      inputEl.disabled = true;
      submitEl.disabled = true;
      inputEl.placeholder = "ACCESS GRANTED";
      messageEl.classList.add("ok");
      messageEl.textContent = config.successMessage;
      linksEl.hidden = false;
      return;
    }

    linksEl.hidden = true;

    if (isCoolingDown(state)) {
      stateEl.classList.add("cooldown");
      stateEl.textContent = "Cooldown";
      inputEl.disabled = true;
      submitEl.disabled = true;
      messageEl.classList.add("bad");
      messageEl.textContent = `Too many tries. Wait ${formatRemaining(state.cooldownUntil - Date.now())}.`;
      return;
    }

    stateEl.classList.add("ready");
    stateEl.textContent = "Ready";
    inputEl.disabled = false;
    submitEl.disabled = false;
    inputEl.placeholder =
      level === "master"
        ? "MAIN CODE"
        : level === "level1"
          ? "LEVEL 1 CODE"
          : "LEVEL 2 CODE";

    if (!messageEl.textContent) {
      messageEl.textContent = "Enter a valid code to unlock access.";
    }
  }

  function refreshAllCards() {
    document.querySelectorAll("[data-level]").forEach((card) => {
      const level = card.dataset.level;
      if (level && VAULT_CONFIG[level]) {
        updateCardUI(card, level);
      }
    });
  }

  function unlockLevel(level, card) {
    if (level === "master") {
      unlockAllLevels();
      refreshAllCards();
      addPoints(50, "master_unlock");

      if (typeof window.gtag === "function") {
        window.gtag("event", "vault_unlock", {
          level: "master",
          title: VAULT_CONFIG.master.title,
        });
      }
      return;
    }

    unlockSingle(level);
    updateCardUI(card, level);
    addPoints(25, `${level}_unlock`);

    if (typeof window.gtag === "function") {
      window.gtag("event", "vault_unlock", {
        level,
        title: VAULT_CONFIG[level].title,
      });
    }
  }

  function failLevel(level, card) {
    const currentState = getLevelState(level);
    const attempts = currentState.attempts + 1;

    const nextState = {
      unlocked: false,
      attempts,
      cooldownUntil: 0,
    };

    if (attempts >= MAX_ATTEMPTS) {
      nextState.attempts = 0;
      nextState.cooldownUntil = Date.now() + COOLDOWN_MS;
    }

    setLevelState(level, nextState);

    const messageEl = card.querySelector('[data-role="message"]');
    messageEl.className = "vault-message bad";

    if (nextState.cooldownUntil > Date.now()) {
      messageEl.textContent = `Too many tries. Wait ${formatRemaining(nextState.cooldownUntil - Date.now())}.`;
    } else {
      messageEl.textContent = `Code denied. ${MAX_ATTEMPTS - attempts} tries left before cooldown.`;
    }

    updateCardUI(card, level);

    if (typeof window.gtag === "function") {
      window.gtag("event", "vault_denied", {
        level,
        attempts,
      });
    }
  }

  function bindCard(card) {
    const level = card.dataset.level;
    const config = VAULT_CONFIG[level];
    if (!config) return;

    const form = card.querySelector('[data-role="form"]');
    const input = card.querySelector('[data-role="input"]');
    const clearButton = card.querySelector('[data-role="clear"]');
    const messageEl = card.querySelector('[data-role="message"]');
    const validCodes = new Set(config.codes.map(normalizeCode));

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const state = getLevelState(level);
      if (state.unlocked || isCoolingDown(state)) {
        updateCardUI(card, level);
        return;
      }

      const submittedCode = normalizeCode(input.value);

      if (!submittedCode) {
        messageEl.className = "vault-message bad";
        messageEl.textContent = "Enter a code first.";
        return;
      }

      if (validCodes.has(submittedCode)) {
        unlockLevel(level, card);
        return;
      }

      failLevel(level, card);
    });

    clearButton.addEventListener("click", () => {
      input.value = "";
      if (!getLevelState(level).unlocked) {
        messageEl.className = "vault-message";
        messageEl.textContent = "Enter a valid code to unlock access.";
      }
    });

    input.addEventListener("input", () => {
      input.value = input.value.toUpperCase();
    });

    updateCardUI(card, level);
  }

  function startCooldownRefresh() {
    window.setInterval(() => {
      refreshAllCards();
    }, 1000);
  }

  function init() {
    const cards = Array.from(document.querySelectorAll("[data-level]"));
    if (!cards.length) return;

    cards.forEach(bindCard);
    refreshAllCards();
    startCooldownRefresh();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
