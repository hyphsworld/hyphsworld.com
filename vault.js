(() => {
  "use strict";

  const ACCEPTED_HASHES = new Set([
    "651d8948587739f3c0aa840fd250b5b547b98a83a9b84aa24800ff1293dc8ed9"
  ]);

  const DESTINATION = "level-1.html";
  const COOL_POINTS_KEY = "coolPoints";
  const TRANSPORT_KEY = "HW_LEVEL1_TRANSPORT_READY";

  const duckLines = [
    "“Aye the pad moving now. Don’t freeze up.”",
    "“If it start smoking, that means it like you.”",
    "“Buck too serious. I would’ve let you in off vibes.”",
    "“Type the code clean. This ain’t a microwave.”"
  ];

  const buckLines = [
    "“Code first. Scan second. No shortcuts.”",
    "“Stand still. The scan bar is active.”",
    "“Access depends on clearance, not confidence.”",
    "“I see everything touching this gate.”"
  ];

  const passSteps = [
    { delay: 0, progress: 12, status: "SCANNING", title: "Body Scan", message: "Buck: “Scanner live. Do not move.”", log: "SCAN BAR ACTIVE", visual: "scanning" },
    { delay: 850, progress: 34, status: "SCANNING", title: "Body Scan", message: "Duck Sauce: “The lights dancing now.”", log: "BODY TARGET LOCKED", visual: "scanning" },
    { delay: 1700, progress: 61, status: "VERIFYING", title: "Code Check", message: "Buck: “Code hash is being verified.”", log: "CODE CHECK RUNNING", visual: "scanning" },
    { delay: 2450, progress: 82, status: "APPROVED", title: "Access Granted", message: "Duck Sauce: “Aight, you in. Don’t act regular.”", log: "ACCESS GRANTED", visual: "granted" },
    { delay: 3300, progress: 100, status: "TRANSPORT", title: "Transport", message: "Level 1 portal opening. Quarantine Mixtape floor ready.", log: "TRANSPORT TUNNEL ONLINE", visual: "transporting" }
  ];

  const failSteps = [
    { delay: 0, progress: 18, status: "SCANNING", title: "Body Scan", message: "Buck: “Checking it now.”", log: "SCAN STARTED", visual: "scanning" },
    { delay: 850, progress: 46, status: "VERIFYING", title: "Code Check", message: "Duck Sauce: “That code got fake shoes on.”", log: "HASH NOT ACCEPTED", visual: "scanning" },
    { delay: 1600, progress: 0, status: "DENIED", title: "Access Denied", message: "Buck: “Denied. Back up from the rope.”", log: "ACCESS DENIED", visual: "" }
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
  }

  function setStatus(status, pad, message) {
    setText("gateStatus", status);
    setText("padStatus", pad);
    setText("consoleMessage", message);
  }

  function rotateChatter() {
    const duck = duckLines[Math.floor(Math.random() * duckLines.length)];
    const buck = buckLines[Math.floor(Math.random() * buckLines.length)];

    setText("duckLine", duck);
    setText("buckLine", buck);
  }

  async function sha256(text) {
    const encoded = new TextEncoder().encode(text.trim().toUpperCase());
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function openOverlay() {
    const overlay = $("scanOverlay");
    const visual = $("scanVisual");

    if (overlay) {
      overlay.classList.add("is-active");
      overlay.setAttribute("aria-hidden", "false");
    }

    if (visual) {
      visual.className = "scan-visual";
    }

    setText("scanTitle", "Body Scan");
    setText("scanMessage", "Scanner warming up...");
    if ($("progressBar")) $("progressBar").style.width = "0%";
    if ($("scanLog")) $("scanLog").innerHTML = "";
    if ($("manualEnter")) $("manualEnter").hidden = true;
  }

  function closeOverlay() {
    const overlay = $("scanOverlay");
    if (overlay) {
      overlay.classList.remove("is-active");
      overlay.setAttribute("aria-hidden", "true");
    }
  }

  function addLog(text) {
    const log = $("scanLog");
    if (!log) return;

    const li = document.createElement("li");
    li.textContent = text;
    log.appendChild(li);
  }

  function runSteps(steps) {
    const visual = $("scanVisual");

    steps.forEach((step) => {
      setTimeout(() => {
        setStatus(step.status, step.visual ? "ACTIVE" : "LOCKED", step.message);
        setText("scanTitle", step.title);
        setText("scanMessage", step.message);

        if ($("progressBar")) $("progressBar").style.width = `${step.progress}%`;

        if (visual) {
          visual.classList.remove("scanning", "granted", "transporting");
          if (step.visual) visual.classList.add(step.visual);
        }

        addLog(step.log);
      }, step.delay);
    });

    const last = steps[steps.length - 1] ? steps[steps.length - 1].delay : 0;
    return new Promise((resolve) => setTimeout(resolve, last + 650));
  }

  function addCoolPoints(amount) {
    try {
      const current = Number(localStorage.getItem(COOL_POINTS_KEY) || 0);
      localStorage.setItem(COOL_POINTS_KEY, String(current + amount));
    } catch (error) {}
  }

  function grantTransport() {
    try {
      sessionStorage.setItem(TRANSPORT_KEY, JSON.stringify({
        route: DESTINATION,
        grantedAt: Date.now(),
        nonce: Math.random().toString(36).slice(2)
      }));
    } catch (error) {}
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const input = $("accessCode");
    const button = document.querySelector(".scan-button");

    if (!input) return;

    const code = input.value.trim();

    if (!code) {
      setStatus("STANDBY", "MOVING", "Duck Sauce: “Type the code first. I can’t scan blank air.”");
      input.focus();
      return;
    }

    if (button) button.disabled = true;

    openOverlay();
    setStatus("SCANNING", "ACTIVE", "Buck is running the scanner. Duck is touching buttons he should not touch.");

    let passed = false;

    try {
      const hash = await sha256(code);
      passed = ACCEPTED_HASHES.has(hash);
    } catch (error) {
      passed = false;
    }

    input.value = "";

    if (!passed) {
      await runSteps(failSteps);
      setTimeout(() => {
        closeOverlay();
        setStatus("DENIED", "MOVING", "Buck denied the gate. Try the correct code.");
        if (button) button.disabled = false;
        input.focus();
      }, 900);
      return;
    }

    grantTransport();
    addCoolPoints(50);

    await runSteps(passSteps);

    const manual = $("manualEnter");
    if (manual) manual.hidden = false;

    setTimeout(() => {
      window.location.href = DESTINATION;
    }, 900);
  }

  function bind() {
    const form = $("gateForm");
    const clear = $("clearCode");
    const close = $("closeOverlay");

    if (form) form.addEventListener("submit", handleSubmit);

    if (clear) {
      clear.addEventListener("click", () => {
        const input = $("accessCode");
        if (input) {
          input.value = "";
          input.focus();
        }
        setStatus("STANDBY", "MOVING", "Terminal cleared. Pad still live.");
      });
    }

    if (close) close.addEventListener("click", closeOverlay);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeOverlay();
    });

    const overlay = $("scanOverlay");
    if (overlay) {
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closeOverlay();
      });
    }

    rotateChatter();
    setInterval(rotateChatter, 4200);
  }

  document.addEventListener("DOMContentLoaded", () => {
    bind();
    setStatus("STANDBY", "MOVING", "Pad is live. Enter code and run the scan.");
    window.HYPHSWORLD_ACCESS_PAD_LIVE = true;
  });
})();
