const AUTH_KEY = "hyphsworld_vault_access";
const AUTH_TIME_KEY = "hyphsworld_vault_access_time";
const ACCESS_DURATION_MS = 1000 * 60 * 60 * 4;

const ALLOWED_HASHES = [
  "651d8948587739f3c0aa840fd250b5b547b98a83a9b84aa24800ff1293dc8ed9"
];

const form = document.getElementById("accessForm");
const input = document.getElementById("accessCode");
const toggle = document.getElementById("toggleCode");
const terminal = document.getElementById("terminalCard");
const terminalStatus = document.getElementById("terminalStatus");
const message = document.getElementById("accessMessage");
const scanStage = document.getElementById("scanStage");
const scanReadout = document.getElementById("scanReadout");
const statusText = document.getElementById("statusText");
const modeText = document.getElementById("modeText");

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

async function sha256(text) {
  const encoded = new TextEncoder().encode(text);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function setMessage(text, mode = "") {
  message.textContent = text;
  message.classList.remove("error", "success");
  if (mode) message.classList.add(mode);
}

function setStatus(main, status, mode, readout) {
  terminalStatus.textContent = main;
  statusText.textContent = status;
  modeText.textContent = mode;
  scanReadout.textContent = readout;
}

function saveAccess() {
  sessionStorage.setItem(AUTH_KEY, "granted");
  sessionStorage.setItem(AUTH_TIME_KEY, String(Date.now()));
}

function hasActiveAccess() {
  const granted = sessionStorage.getItem(AUTH_KEY) === "granted";
  const time = Number(sessionStorage.getItem(AUTH_TIME_KEY) || 0);
  return granted && Date.now() - time < ACCESS_DURATION_MS;
}

function getRedirectTarget() {
  const params = new URLSearchParams(window.location.search);
  const from = params.get("from");
  const safeTargets = new Set([
    "vault.html",
    "hidden-casino.html",
    "quarantine.html",
    "level-1.html",
    "level1.html",
    "vault-level-1.html"
  ]);

  if (from && safeTargets.has(from)) return from;
  return "vault.html";
}

function resetStage() {
  scanStage.classList.remove("is-scanning", "is-cleared", "is-transporting");
}

function denyAccess() {
  terminal.classList.remove("is-unlocked");
  setStatus("Locked", "Locked", "Code Check", "Scan Ready");
  setMessage("Access denied. Duck Sauce said try that again slower.", "error");
  input.value = "";
  input.focus();

  terminal.animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-8px)" },
      { transform: "translateX(8px)" },
      { transform: "translateX(0)" }
    ],
    { duration: 220, iterations: 2 }
  );
}

function runAccessAnimation() {
  resetStage();
  terminal.classList.add("is-unlocked");
  setStatus("Scanning", "Scanning", "Body Scan", "Body Scan Active");
  setMessage("Code accepted. Running body scan…", "success");

  window.setTimeout(() => {
    scanStage.classList.add("is-scanning");
  }, 80);

  window.setTimeout(() => {
    scanStage.classList.remove("is-scanning");
    scanStage.classList.add("is-cleared");
    setStatus("Cleared", "Cleared", "Smoke Burst", "Scan Clear • Smoke Burst");
    setMessage("Access granted. Smoke burst loading…", "success");
  }, 3000);

  window.setTimeout(() => {
    scanStage.classList.add("is-transporting");
    setStatus("Transport", "Transport", "Vault Floor", "Transport Active • Vault Floor Loading");
    setMessage("Transport active. Opening Vault Floor…", "success");
  }, 4200);

  window.setTimeout(() => {
    window.location.href = getRedirectTarget();
  }, 5400);
}

if (hasActiveAccess()) {
  terminal.classList.add("is-unlocked");
  setStatus("Ready", "Unlocked", "Vault Floor", "Session Verified • Run Scan To Enter");
  setMessage("Access already active for this session.", "success");
}

toggle.addEventListener("click", () => {
  const showing = input.type === "text";
  input.type = showing ? "password" : "text";
  toggle.textContent = showing ? "Show" : "Hide";
  input.focus();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const code = normalizeCode(input.value);

  if (!code) {
    setMessage("Enter the code first P.", "error");
    input.focus();
    return;
  }

  setMessage("Checking code…");
  setStatus("Checking", "Checking", "Hash Check", "Code Hash Check");

  try {
    const hash = await sha256(code);
    if (!ALLOWED_HASHES.includes(hash)) {
      denyAccess();
      return;
    }

    saveAccess();
    runAccessAnimation();
  } catch (error) {
    console.error("HYPHSWORLD login error:", error);
    setMessage("Browser blocked the scanner. Refresh once and try again.", "error");
    setStatus("Error", "Blocked", "Refresh", "Scanner Blocked");
  }
});
