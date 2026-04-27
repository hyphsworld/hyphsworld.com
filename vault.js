const input = document.getElementById("vaultCode");
const unlockBtn = document.getElementById("unlockBtn");
const msg = document.getElementById("vaultMessage");
const statusEl = document.getElementById("vaultStatus");
const pointsEl = document.getElementById("coolPoints");
const duckBtn = document.getElementById("duckBtn");

const masterCard = document.getElementById("masterCard");
const level1Card = document.getElementById("level1Card");
const level2Card = document.getElementById("level2Card");

const mainCodes = ["510", "HYPH", "DUCK", "AMS", "RICHMOND"];
const level1Codes = ["QUARANTINE"];
const level2Codes = ["WORLD5"];

let points = Number(localStorage.getItem("hyphsworldCoolPoints") || 80);

function savePoints(add = 0) {
  points += add;
  localStorage.setItem("hyphsworldCoolPoints", String(points));
  if (pointsEl) pointsEl.textContent = points;
}

function unlock(card, label) {
  card.classList.remove("locked");
  card.classList.add("unlocked");
  const state = card.querySelector(".lock-state");
  if (state) state.textContent = "UNLOCKED";
  statusEl.textContent = label;
}

function showMessage(text) {
  msg.textContent = text;
}

function showDuck(text) {
  const old = document.querySelector(".duck-pop");
  if (old) old.remove();
  const pop = document.createElement("div");
  pop.className = "duck-pop";
  pop.textContent = text;
  document.body.appendChild(pop);
  setTimeout(() => pop.remove(), 4200);
}

function handleCode(raw) {
  const code = String(raw || "").trim().toUpperCase();

  if (!code) {
    showMessage("BuckTheBodyguard said: type the code first.");
    return;
  }

  if (mainCodes.includes(code)) {
    unlock(masterCard, "MASTER");
    unlock(level1Card, "MASTER");
    unlock(level2Card, "MASTER");
    savePoints(100);
    showMessage("JACKPOT. Buck opened the main room.");
    if (window.gtag) gtag("event", "vault_master_unlock", { event_label: code });
    return;
  }

  if (level1Codes.includes(code)) {
    unlock(level1Card, "LEVEL 1");
    savePoints(40);
    showMessage("Level 1 unlocked: QUARANTINE table open.");
    if (window.gtag) gtag("event", "vault_level_1_unlock", { event_label: code });
    return;
  }

  if (level2Codes.includes(code)) {
    unlock(level2Card, "LEVEL 2");
    savePoints(60);
    showMessage("Level 2 unlocked: WORLD5 table open.");
    if (window.gtag) gtag("event", "vault_level_2_unlock", { event_label: code });
    return;
  }

  savePoints(1);
  showMessage("Buck looked at that code and said: not tonight.");
  if (window.gtag) gtag("event", "vault_failed_code", { event_label: code });
}

unlockBtn.addEventListener("click", () => handleCode(input.value));
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleCode(input.value);
});

document.querySelectorAll("[data-code]").forEach(btn => {
  btn.addEventListener("click", () => {
    input.value = btn.dataset.code;
    handleCode(btn.dataset.code);
  });
});

duckBtn.addEventListener("click", () => {
  savePoints(10);
  const hints = [
    "Duck Sauce hint: Level 1 sound like lockdown season.",
    "Duck Sauce hint: Level 2 got WORLD in it. Don’t overthink it.",
    "Duck Sauce hint: Richmond opens more doors than people think.",
    "Buck says: main codes are short, loud, and connected to the brand."
  ];
  showDuck(hints[Math.floor(Math.random() * hints.length)]);
});

savePoints(0);
