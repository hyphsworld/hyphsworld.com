// HYPHSWORLD VAULT BODY SCAN VISUAL FIX
// Replace vault.js with this full file.
// Fixes: button works but scan visual does not show.
// Adds: forced top-layer overlay, CSS fallback, delayed transport, mobile-safe behavior.

(() => {
  "use strict";

  const ACCESS_HASHES = {
  "master": "651d8948587739f3c0aa840fd250b5b547b98a83a9b84aa24800ff1293dc8ed9",
  "level1": "651d8948587739f3c0aa840fd250b5b547b98a83a9b84aa24800ff1293dc8ed9",
  "level2": "651d8948587739f3c0aa840fd250b5b547b98a83a9b84aa24800ff1293dc8ed9"
};
  const STORAGE_KEY = "hyphsworld_vault_access";

  const SCAN_STEPS = [
    { wait: 120, progress: 10, text: "Scanner warming up...", log: "Duck Sauce: scanner on. Stop moving." },
    { wait: 620, progress: 30, text: "Body scan active...", log: "Checking motion signature..." },
    { wait: 620, progress: 52, text: "Reading Vault credentials...", log: "BuckTheBodyguard: code being verified." },
    { wait: 640, progress: 74, text: "Clearing access layer...", log: "AMS WEST identity layer matched." },
    { wait: 680, progress: 100, text: "Access granted. Transport opening...", log: "ACCESS GRANTED — transport engaged.", pass: true },
  ];

  const FAIL_STEPS = [
    { wait: 120, progress: 18, text: "Scanner warming up...", log: "Duck Sauce: hold on, this code look funny." },
    { wait: 620, progress: 46, text: "Checking credentials...", log: "Vault credentials not matching." },
    { wait: 620, progress: 100, text: "Access denied.", log: "ACCESS DENIED — Buck said try again.", fail: true },
  ];

  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  async function sha256Upper(value) {
    const clean = String(value || "").trim().toUpperCase();
    const bytes = new TextEncoder().encode(clean);
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function forceOverlayFallbackStyles() {
    if (document.getElementById("vaultScanForcedStyles")) return;

    const style = document.createElement("style");
    style.id = "vaultScanForcedStyles";
    style.textContent = `
      #bodyScanOverlay.body-scan-overlay.is-open {
        position: fixed !important;
        inset: 0 !important;
        z-index: 2147483000 !important;
        display: flex !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
        align-items: center !important;
        justify-content: center !important;
        min-height: 100vh !important;
        width: 100vw !important;
        background: radial-gradient(circle at center, rgba(57,255,136,.24), transparent 36%), rgba(0,0,0,.92) !important;
      }
      #bodyScanOverlay .scan-shell {
        position: relative !important;
        z-index: 2147483001 !important;
      }
      body.vault-scan-lock {
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(style);
  }

  function getOverlayParts() {
    const overlay = document.getElementById("bodyScanOverlay");
    return {
      overlay,
      message: document.getElementById("scanMessage"),
      bar: document.getElementById("scanProgressBar"),
      log: document.getElementById("scanLog"),
      close: document.getElementById("scanClose"),
    };
  }

  function openOverlay() {
    forceOverlayFallbackStyles();

    const { overlay, message, bar, log } = getOverlayParts();
    if (!overlay) {
      window.alert("Body Scan: overlay missing from vault.html. Replace vault.html, vault.css, and vault.js together.");
      return false;
    }

    overlay.classList.remove("is-scanning", "is-transporting");
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("vault-scan-lock");

    if (message) message.textContent = "Scanner warming up...";
    if (bar) bar.style.width = "0%";
    if (log) log.innerHTML = "";

    // Force browser paint before animation begins.
    overlay.getBoundingClientRect();

    return true;
  }

  function closeOverlay() {
    const { overlay, bar, log } = getOverlayParts();
    if (!overlay) return;

    overlay.classList.remove("is-open", "is-scanning", "is-transporting");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("vault-scan-lock");

    if (bar) bar.style.width = "0%";
    if (log) log.innerHTML = "";
  }

  function addLog(text, mode = "") {
    const { log } = getOverlayParts();
    if (!log) return;

    const item = document.createElement("li");
    item.textContent = text;
    if (mode) item.classList.add(mode);
    log.appendChild(item);
  }

  async function playScanSteps(steps) {
    const { overlay, message, bar } = getOverlayParts();
    if (!overlay) return;

    overlay.classList.add("is-scanning");

    for (const step of steps) {
      await sleep(step.wait);

      if (message) message.textContent = step.text;
      if (bar) bar.style.width = `${step.progress}%`;

      if (step.log) {
        addLog(step.log, step.pass ? "pass" : step.fail ? "fail" : "");
      }
    }

    overlay.classList.remove("is-scanning");
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
    } catch (error) {
      console.warn("Vault session storage unavailable:", error);
    }
  }

  function readAccess() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  async function handleScanClick(button) {
    if (!button || button.disabled) return;

    const level = button.dataset.accessLevel || "master";
    const inputId = button.dataset.inputId || "";
    const destination = button.dataset.destination || "level-1.html";
    const input = inputId ? document.getElementById(inputId) : null;
    const typedCode = input ? input.value : "";

    const opened = openOverlay();
    if (!opened) return;

    button.disabled = true;

    const expectedHash = ACCESS_HASHES[level] || ACCESS_HASHES.master;
    const typedHash = await sha256Upper(typedCode);
    const passed = Boolean(typedCode.trim()) && typedHash === expectedHash;

    if (!passed) {
      await playScanSteps(FAIL_STEPS);
      await sleep(900);
      closeOverlay();
      button.disabled = false;
      if (input) {
        input.focus();
        input.select();
      }
      return;
    }

    await playScanSteps(SCAN_STEPS);

    const { overlay, message } = getOverlayParts();
    if (overlay) overlay.classList.add("is-transporting");
    if (message) message.textContent = "Transport loading...";

    saveAccess(level);

    // Keep the visual on screen before the page changes.
    await sleep(1650);

    window.location.href = destination;
  }

  function bindControls() {
    document.querySelectorAll("[data-scan-trigger]").forEach((button) => {
      button.addEventListener("click", () => handleScanClick(button));
    });

    document.querySelectorAll("[data-clear-input]").forEach((button) => {
      button.addEventListener("click", () => {
        const inputId = button.dataset.clearInput;
        const input = document.getElementById(inputId);
        if (input) {
          input.value = "";
          input.focus();
        }
      });
    });

    const { overlay, close } = getOverlayParts();

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

    document.querySelectorAll(".vault-code-input").forEach((input) => {
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;

        const card = input.closest(".access-card");
        const button = card ? card.querySelector("[data-scan-trigger]") : null;

        if (button) {
          event.preventDefault();
          handleScanClick(button);
        }
      });
    });
  }

  ready(() => {
    forceOverlayFallbackStyles();
    bindControls();

    // Diagnostic marker for quick browser-console checks.
    window.HYPHSWORLD_VAULT_SCAN_READY = true;
    console.info("HYPHSWORLD Vault Scan Ready: visual overlay fix loaded.");
  });
})();
