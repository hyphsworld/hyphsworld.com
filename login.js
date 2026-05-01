const AUTH_KEY = "hyphsworld_vault_access";
const AUTH_TIME_KEY = "hyphsworld_vault_access_time";
const ACCESS_DURATION_MS = 1000 * 60 * 60 * 4;
const ALLOWED_HASHES = ["651d8948587739f3c0aa840fd250b5b547b98a83a9b84aa24800ff1293dc8ed9"];
const ALLOWED_TARGETS = new Set([
  "vault.html",
  "hidden-casino.html",
  "quarantine-mixtape.html",
  "level-1.html",
  "level1.html",
  "vault-level-1.html",
  "floor1.html",
  "floor2.html",
  "level-2.html",
]);

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
const scannerMode = document.getElementById("scannerMode");
const scanLineA = document.getElementById("scanLineA");
const scanLineB = document.getElementById("scanLineB");
const scanLineC = document.getElementById("scanLineC");

function normalize(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

async function sha256(value) {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error("Web Crypto API unavailable");
  }

  const data = new TextEncoder().encode(value);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buffer))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

function msg(text, cls = "") {
  message.textContent = text;
  message.classList.remove("error", "success");
  if (cls) message.classList.add(cls);
}

function setStatus(main, status, mode, scanner, readout, a, b, c) {
  terminalStatus.textContent = main;
  statusText.textContent = status;
  modeText.textContent = mode;
  scannerMode.textContent = scanner;
  scanReadout.textContent = readout;
  scanLineA.textContent = a;
  scanLineB.textContent = b;
  scanLineC.textContent = c;
}

function saveAccess() {
  sessionStorage.setItem(AUTH_KEY, "granted");
  sessionStorage.setItem(AUTH_TIME_KEY, String(Date.now()));
}

function hasAccess() {
  const granted = sessionStorage.getItem(AUTH_KEY) === "granted";
  const time = Number(sessionStorage.getItem(AUTH_TIME_KEY) || 0);
  return granted && Date.now() - time < ACCESS_DURATION_MS;
}

function target() {
  const from = new URLSearchParams(location.search).get("from");
  return ALLOWED_TARGETS.has(from) ? from : "vault.html";
}

function reset() {
  scanStage.classList.remove("is-checking", "is-scanning", "is-cleared", "is-opening", "is-transporting");
}

function deny() {
  terminal.classList.remove("is-unlocked");
  reset();
  setStatus("Locked", "Locked", "Code Check", "Denied", "ACCESS DENIED", "DNA: BLOCKED", "BRAND: LOCKED", "DUCK: LAUGHING");
  msg("Access denied. Duck Sauce said try that again slower.", "error");
  input.value = "";
  input.focus();
  terminal.animate(
    [{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "translateX(0)" }],
    { duration: 220, iterations: 2 }
  );
}

function run() {
  reset();
  terminal.classList.add("is-unlocked");
  scanStage.classList.add("is-checking");
  setStatus("Scanning", "Scanning", "Bio Rails", "Rail Sweep", "RAIL SWEEP ACTIVE", "DNA: READING", "BRAND: AMS WEST", "DUCK: TALKING FAST");
  msg("Code accepted. High-tech scan running…", "success");

  setTimeout(() => {
    scanStage.classList.add("is-scanning");
    setStatus("Scanning", "Scanning", "Body Scan", "Live", "BODY SCAN ACTIVE", "DNA: LOCKING", "BRAND: VERIFIED", "DUCK: STILL TALKING");
  }, 700);

  setTimeout(() => {
    scanStage.classList.remove("is-scanning");
    scanStage.classList.add("is-cleared");
    setStatus("Cleared", "Cleared", "Smoke Burst", "Cleared", "ACCESS GRANTED", "DNA: FUNKY", "BRAND: VERIFIED", "DUCK: TOO LOUD");
    msg("Access granted. Smoke burst loading…", "success");
  }, 3200);

  setTimeout(() => {
    scanStage.classList.add("is-transporting");
    setStatus("Transport", "Transport", "Vault Floor", "Transport", "TRANSPORT ACTIVE", "DNA: SAVED", "BRAND: LIVE", "DUCK: IN THE WAY");
    msg("Transport active. Opening Vault Floor…", "success");
  }, 4450);

  setTimeout(() => {
    location.href = target();
  }, 5700);
}

if (hasAccess()) {
  terminal.classList.add("is-unlocked");
  setStatus("Ready", "Unlocked", "Vault Floor", "Ready", "SESSION VERIFIED", "DNA: READY", "BRAND: VERIFIED", "DUCK: TALKING");
  msg("Access already active for this session. Redirecting…", "success");
  setTimeout(() => {
    location.href = target();
  }, 1200);
}

toggle.addEventListener("click", () => {
  const showing = input.type === "text";
  input.type = showing ? "password" : "text";
  toggle.textContent = showing ? "Show" : "Hide";
  input.focus();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = normalize(input.value);

  if (!code) {
    msg("Enter the code first P.", "error");
    input.focus();
    return;
  }

  reset();
  scanStage.classList.add("is-checking");
  msg("Checking code…");
  setStatus("Checking", "Checking", "Hash Check", "Code Check", "CODE HASH CHECK", "DNA: WAITING", "BRAND: WAITING", "DUCK: LISTENING");

  try {
    const hash = await sha256(code);
    if (!ALLOWED_HASHES.includes(hash)) {
      deny();
      return;
    }

    saveAccess();
    run();
  } catch (error) {
    console.error(error);
    msg("Browser blocked secure hashing. Open this site over HTTPS and try again.", "error");
  }
});
