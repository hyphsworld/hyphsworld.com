/* HYPHSWORLD LOGIN PHASE
   Static GitHub Pages access flow.
   Plain code is NOT stored here; only SHA-256 hash is stored.
   Important: front-end gates stop casual visitors, but backend auth is required for true private content.
*/

const HYPHSWORLD_AUTH_KEY = "hyphsworld_vault_access";
const HYPHSWORLD_AUTH_TIME_KEY = "hyphsworld_vault_access_time";
const HYPHSWORLD_ALLOWED_HASHES = [
  "651d8948587739f3c0aa840fd250b5b547b98a83a9b84aa24800ff1293dc8ed9"
];

const LOGIN_REDIRECT_TARGET = "vault.html";
const ACCESS_DURATION_MS = 1000 * 60 * 60 * 4; // 4 hours per browser session.

const form = document.getElementById("accessForm");
const input = document.getElementById("accessCode");
const toggle = document.getElementById("toggleCode");
const message = document.getElementById("accessMessage");
const terminal = document.getElementById("terminalCard");
const statusPill = document.getElementById("terminalStatus");
const scanStage = document.getElementById("scanStage");
const scanReadout = document.getElementById("scanReadout");

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

async function sha256(text) {
  const encoded = new TextEncoder().encode(text);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function setMessage(text, mode = "") {
  message.textContent = text;
  message.classList.remove("error", "success");
  if (mode) message.classList.add(mode);
}

function setReadout(text) {
  scanReadout.textContent = text;
}

function saveAccess() {
  sessionStorage.setItem(HYPHSWORLD_AUTH_KEY, "granted");
  sessionStorage.setItem(HYPHSWORLD_AUTH_TIME_KEY, String(Date.now()));
}

function clearScanClasses() {
  scanStage.classList.remove("scanning", "transporting");
}

function runAccessAnimation() {
  clearScanClasses();
  terminal.classList.add("unlocked");
  statusPill.textContent = "SCANNING";
  setReadout("BODY SCAN RUNNING");

  window.setTimeout(() => {
    scanStage.classList.add("scanning");
  }, 80);

  window.setTimeout(() => {
    statusPill.textContent = "ACCESS GRANTED";
    setReadout("DNA: FUNKY • BRAND: VERIFIED • DUCK: STILL TALKING");
    setMessage("Access granted. Transport charging…", "success");
  }, 2850);

  window.setTimeout(() => {
    scanStage.classList.remove("scanning");
    scanStage.classList.add("transporting");
    setReadout("TRANSPORT ACTIVE → VAULT FLOOR LOADING");
  }, 3850);

  window.setTimeout(() => {
    window.location.href = LOGIN_REDIRECT_TARGET;
  }, 5200);
}

function denyAccess() {
  terminal.classList.remove("unlocked");
  statusPill.textContent = "LOCKED";
  setReadout("SCAN READY");
  setMessage("Access denied. Duck Sauce said try that again slower.", "error");

  input.value = "";
  input.focus();

  scanStage.animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-8px)" },
      { transform: "translateX(8px)" },
      { transform: "translateX(0)" }
    ],
    {
      duration: 220,
      iterations: 2
    }
  );
}

function getExistingAccess() {
  const granted = sessionStorage.getItem(HYPHSWORLD_AUTH_KEY) === "granted";
  const timestamp = Number(sessionStorage.getItem(HYPHSWORLD_AUTH_TIME_KEY) || 0);
  const fresh = Date.now() - timestamp < ACCESS_DURATION_MS;

  return granted && fresh;
}

if (getExistingAccess()) {
  setMessage("Access already active for this session.", "success");
  statusPill.textContent = "READY";
  terminal.classList.add("unlocked");
  setReadout("SESSION VERIFIED • PRESS RUN BODY SCAN TO TRANSPORT");
}

toggle.addEventListener("click", () => {
  const showing = input.type === "text";
  input.type = showing ? "password" : "text";
  toggle.textContent = showing ? "SHOW" : "HIDE";
  input.focus();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const normalized = normalizeCode(input.value);

  if (!normalized) {
    setMessage("Enter the code first P.", "error");
    input.focus();
    return;
  }

  setMessage("Checking code…");
  setReadout("CODE HASH CHECK");

  try {
    const enteredHash = await sha256(normalized);
    const ok = HYPHSWORLD_ALLOWED_HASHES.includes(enteredHash);

    if (!ok) {
      denyAccess();
      return;
    }

    saveAccess();
    runAccessAnimation();
  } catch (error) {
    setMessage("This browser blocked the scanner. Try refreshing once.", "error");
    console.error("HYPHSWORLD login error:", error);
  }
});
