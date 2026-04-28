/*
  HYPHSWORLD Vault logic
  IMPORTANT:
  This front-end lock is for presentation only. Any code placed in public HTML/JS can be inspected.
  For real protection, use server-side authentication, Netlify Functions, Cloudflare Workers, Firebase, Supabase, or a proper backend.
*/

const VAULT_CODES = {
  master: "AMSWEST",
  levelOne: "LEVEL1",
  levelTwo: "HYPHSWORLD5"
};

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function setStatus(id, text, open = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("open", open);
  el.classList.toggle("locked", !open);
}

function revealLevelOne() {
  const content = document.getElementById("levelOneContent");
  const levelTwoCard = document.getElementById("levelTwoCard");

  if (content) content.classList.remove("locked-content");
  if (levelTwoCard) levelTwoCard.classList.add("revealed");

  setStatus("levelOneStatus", "LEVEL 1 OPEN", true);
  setStatus("levelTwoStatus", "LEVEL 2 READY", false);
}

function revealLevelTwo() {
  const content = document.getElementById("levelTwoContent");
  const levelTwoCard = document.getElementById("levelTwoCard");

  if (levelTwoCard) levelTwoCard.classList.add("revealed");
  if (content) content.classList.remove("locked-content");

  setStatus("levelTwoStatus", "LEVEL 2 OPEN", true);
}

function revealMaster() {
  revealLevelOne();
  revealLevelTwo();
  setStatus("masterStatus", "MASTER OPEN", true);
}

function pulseWrong(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.value = "";
  input.placeholder = "TRY AGAIN";
  input.focus();
}

document.addEventListener("DOMContentLoaded", () => {
  const masterInput = document.getElementById("masterCode");
  const levelOneInput = document.getElementById("levelOneCode");
  const levelTwoInput = document.getElementById("levelTwoCode");

  document.getElementById("unlockMaster")?.addEventListener("click", () => {
    if (normalizeCode(masterInput?.value) === VAULT_CODES.master) {
      revealMaster();
      if (window.gtag) window.gtag("event", "vault_master_unlock");
    } else {
      pulseWrong("masterCode");
    }
  });

  document.getElementById("unlockLevelOne")?.addEventListener("click", () => {
    if (normalizeCode(levelOneInput?.value) === VAULT_CODES.levelOne) {
      revealLevelOne();
      if (window.gtag) window.gtag("event", "vault_level_one_unlock");
    } else {
      pulseWrong("levelOneCode");
    }
  });

  document.getElementById("unlockLevelTwo")?.addEventListener("click", () => {
    if (normalizeCode(levelTwoInput?.value) === VAULT_CODES.levelTwo) {
      revealLevelTwo();
      if (window.gtag) window.gtag("event", "vault_level_two_unlock");
    } else {
      pulseWrong("levelTwoCode");
    }
  });

  document.getElementById("clearMaster")?.addEventListener("click", () => {
    if (masterInput) masterInput.value = "";
  });

  document.getElementById("clearLevelOne")?.addEventListener("click", () => {
    if (levelOneInput) levelOneInput.value = "";
  });

  document.getElementById("clearLevelTwo")?.addEventListener("click", () => {
    if (levelTwoInput) levelTwoInput.value = "";
  });

  [masterInput, levelOneInput, levelTwoInput].forEach((input) => {
    input?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        const nearbyButton = input.parentElement?.querySelector("button");
        nearbyButton?.click();
      }
    });
  });
});
