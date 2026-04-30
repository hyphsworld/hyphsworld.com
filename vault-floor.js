const scanButton = document.getElementById("runVaultScan");
const scanStage = document.getElementById("scanStage");
const scanReadout = document.getElementById("scanReadout");
const gateStatus = document.getElementById("gateStatus");
const statusText = document.getElementById("statusText");
const modeText = document.getElementById("modeText");
const heroNote = document.getElementById("heroNote");
const transportOverlay = document.getElementById("transportOverlay");

const spinButton = document.getElementById("spinButton");
const rulesButton = document.getElementById("rulesButton");
const closeRules = document.getElementById("closeRules");
const rulesModal = document.getElementById("rulesModal");
const slotStatus = document.getElementById("slotStatus");
const slotMessage = document.getElementById("slotMessage");
const reelEls = [
  document.getElementById("reel1"),
  document.getElementById("reel2"),
  document.getElementById("reel3")
];
const pointsDisplay = document.getElementById("pointsDisplay");
const coolPointsText = document.getElementById("coolPointsText");

const levelOneCandidates = ["quarantine.html", "level-1.html", "level1.html", "vault-level-1.html"];
const SLOT_ICONS = ["💨", "🎰", "💎", "01", "AMS", "💰", "7"];

function getPoints() {
  return Number(localStorage.getItem("hyphsworld_cool_points") || 0);
}
function setPoints(value) {
  localStorage.setItem("hyphsworld_cool_points", String(value));
  if (pointsDisplay) pointsDisplay.textContent = value;
  if (coolPointsText) coolPointsText.textContent = value;
}
setPoints(getPoints());

function resetScanClasses() {
  scanStage.classList.remove("is-scanning", "is-opening", "is-transporting");
}

async function findLevelOneUrl() {
  for (const url of levelOneCandidates) {
    try {
      const response = await fetch(url, { method: "HEAD", cache: "no-store" });
      if (response.ok) return url;
    } catch (error) {}
  }
  return "quarantine.html";
}

async function runVaultScan() {
  resetScanClasses();
  scanButton.disabled = true;
  scanButton.textContent = "Scanning...";
  gateStatus.textContent = "Scanning";
  statusText.textContent = "Scanning";
  modeText.textContent = "Body Scan";
  heroNote.textContent = "Body scan running. Duck Sauce is talking through the whole thing.";
  scanReadout.textContent = "Body Scan Active";

  setTimeout(() => {
    scanStage.classList.add("is-scanning");
  }, 80);

  setTimeout(() => {
    scanStage.classList.remove("is-scanning");
    scanStage.classList.add("is-opening");
    gateStatus.textContent = "Cleared";
    statusText.textContent = "Cleared";
    modeText.textContent = "Door";
    heroNote.textContent = "Scan clear. Scan-bar door opening.";
    scanReadout.textContent = "Scan Clear • Opening Door";
  }, 3000);

  setTimeout(() => {
    scanStage.classList.add("is-transporting");
    gateStatus.textContent = "Transport";
    statusText.textContent = "Transport";
    modeText.textContent = "Level 1";
    heroNote.textContent = "Transport charging. Level 1 loading.";
    scanReadout.textContent = "Transport Active • Level 1 Loading";
  }, 4300);

  setTimeout(async () => {
    transportOverlay.classList.add("is-active");
    const destination = await findLevelOneUrl();
    window.location.href = destination;
  }, 5600);
}
if (scanButton) {
  scanButton.addEventListener("click", runVaultScan);
}

function randIcon() {
  return SLOT_ICONS[Math.floor(Math.random() * SLOT_ICONS.length)];
}

function spinReels() {
  spinButton.disabled = true;
  slotStatus.textContent = "Spinning";
  slotMessage.textContent = "Duck Sauce says let it ride...";

  let ticks = 0;
  const interval = setInterval(() => {
    reelEls.forEach((el) => el.textContent = randIcon());
    ticks += 1;
    if (ticks > 12) {
      clearInterval(interval);
      const finalIcons = [randIcon(), randIcon(), randIcon()];
      reelEls.forEach((el, idx) => el.textContent = finalIcons[idx]);

      const counts = {};
      finalIcons.forEach((icon) => counts[icon] = (counts[icon] || 0) + 1);
      const maxMatch = Math.max(...Object.values(counts));
      let points = getPoints();
      let won = 0;

      if (maxMatch === 3) {
        won = 30;
        slotStatus.textContent = "Jackpot";
        slotMessage.textContent = "Big win. 3 of a kind. +30 Cool Points.";
      } else if (maxMatch === 2) {
        won = 10;
        slotStatus.textContent = "Nice Hit";
        slotMessage.textContent = "2 matched. +10 Cool Points.";
      } else {
        won = 1;
        slotStatus.textContent = "Close Call";
        slotMessage.textContent = "No match. Buck gave you a pity point. +1 Cool Point.";
      }

      setPoints(points + won);
      spinButton.disabled = false;
    }
  }, 120);
}
if (spinButton) {
  spinButton.addEventListener("click", spinReels);
}

if (rulesButton) {
  rulesButton.addEventListener("click", () => {
    rulesModal.classList.add("is-open");
    rulesModal.setAttribute("aria-hidden", "false");
  });
}
if (closeRules) {
  closeRules.addEventListener("click", () => {
    rulesModal.classList.remove("is-open");
    rulesModal.setAttribute("aria-hidden", "true");
  });
}
if (rulesModal) {
  rulesModal.addEventListener("click", (event) => {
    if (event.target === rulesModal) {
      rulesModal.classList.remove("is-open");
      rulesModal.setAttribute("aria-hidden", "true");
    }
  });
}
