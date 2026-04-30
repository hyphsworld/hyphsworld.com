/* HYPHSWORLD CLEAN VAULT FLOOR
   Runs the gate scan, opens scan-bar doors, and transports to Level 1.
*/

const scanButton = document.getElementById("runVaultScan");
const scanStage = document.getElementById("vaultScanStage");
const scanReadout = document.getElementById("scanReadout");
const gateStatus = document.getElementById("gateStatus");
const padStatus = document.getElementById("padStatus");
const padMode = document.getElementById("padMode");
const vaultNote = document.getElementById("vaultNote");
const transportOverlay = document.getElementById("transportOverlay");

const levelOneCandidates = [
  "quarantine.html",
  "level-1.html",
  "level1.html",
  "vault-level-1.html"
];

function setReadout(text) {
  scanReadout.textContent = text;
}

function setGate(status, pad, mode, note) {
  gateStatus.textContent = status;
  padStatus.textContent = pad;
  padMode.textContent = mode;
  if (note) vaultNote.textContent = note;
}

async function findLevelOneUrl() {
  for (const url of levelOneCandidates) {
    try {
      const response = await fetch(url, { method: "HEAD", cache: "no-store" });
      if (response.ok) return url;
    } catch (error) {
      // Keep trying candidates.
    }
  }

  return "quarantine.html";
}

function resetScanClasses() {
  scanStage.classList.remove("is-scanning", "is-opening", "is-transporting");
}

async function runVaultScan() {
  resetScanClasses();

  scanButton.disabled = true;
  scanButton.textContent = "Scanning...";
  setGate("SCANNING", "Scanning", "Body Scan", "Body scan running. Duck Sauce is talking through the whole thing.");
  setReadout("BODY SCAN ACTIVE");

  window.setTimeout(() => {
    scanStage.classList.add("is-scanning");
  }, 80);

  window.setTimeout(() => {
    setGate("CLEARED", "Cleared", "Door", "Scan clear. Scan-bar door opening.");
    setReadout("SCAN CLEAR • OPENING SCAN-BAR DOOR");
    scanStage.classList.remove("is-scanning");
    scanStage.classList.add("is-opening");
  }, 3000);

  window.setTimeout(() => {
    setGate("TRANSPORT", "Transport", "Level 1", "Transport charging. Level 1 loading.");
    setReadout("TRANSPORT ACTIVE • LEVEL 1 LOADING");
    scanStage.classList.add("is-transporting");
  }, 4300);

  window.setTimeout(async () => {
    transportOverlay.classList.add("is-active");
    transportOverlay.setAttribute("aria-hidden", "false");
    const destination = await findLevelOneUrl();
    window.location.href = destination;
  }, 5600);
}

if (scanButton) {
  scanButton.addEventListener("click", runVaultScan);
}
