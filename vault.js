// HYPHSWORLD PHASE A — GATE 2.0
// Full replacement for vault.js

(() => {
  "use strict";

  const ACCESS_HASHES = {
  "master": "651d8948587739f3c0aa840fd250b5b547b98a83a9b84aa24800ff1293dc8ed9",
  "level1": "651d8948587739f3c0aa840fd250b5b547b98a83a9b84aa24800ff1293dc8ed9",
  "level2": "651d8948587739f3c0aa840fd250b5b547b98a83a9b84aa24800ff1293dc8ed9"
};
  const STORAGE_KEY = "hyphsworld_vault_access";

  const PASS_STEPS = [
    { wait: 160, progress: 8, text: "Scanner warming up...", log: "Duck Sauce: scanner on. Stand still." },
    { wait: 560, progress: 24, text: "Body scan active...", log: "Reading body signature..." },
    { wait: 620, progress: 46, text: "Checking access code...", log: "BuckTheBodyguard: credentials in review." },
    { wait: 620, progress: 68, text: "Clearing Vault terminal...", log: "AMS WEST access layer matched." },
    { wait: 700, progress: 100, text: "Access granted. Gate opening...", log: "ACCESS GRANTED — scan-bar door opening.", pass: true }
  ];

  const FAIL_STEPS = [
    { wait: 140, progress: 18, text: "Scanner warming up...", log: "Duck Sauce: wait... that code looking suspicious." },
    { wait: 620, progress: 52, text: "Checking credentials...", log: "Vault credentials not matching." },
    { wait: 720, progress: 100, text: "Access denied.", log: "ACCESS DENIED — Buck said try again.", fail: true }
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
      .map((byte) => byte.toString(16).padStart(2, "0"))
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
      manualLink: document.getElementById("manualEnterLink")
    };
  }

  function injectFallbackStyles() {
    if (document.getElementById("hyphsworldPhaseAFallbackStyles")) return;

    const style = document.createElement("style");
    style.id = "hyphsworldPhaseAFallbackStyles";
    style.textContent = `
      #bodyScanOverlay.is-open {
        position: fixed !important;
        inset: 0 !important;
        z-index: 2147483000 !important;
        display: flex !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
      }
      body.vault-scan-lock {
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(style);
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
    } catch (error) {
      console.warn("Session storage unavailable:", error);
    }
  }


  function grantLevelOneTransport() {
    try {
      sessionStorage.setItem('HW_LEVEL1_TRANSPORT_V6', JSON.stringify({
        level: 'level-one',
        route: 'quarantine-mixtape',
        grantedAt: Date.now()
      }));
    } catch (error) {
      console.warn('Transport token unavailable:', error);
    }
  }

  function addLog(text, state = "") {
    const { log } = getParts();
    if (!log) return;

    const item = document.createElement("li");
    item.textContent = text;

    if (state) {
      item.classList.add(state);
    }

    log.appendChild(item);
  }

  function resetOverlay() {
    const { overlay, message, bar, log, actions } = getParts();
    if (!overlay) {
      return false;
    }

    injectFallbackStyles();

    overlay.classList.remove(
      "is-open",
      "is-scanning",
      "is-granted",
      "is-door-opening",
      "is-smoke",
      "is-disintegrating",
      "is-transporting",
      "is-arriving"
    );

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

    overlay.classList.remove(
      "is-open",
      "is-scanning",
      "is-granted",
      "is-door-opening",
      "is-smoke",
      "is-disintegrating",
      "is-transporting",
      "is-arriving"
    );

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

      if (step.log) {
        addLog(step.log, step.pass ? "pass" : step.fail ? "fail" : "");
      }
    }

    overlay.classList.remove("is-scanning");
  }

  function resolveDestination(destination) {
    const clean = String(destination || "").trim();
    if (!clean || clean === "#" || clean === "/") return "level-1.html";
    return clean;
  }

  async function playGateSequence(destination) {
    const finalDestination = resolveDestination(destination);
    const { overlay, message, actions, manualLink } = getParts();

    if (!overlay) {
      window.location.href = finalDestination;
      return;
    }

    if (manualLink) {
      manualLink.href = finalDestination;
    }

    overlay.classList.add("is-granted");

    if (message) {
      message.textContent = "Access granted. Opening scan-bar door...";
    }

    await sleep(820);

    overlay.classList.add("is-door-opening");

    if (message) {
      message.textContent = "Scan-bar door opening...";
    }

    await sleep(920);

    overlay.classList.add("is-smoke");

    if (message) {
      message.textContent = "Smoke burst detected. Transport preparing...";
    }

    await sleep(760);

    overlay.classList.add("is-disintegrating");

    if (message) {
      message.textContent = "Body signature dissolving...";
    }

    await sleep(1120);

    overlay.classList.add("is-transporting");

    if (message) {
      message.textContent = "Transport tunnel open...";
    }

    await sleep(1380);

    overlay.classList.add("is-arriving");

    if (message) {
      message.textContent = "Transport complete. Welcome to Level 1.";
    }

    await sleep(900);

    if (actions) {
      actions.hidden = false;
    }

    await sleep(650);

    window.location.href = finalDestination;
  }

  async function handleScan(button) {
    if (!button || button.disabled) return;

    const level = button.dataset.accessLevel || "master";
    const inputId = button.dataset.inputId || "";
    const destination = resolveDestination(button.dataset.destination || "level-1.html");
    const input = inputId ? document.getElementById(inputId) : null;
    const typed = input ? input.value : "";

    const ready = resetOverlay();
    if (!ready) return;

    button.disabled = true;

    const expectedHash = ACCESS_HASHES[level] || ACCESS_HASHES.master;
    const typedHash = await sha256Upper(typed);
    const passed = Boolean(String(typed).trim()) && typedHash === expectedHash;

    if (!passed) {
      await playSteps(FAIL_STEPS);
      await sleep(950);
      closeOverlay();
      button.disabled = false;

      if (input) {
        input.focus();
        input.select();
      }

      return;
    }

    saveAccess(level);
    grantLevelOneTransport();
    await playSteps(PASS_STEPS);
    await playGateSequence(destination);
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

        if (button) {
          handleScan(button);
        }
      });
    });

    const { overlay, close } = getParts();

    if (close) {
      close.addEventListener("click", closeOverlay);
    }

    if (overlay) {
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
          closeOverlay();
        }
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeOverlay();
      }
    });
  }

  onReady(() => {
    injectFallbackStyles();
    bindEvents();
    window.HYPHSWORLD_PHASE_A_GATE_READY = true;
    console.info("HYPHSWORLD Phase A Gate 2.0 loaded.");
  });
})();
