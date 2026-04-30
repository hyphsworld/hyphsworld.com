(() => {
  "use strict";

  const ACCEPTED_HASHES = new Set([
    "651d8948587739f3c0aa840fd250b5b547b98a83a9b84aa24800ff1293dc8ed9"
  ]);

  const TRANSPORT_TOKEN_KEY = "HW_LEVEL1_TRANSPORT_READY";
  const COOL_POINTS_KEY = "coolPoints";

  const PASS_STEPS = [
    { delay: 0, progress: 12, title: "Body Scan", message: "Buck locked the door. Scanner moving.", log: "SCAN BAR ACTIVE", stageClass: "scanning" },
    { delay: 900, progress: 38, title: "Body Scan", message: "Duck Sauce: “Hold still before you glitch the floor.”", log: "BODY SIGNATURE FOUND", stageClass: "scanning" },
    { delay: 1850, progress: 68, title: "Access Check", message: "Buck: “Clearance looking valid.”", log: "CODE HASH VERIFIED", stageClass: "granted" },
    { delay: 2700, progress: 88, title: "Access Granted", message: "Duck Sauce: “Aight, you in. Do not embarrass me.”", log: "ACCESS GRANTED", stageClass: "granted" },
    { delay: 3650, progress: 100, title: "Transport Initiated", message: "Bay portal online. Sliding into Level 1.", log: "TRANSPORT TUNNEL ONLINE", stageClass: "transporting" },
    { delay: 5050, progress: 100, title: "Transport Complete", message: "Welcome to Level 1 — Quarantine Mixtape Floor.", log: "ARRIVAL CONFIRMED", stageClass: "arrived" }
  ];

  const FAIL_STEPS = [
    { delay: 0, progress: 15, title: "Body Scan", message: "Buck checking access. Code better be right.", log: "SCAN STARTED", stageClass: "scanning" },
    { delay: 900, progress: 48, title: "Access Check", message: "Duck Sauce: “That code got fake shoes on.”", log: "HASH NOT ACCEPTED", stageClass: "scanning" },
    { delay: 1750, progress: 0, title: "Access Denied", message: "Buck: “Denied. Back up from the rope.”", log: "ACCESS DENIED", stageClass: "" }
  ];

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function $(selector) {
    return document.querySelector(selector);
  }

  function getParts() {
    return {
      overlay: $("#bodyScanOverlay"),
      close: $("#scanClose"),
      stage: $("#cinemaStage"),
      title: $("#scanTitle"),
      message: $("#scanMessage"),
      progress: $("#scanProgressBar"),
      log: $("#scanLog"),
      actions: $("#transportActions"),
      manual: $("#manualEnterLink"),
      gateStatus: $("#gateStatus"),
      gateMode: $("#gateMode"),
      smallMessage: $("#scanMessageSmall"),
      masterStatus: $("#masterStatus")
    };
  }

  async function sha256(text) {
    const data = new TextEncoder().encode(text.trim().toUpperCase());
    const digest = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function addCoolPoints(amount) {
    try {
      const current = Number(localStorage.getItem(COOL_POINTS_KEY) || 0);
      localStorage.setItem(COOL_POINTS_KEY, String(current + amount));
    } catch (error) {}
  }

  function grantLevelOneTransport() {
    try {
      sessionStorage.setItem(TRANSPORT_TOKEN_KEY, JSON.stringify({
        level: "level-1",
        grantedAt: Date.now(),
        route: "level-1.html",
        nonce: Math.random().toString(36).slice(2)
      }));
    } catch (error) {}
  }

  function setGateState(status, mode, note) {
    const parts = getParts();
    if (parts.gateStatus) parts.gateStatus.textContent = status;
    if (parts.gateMode) parts.gateMode.textContent = mode;
    if (parts.smallMessage) parts.smallMessage.textContent = note;
    if (parts.masterStatus && status === "APPROVED") parts.masterStatus.textContent = "UNLOCKED";
  }

  function openOverlay(destination) {
    const parts = getParts();

    if (!parts.overlay) return;

    parts.overlay.classList.add("is-active");
    parts.overlay.setAttribute("aria-hidden", "false");

    if (parts.stage) parts.stage.className = "cinema-stage";
    if (parts.progress) parts.progress.style.width = "0%";
    if (parts.log) parts.log.innerHTML = "";
    if (parts.actions) parts.actions.hidden = true;
    if (parts.manual) parts.manual.href = destination || "level-1.html";
  }

  function closeOverlay() {
    const parts = getParts();
    if (!parts.overlay) return;

    parts.overlay.classList.remove("is-active");
    parts.overlay.setAttribute("aria-hidden", "true");
  }

  function writeLog(text) {
    const parts = getParts();
    if (!parts.log) return;

    const item = document.createElement("li");
    item.textContent = text;
    parts.log.appendChild(item);
  }

  async function playSteps(steps) {
    const parts = getParts();

    for (const step of steps) {
      window.setTimeout(() => {
        if (parts.stage) {
          parts.stage.classList.remove("scanning", "granted", "transporting", "arrived");
          if (step.stageClass) parts.stage.classList.add(step.stageClass);
        }

        if (parts.title) parts.title.textContent = step.title;
        if (parts.message) parts.message.textContent = step.message;
        if (parts.progress) parts.progress.style.width = `${step.progress}%`;
        if (step.log) writeLog(step.log);
      }, step.delay);
    }

    const lastDelay = steps.length ? steps[steps.length - 1].delay : 0;
    await sleep(lastDelay + 500);
  }

  async function playGateSequence(destination) {
    const parts = getParts();
    if (parts.actions) parts.actions.hidden = false;

    await sleep(1200);

    window.location.href = destination || "level-1.html";
  }

  async function handleScan(button) {
    const level = button.dataset.accessLevel || "level1";
    const input = document.getElementById(button.dataset.inputId);
    const destination = button.dataset.destination || "level-1.html";

    if (!input) return;

    const raw = input.value.trim();

    if (!raw) {
      setGateState("STANDBY", "CODE FIRST", "Duck Sauce: “Type something first. I cannot scan air.”");
      input.focus();
      return;
    }

    button.disabled = true;
    setGateState("SCANNING", "BODY SCAN", "Buck is checking clearance. Duck Sauce is watching the scanner.");
    openOverlay(destination);

    let passed = false;

    try {
      const hash = await sha256(raw);
      passed = ACCEPTED_HASHES.has(hash);
    } catch (error) {
      setGateState("DENIED", "CRYPTO ERROR", "Browser could not run the code check.");
    }

    input.value = "";

    if (!passed) {
      await playSteps(FAIL_STEPS);
      await sleep(950);
      closeOverlay();
      setGateState("DENIED", "LOCKED", "Buck: “Denied. Button tap alone does not move the door.”");
      button.disabled = false;
      input.focus();
      return;
    }

    grantLevelOneTransport();
    addCoolPoints(level === "master" ? 50 : 25);
    setGateState("APPROVED", "TRANSPORT", "Access granted. Transport pad warming.");
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
        setGateState("STANDBY", "SCAN", "Terminal cleared. Buck reset the pad.");
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

    const parts = getParts();

    if (parts.close) parts.close.addEventListener("click", closeOverlay);

    if (parts.overlay) {
      parts.overlay.addEventListener("click", (event) => {
        if (event.target === parts.overlay) closeOverlay();
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeOverlay();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    setGateState("STANDBY", "SCAN", "Buck is posted. Duck is watching the button.");
    window.HYPHSWORLD_ACCESS_GATE_READY = true;
  });
})();
