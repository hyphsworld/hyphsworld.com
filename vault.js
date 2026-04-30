// HYPHSWORLD VAULT TRANSPORT + TERMINAL FIX
// Full rewrite of vault.js

(() => {
  "use strict";

  const ACCESS_HASHES = {
  "master": "651d8948587739f3c0aa840fd250b5b547b98a83a9b84aa24800ff1293dc8ed9",
  "level1": "651d8948587739f3c0aa840fd250b5b547b98a83a9b84aa24800ff1293dc8ed9",
  "level2": "651d8948587739f3c0aa840fd250b5b547b98a83a9b84aa24800ff1293dc8ed9"
};
  const STORAGE_KEY = "hyphsworld_vault_access";

  const PASS_STEPS = [
    { wait: 150, progress: 10, text: "Scanner warming up...", log: "Duck Sauce: hold still, player." },
    { wait: 620, progress: 28, text: "Body scan active...", log: "Checking motion signature..." },
    { wait: 620, progress: 50, text: "Reading Vault credentials...", log: "BuckTheBodyguard: credentials locked in." },
    { wait: 620, progress: 75, text: "Clearing access layer...", log: "AMS WEST access profile matched." },
    { wait: 720, progress: 100, text: "Access granted. Transport starting...", log: "ACCESS GRANTED — opening transport tunnel.", pass: true },
  ];

  const FAIL_STEPS = [
    { wait: 140, progress: 20, text: "Scanner warming up...", log: "Duck Sauce: something off with that code." },
    { wait: 620, progress: 52, text: "Checking credentials...", log: "Vault credentials not matching." },
    { wait: 700, progress: 100, text: "Access denied.", log: "ACCESS DENIED — Buck said try again.", fail: true },
  ];

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function sha256Upper(value) {
    const clean = String(value || "").trim().toUpperCase();
    const bytes = new TextEncoder().encode(clean);
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function getParts() {
    return {
      overlay: document.getElementById("bodyScanOverlay"),
      message: document.getElementById("scanMessage"),
      bar: document.getElementById("scanProgressBar"),
      log: document.getElementById("scanLog"),
      close: document.getElementById("scanClose"),
      actions: document.getElementById("transportActions"),
      manualLink: document.getElementById("manualEnterLink"),
    };
  }

  function readAccess() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveAccess(level) {
    const current = readAccess();
    current[level] = true;
    current.updatedAt = new Date().toISOString();

    if (level === "master") {
      current.master = true;
      current.level1 = true;
    }

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch (err) {
      console.warn("Session storage unavailable:", err);
    }
  }

  function addLog(text, state = "") {
    const { log } = getParts();
    if (!log) return;
    const li = document.createElement("li");
    li.textContent = text;
    if (state) li.classList.add(state);
    log.appendChild(li);
  }

  function resetOverlay() {
    const { overlay, message, bar, log, actions } = getParts();
    if (!overlay) return false;

    overlay.classList.remove("is-scanning", "is-transporting");
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("vault-scan-lock");

    if (message) message.textContent = "Scanner warming up...";
    if (bar) bar.style.width = "0%";
    if (log) log.innerHTML = "";
    if (actions) actions.hidden = true;

    overlay.getBoundingClientRect();
    return true;
  }

  function closeOverlay() {
    const { overlay, actions } = getParts();
    if (!overlay) return;
    overlay.classList.remove("is-open", "is-scanning", "is-transporting");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("vault-scan-lock");
    if (actions) actions.hidden = true;
  }

  async function playSteps(steps) {
    const { overlay, message, bar } = getParts();
    if (!overlay) return;

    overlay.classList.add("is-scanning");

    for (const step of steps) {
      await sleep(step.wait);
      if (message) message.textContent = step.text;
      if (bar) bar.style.width = `${step.progress}%`;
      if (step.log) addLog(step.log, step.pass ? "pass" : step.fail ? "fail" : "");
    }

    overlay.classList.remove("is-scanning");
  }

  function goToDestination(destination) {
    try {
      window.location.assign(destination);
    } catch (error) {
      console.warn("Navigation failed:", error);
      const { actions, manualLink, message } = getParts();
      if (manualLink) manualLink.href = destination;
      if (actions) actions.hidden = false;
      if (message) message.textContent = "Auto transport blocked. Use manual entry.";
    }
  }

  async function runTransport(destination) {
    const { overlay, actions, manualLink, message } = getParts();
    if (!overlay) return;

    if (manualLink) manualLink.href = destination;
    overlay.classList.add("is-transporting");
    if (message) message.textContent = "Transport tunnel open. Entering Vault...";

    // Manual fallback appears before auto-nav in case browser stalls.
    await sleep(1200);
    if (actions) actions.hidden = false;

    // Give the animation time to hit.
    await sleep(1100);

    goToDestination(destination);
  }

  async function handleScan(button) {
    if (!button || button.disabled) return;

    const level = button.dataset.accessLevel || "master";
    const inputId = button.dataset.inputId || "";
    const destination = button.dataset.destination || "level-1.html";
    const input = inputId ? document.getElementById(inputId) : null;
    const typed = input ? input.value : "";

    const ready = resetOverlay();
    if (!ready) return;

    button.disabled = true;

    const expectedHash = ACCESS_HASHES[level] || ACCESS_HASHES.master;
    const typedHash = await sha256Upper(typed);
    const passed = Boolean(typed.trim()) && typedHash === expectedHash;

    if (!passed) {
      await playSteps(FAIL_STEPS);
      await sleep(900);
      closeOverlay();
      button.disabled = false;
      if (input) {
        input.focus();
        input.select();
      }
      return;
    }

    saveAccess(level);
    await playSteps(PASS_STEPS);
    await runTransport(destination);
  }

  function bindEvents() {
    document.querySelectorAll("[data-scan-trigger]").forEach((button) => {
      button.addEventListener("click", () => handleScan(button));
    });

    document.querySelectorAll("[data-clear-input]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = document.getElementById(button.dataset.clearInput);
        if (target) {
          target.value = "";
          target.focus();
        }
      });
    });

    document.querySelectorAll(".vault-code-input").forEach((input) => {
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();

        const card = input.closest(".access-card");
        const button = card ? card.querySelector("[data-scan-trigger]") : null;
        if (button) handleScan(button);
      });
    });

    const { overlay, close } = getParts();

    if (close) {
      close.addEventListener("click", closeOverlay);
    }

    if (overlay) {
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closeOverlay();
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeOverlay();
    });
  }

  onReady(() => {
    bindEvents();
    window.HYPHSWORLD_VAULT_TRANSPORT_READY = true;
    console.info("HYPHSWORLD Vault transport + terminal fix loaded.");
  });
})();
