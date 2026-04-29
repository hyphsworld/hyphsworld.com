const codeInput = document.getElementById("vaultCode");
const scanBtn = document.getElementById("scanBtn");
const clearBtn = document.getElementById("clearBtn");
const scanScreen = document.getElementById("scanScreen");
const statusText = document.getElementById("statusText");
const buckLine = document.getElementById("buckLine");
const duckLine = document.getElementById("duckLine");
const levelOne = document.getElementById("levelOne");
const levelTwo = document.getElementById("levelTwo");
const chipMaster = document.getElementById("chipMaster");
const chipOne = document.getElementById("chipOne");
const chipTwo = document.getElementById("chipTwo");

const ACCESS = {
  master: "AMSWEST",
  levelOne: "QUARANTINE",
  levelTwo: "WORLD5"
};

function setLevel(card, chip, open, label) {
  if (!card || !chip) return;
  card.classList.toggle("open", open);
  const lock = card.querySelector(".level-lock");
  if (lock) lock.textContent = open ? "OPEN" : "LOCKED";
  chip.classList.toggle("open", open);
  chip.textContent = open ? `${label} OPEN` : `${label} LOCKED`;
}

function applySavedAccess() {
  const master = localStorage.getItem("hyphsVaultMaster") === "true";
  const one = localStorage.getItem("hyphsVaultLevelOne") === "true" || master;
  const two = localStorage.getItem("hyphsVaultLevelTwo") === "true" || master;

  setLevel(levelOne, chipOne, one, "LEVEL 1");
  setLevel(levelTwo, chipTwo, two, "LEVEL 2");

  if (chipMaster) {
    chipMaster.classList.toggle("open", master);
    chipMaster.textContent = master ? "MASTER OPEN" : "MASTER LOCKED";
  }

  if (master) {
    statusText.textContent = "MASTER ACCESS";
    buckLine.textContent = "BUCK: APPROVED. DON'T TOUCH NOTHING.";
    duckLine.textContent = "Duck Sauce: “See? Now you acting like you know somebody.”";
  }
}

function approve(type) {
  if (type === "master") {
    localStorage.setItem("hyphsVaultMaster", "true");
    localStorage.setItem("hyphsVaultLevelOne", "true");
    localStorage.setItem("hyphsVaultLevelTwo", "true");
    statusText.textContent = "MASTER ACCESS GRANTED";
    buckLine.textContent = "BUCK: APPROVED. DON'T TOUCH NOTHING.";
    duckLine.textContent = "Duck Sauce: “Big access. Big pressure. Don’t fumble it.”";
  }

  if (type === "levelOne") {
    localStorage.setItem("hyphsVaultLevelOne", "true");
    statusText.textContent = "LEVEL 1 ACCESS GRANTED";
    buckLine.textContent = "BUCK: LEVEL 1 OPEN. KEEP IT MOVING.";
    duckLine.textContent = "Duck Sauce: “Quarantine floor open. Don’t sneeze on the files.”";
  }

  if (type === "levelTwo") {
    localStorage.setItem("hyphsVaultLevelTwo", "true");
    statusText.textContent = "LEVEL 2 ACCESS GRANTED";
    buckLine.textContent = "BUCK: LEVEL 2 OPEN. WATCH YOUR STEP.";
    duckLine.textContent = "Duck Sauce: “WORLD5 pressure. That door heavy.”";
  }

  if (window.gtag) gtag("event", "vault_access_granted", { access_type: type });
  applySavedAccess();
}

function deny() {
  statusText.textContent = "ACCESS DENIED";
  buckLine.textContent = "BUCK: I NEED YOU TO LEAVE.";
  duckLine.textContent = "Duck Sauce: “Pssst... bro typed that like the feds watching.”";
  if (window.gtag) gtag("event", "vault_access_denied");
}

function scanAccess() {
  const code = (codeInput.value || "").trim().toUpperCase();
  scanScreen.classList.add("scanning");
  statusText.textContent = "SCANNING...";
  buckLine.textContent = "BUCK: HOLD STILL.";
  duckLine.textContent = "Duck Sauce: “The machine judging your whole character.”";

  setTimeout(() => {
    scanScreen.classList.remove("scanning");

    if (code === ACCESS.master) return approve("master");
    if (code === ACCESS.levelOne) return approve("levelOne");
    if (code === ACCESS.levelTwo) return approve("levelTwo");
    return deny();
  }, 1100);
}

if (scanBtn) scanBtn.addEventListener("click", scanAccess);

if (codeInput) {
  codeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") scanAccess();
  });
}

if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    codeInput.value = "";
    statusText.textContent = "SYSTEM IDLE";
    buckLine.textContent = "BUCK: ENTER ACCESS CODE.";
    duckLine.textContent = "Duck Sauce: “Don’t type crazy. The wall got cameras.”";
    codeInput.focus();
  });
}

applySavedAccess();
