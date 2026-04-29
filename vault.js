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

const LEVEL_TWO_POINTS_REQUIRED = 200;
const COOLDOWN_SECONDS = 10;

let attempts = 0;
let locked = false;
let cooldownTimer = null;

const BUCK_DENY = [
  "I NEED YOU TO LEAVE.",
  "YOU NOT CLEARED.",
  "WHO SENT YOU?",
  "TRY AGAIN. SLOW.",
  "NAH... NOT TODAY."
];

const DUCK_DENY = [
  "He typing like he nervous.",
  "Bro guessing like a test.",
  "He almost got it... SIKE.",
  "Nah... this ain't it.",
  "Pssst... bro typed that like the feds watching."
];

const BUCK_APPROVE = {
  master: "APPROVED. DON'T TOUCH NOTHING.",
  levelOne: "LEVEL 1 OPEN. KEEP IT MOVING.",
  levelTwo: "LEVEL 2 OPEN. WATCH YOUR STEP."
};

const DUCK_APPROVE = {
  master: "Big dog access. Big pressure. Don't fumble it.",
  levelOne: "Quarantine floor open. Don't sneeze on the files.",
  levelTwo: "WORLD5 pressure. That door heavy."
};

function getCoolPoints() {
  return Number(localStorage.getItem("hyphsworldCoolPoints") || "0");
}

function setText(main, buck, duck, mode = "normal") {
  if (statusText) {
    statusText.textContent = main;
    statusText.classList.remove("warning", "denied");

    if (mode === "warning") statusText.classList.add("warning");
    if (mode === "denied") statusText.classList.add("denied");
  }

  if (buckLine) buckLine.textContent = "BUCK: " + buck;
  if (duckLine) duckLine.textContent = "Duck Sauce: “" + duck + "”";
}

function setScreenState(state) {
  if (!scanScreen) return;
  scanScreen.classList.remove("scanning", "granted", "denied", "cooldown");

  if (state) {
    scanScreen.classList.add(state);
  }
}

function setButtonsEnabled(enabled) {
  if (scanBtn) scanBtn.disabled = !enabled;
  if (codeInput) codeInput.disabled = !enabled;
}

function setLevel(card, chip, open, label) {
  if (!card) return;

  card.classList.toggle("open", open);
  card.classList.toggle("blocked", !open);

  const lock = card.querySelector(".level-lock");
  if (lock) lock.textContent = open ? "OPEN" : "LOCKED";

  if (chip) {
    chip.classList.toggle("open", open);
    chip.textContent = open ? `${label} OPEN` : `${label} LOCKED`;
  }
}

function saveAccess(type) {
  if (type === "master") {
    localStorage.setItem("hyphsVaultMaster", "true");
    localStorage.setItem("hyphsVaultLevelOne", "true");
    localStorage.setItem("hyphsVaultLevelTwo", "true");
  }

  if (type === "levelOne") {
    localStorage.setItem("hyphsVaultLevelOne", "true");
  }

  if (type === "levelTwo") {
    localStorage.setItem("hyphsVaultLevelTwo", "true");
  }
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
    setText("MASTER ACCESS", BUCK_APPROVE.master, DUCK_APPROVE.master);
    setScreenState("granted");
  } else if (two) {
    setText("LEVEL 2 OPEN", BUCK_APPROVE.levelTwo, DUCK_APPROVE.levelTwo);
    setScreenState("granted");
  } else if (one) {
    setText("LEVEL 1 OPEN", BUCK_APPROVE.levelOne, DUCK_APPROVE.levelOne);
    setScreenState("granted");
  } else {
    setText("SYSTEM IDLE", "ENTER ACCESS CODE.", "Don't type crazy. The wall got cameras.");
    setScreenState(null);
  }
}

function glitchUnlock(card) {
  if (!card) return;
  card.classList.remove("open");
  void card.offsetWidth;
  card.classList.add("open");
}

function approve(type) {
  attempts = 0;
  saveAccess(type);
  setScreenState("granted");

  if (type === "master") {
    setText("MASTER ACCESS GRANTED", BUCK_APPROVE.master, DUCK_APPROVE.master);
    glitchUnlock(levelOne);
    glitchUnlock(levelTwo);
  }

  if (type === "levelOne") {
    setText("LEVEL 1 ACCESS GRANTED", BUCK_APPROVE.levelOne, DUCK_APPROVE.levelOne);
    glitchUnlock(levelOne);
  }

  if (type === "levelTwo") {
    setText("LEVEL 2 ACCESS GRANTED", BUCK_APPROVE.levelTwo, DUCK_APPROVE.levelTwo);
    glitchUnlock(levelTwo);
  }

  applySavedAccess();

  if (window.gtag) {
    gtag("event", "vault_access_granted", { access_type: type });
  }
}

function deny() {
  attempts += 1;

  const rand = Math.floor(Math.random() * BUCK_DENY.length);

  setScreenState("denied");
  setText("ACCESS DENIED", BUCK_DENY[rand], DUCK_DENY[rand], "denied");

  if (window.gtag) {
    gtag("event", "vault_access_denied", { attempts });
  }

  if (attempts >= 3) {
    triggerCooldown();
  }
}

function triggerCooldown() {
  locked = true;
  setButtonsEnabled(false);
  setScreenState("cooldown");

  let remaining = COOLDOWN_SECONDS;

  setText(
    `LOCKED ${remaining}s`,
    "STEP AWAY FROM THE TERMINAL.",
    "Yeah... you done.",
    "warning"
  );

  cooldownTimer = setInterval(() => {
    remaining -= 1;

    setText(
      `LOCKED ${remaining}s`,
      "STEP AWAY FROM THE TERMINAL.",
      "Yeah... you done.",
      "warning"
    );

    if (remaining <= 0) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
      locked = false;
      attempts = 0;
      setButtonsEnabled(true);
      setText("SYSTEM RESET", "TRY AGAIN.", "Alright, you get one more shot.");
      setScreenState(null);
      if (codeInput) codeInput.focus();
    }
  }, 1000);
}

function scanAccess() {
  if (locked) return;

  const code = (codeInput?.value || "").trim().toUpperCase();

  if (!code) {
    setScreenState("denied");
    setText("NO CODE ENTERED", "TYPE SOMETHING FIRST.", "Bro scanned air.", "denied");
    return;
  }

  setButtonsEnabled(false);
  setScreenState("scanning");
  setText("SCANNING...", "HOLD STILL.", "The system judging you right now...");

  setTimeout(() => {
    setButtonsEnabled(true);

    if (code === ACCESS.master) {
      approve("master");
      return;
    }

    if (code === ACCESS.levelOne) {
      approve("levelOne");
      return;
    }

    if (code === ACCESS.levelTwo) {
      const levelOneOpen =
        localStorage.getItem("hyphsVaultLevelOne") === "true" ||
        localStorage.getItem("hyphsVaultMaster") === "true";

      if (!levelOneOpen) {
        setScreenState("denied");
        setText(
          "LEVEL 1 REQUIRED",
          "OPEN LEVEL 1 FIRST.",
          "You skipping stairs like this an elevator?",
          "denied"
        );
        attempts += 1;
        if (attempts >= 3) triggerCooldown();
        return;
      }

      const points = getCoolPoints();

      if (points < LEVEL_TWO_POINTS_REQUIRED) {
        setScreenState("cooldown");
        setText(
          "INSUFFICIENT COOL POINTS",
          `YOU NEED ${LEVEL_TWO_POINTS_REQUIRED}. YOU GOT ${points}.`,
          "Go run them plays first.",
          "warning"
        );

        if (window.gtag) {
          gtag("event", "vault_points_block", {
            points,
            required: LEVEL_TWO_POINTS_REQUIRED
          });
        }

        return;
      }

      approve("levelTwo");
      return;
    }

    deny();
  }, 950);
}

function clearTerminal() {
  if (codeInput) {
    codeInput.value = "";
    codeInput.focus();
  }

  attempts = 0;

  if (!locked) {
    setText("SYSTEM IDLE", "ENTER ACCESS CODE.", "Don't type crazy.");
    setScreenState(null);
  }
}

if (scanBtn) {
  scanBtn.addEventListener("click", scanAccess);
}

if (codeInput) {
  codeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") scanAccess();
  });
}

if (clearBtn) {
  clearBtn.addEventListener("click", clearTerminal);
}

applySavedAccess();
