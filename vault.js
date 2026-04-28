const codeRules = {
  "510": { level: 1, points: 10, casino: false, msg: "Richmond access granted.", buck: "You from the soil. Go ahead." },
  "HYPH": { level: 1, points: 10, casino: false, msg: "Hyph access granted.", buck: "Hyph Life stamped it." },
  "DUCK": { level: 1, points: 15, casino: false, msg: "Duck Sauce slid you in.", buck: "I saw the cloud. I let it go." },
  "AMS": { level: 1, points: 15, casino: false, msg: "AMS WEST access granted.", buck: "Business code accepted." },
  "RICHMOND": { level: 1, points: 20, casino: false, msg: "Richmond code unlocked Level 1.", buck: "Richmond always got a key." },
  "QUARANTINE": { level: 1, points: 25, casino: false, msg: "Level 1 unlocked: Quarantine Mixtape.", buck: "Old era unlocked." },
  "WORLD5": { level: 2, points: 50, casino: false, msg: "Level 2 unlocked: HYPHSWORLD 5.", buck: "Current pressure approved." },
  "CASINO": { level: 2, points: 30, casino: true, msg: "Hidden Casino teaser unlocked.", buck: "Casino door cracked. Don't get comfortable." }
};

const form = document.getElementById("vaultForm");
const codeInput = document.getElementById("vaultCode");
const statusBox = document.getElementById("vaultStatus");
const buckLine = document.getElementById("buckLine");
const vaultLevel = document.getElementById("vaultLevel");
const vaultPoints = document.getElementById("vaultPoints");
const casinoStatus = document.getElementById("casinoStatus");
const scanState = document.getElementById("scanState");
const accessPad = document.getElementById("accessPad");
const maskedCode = document.getElementById("maskedCode");
const quickButtons = document.querySelectorAll(".quick-code");
const dailyClaim = document.getElementById("dailyClaim");

let level = Number(localStorage.getItem("hyphsworld_vault_level") || 0);
let points = Number(localStorage.getItem("hyphsworld_cool_points") || 203);
let casino = localStorage.getItem("hyphsworld_casino") === "true";

function paint() {
  vaultLevel.textContent = level;
  vaultPoints.textContent = points;
  casinoStatus.textContent = casino ? "Open" : "Locked";
}

function setPadState(state, label) {
  accessPad.classList.remove("is-scanning", "is-approved", "is-denied");
  if (state) accessPad.classList.add(state);
  scanState.textContent = label || "STANDBY";
}

function mask(value) {
  const clean = String(value || "").trim().toUpperCase();
  maskedCode.textContent = clean ? clean.replace(/./g, "•") : "••••••••";
}

function addPoints(amount) {
  points += amount;
  localStorage.setItem("hyphsworld_cool_points", points);
  paint();
  window.dispatchEvent(new CustomEvent("hyphsworld:addpoints", { detail: { amount, label: "VAULT SCAN" } }));
}

function unlock(rawCode) {
  const code = String(rawCode || "").trim().toUpperCase();
  const rule = codeRules[code];

  mask(code);
  setPadState("is-scanning", "SCANNING");
  statusBox.textContent = "Scanning code... Buck is checking the door.";
  buckLine.textContent = "Stand still.";

  setTimeout(() => {
    if (!rule) {
      setPadState("is-denied", "DENIED");
      statusBox.textContent = "Wrong code. Buck said try again.";
      buckLine.textContent = "Denied blood.";
      return;
    }

    level = Math.max(level, rule.level);
    casino = casino || rule.casino;

    localStorage.setItem("hyphsworld_vault_level", level);
    localStorage.setItem("hyphsworld_casino", casino ? "true" : "false");

    setPadState("is-approved", "APPROVED");
    statusBox.textContent = rule.msg;
    buckLine.textContent = rule.buck;
    addPoints(rule.points);
    paint();
  }, 1050);
}

codeInput.addEventListener("input", () => mask(codeInput.value));

form.addEventListener("submit", (event) => {
  event.preventDefault();
  unlock(codeInput.value);
});

quickButtons.forEach((button) => {
  button.addEventListener("click", () => {
    codeInput.value = button.dataset.code;
    unlock(button.dataset.code);
  });
});

dailyClaim.addEventListener("click", () => {
  points += 5;
  localStorage.setItem("hyphsworld_cool_points", points);
  statusBox.textContent = "Daily Cool Points added.";
  buckLine.textContent = "Five points. Don't spend it all.";
  paint();
});

paint();
mask("");
