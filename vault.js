const codeRules = {
  "510": { level: 1, points: 10, msg: "Richmond access granted. Level 2 info revealed.", buck: "Richmond always got a key." },
  "HYPH": { level: 1, points: 10, msg: "Hyph access granted. Level 2 info revealed.", buck: "Hyph Life stamped it." },
  "DUCK": { level: 1, points: 15, msg: "Duck Sauce slid you in. Level 2 info revealed.", buck: "I saw the cloud. I let it go." },
  "AMS": { level: 1, points: 15, msg: "AMS WEST access granted. Level 2 info revealed.", buck: "Business code accepted." },
  "RICHMOND": { level: 1, points: 20, msg: "Richmond code unlocked Level 1.", buck: "You from the soil. Go ahead." },
  "QUARANTINE": { level: 1, points: 25, msg: "Level 1 unlocked: Quarantine Mixtape. Level 2 is now visible.", buck: "Old era unlocked." },
  "WORLD5": { level: 2, points: 50, msg: "Level 2 unlocked: HYPHSWORLD 5. Next room revealed.", buck: "Current pressure approved." },
  "CASINO": { level: 3, points: 30, msg: "Hidden Casino teaser unlocked.", buck: "Casino door cracked. Don't get comfortable." }
};

const form = document.getElementById("vaultForm");
const codeInput = document.getElementById("vaultCode");
const statusBox = document.getElementById("vaultStatus");
const buckLine = document.getElementById("buckLine");
const vaultLevel = document.getElementById("vaultLevel");
const vaultPoints = document.getElementById("vaultPoints");
const nextRoomStatus = document.getElementById("nextRoomStatus");
const scanState = document.getElementById("scanState");
const accessPad = document.getElementById("accessPad");
const maskedCode = document.getElementById("maskedCode");
const vaultHint = document.getElementById("vaultHint");
const quickButtons = document.querySelectorAll(".quick-code");
const dailyClaim = document.getElementById("dailyClaim");

let level = Number(localStorage.getItem("hyphsworld_vault_level") || 0);
let points = Number(localStorage.getItem("hyphsworld_cool_points") || 203);

function paint() {
  vaultLevel.textContent = level;
  vaultPoints.textContent = points;

  if (level >= 2) {
    nextRoomStatus.textContent = "Casino";
    vaultHint.textContent = "Next room revealed. Casino teaser is active.";
  } else if (level >= 1) {
    nextRoomStatus.textContent = "Level 2";
    vaultHint.textContent = "Level 2 hint: current pressure.";
  } else {
    nextRoomStatus.textContent = "Locked";
    vaultHint.textContent = "Level 1 hint: the hidden era.";
  }

  document.querySelectorAll(".locked-reveal").forEach((section) => {
    const required = Number(section.dataset.requiredLevel || 1);
    section.classList.toggle("is-visible", level >= required);
  });
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
  statusBox.textContent = "Scanning code... Buck is checking the floor.";
  buckLine.textContent = "Stand still.";

  setTimeout(() => {
    if (!rule) {
      setPadState("is-denied", "DENIED");
      statusBox.textContent = "Wrong code. Buck said try again.";
      buckLine.textContent = "Denied blood.";
      return;
    }

    if (rule.level === 2 && level < 1) {
      setPadState("is-denied", "DENIED");
      statusBox.textContent = "Level 2 blocked. Unlock Level 1 first.";
      buckLine.textContent = "No skipping floors.";
      return;
    }

    if (rule.level >= 3 && level < 2) {
      setPadState("is-denied", "DENIED");
      statusBox.textContent = "Next room blocked. Unlock Level 2 first.";
      buckLine.textContent = "You are not there yet.";
      return;
    }

    level = Math.max(level, rule.level);
    localStorage.setItem("hyphsworld_vault_level", level);

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

if (dailyClaim) {
  dailyClaim.addEventListener("click", () => {
    points += 5;
    localStorage.setItem("hyphsworld_cool_points", points);
    statusBox.textContent = "Daily Cool Points added.";
    buckLine.textContent = "Five points. Don't spend it all.";
    paint();
  });
}

paint();
mask("");
