/* HYPHSWORLD Vault clean gate.
   Static GitHub Pages cannot fully protect private content.
   This keeps the access code out of plain-text HTML/JS and avoids public code leaks.
*/

(() => {
  "use strict";

  const ACCESS_HASHES = {
    master: "651d8948587739f3c0aa840fd250b5b547b98a83a9b84aa24800ff1293dc8ed9",
    levelOne: "651d8948587739f3c0aa840fd250b5b547b98a83a9b84aa24800ff1293dc8ed9",
    levelTwo: "651d8948587739f3c0aa840fd250b5b547b98a83a9b84aa24800ff1293dc8ed9"
  };

  const form = document.getElementById("vaultForm");
  const input = document.getElementById("vaultCode");
  const status = document.getElementById("vaultStatus");
  const levelOne = document.getElementById("levelOne");
  const levelTwo = document.getElementById("levelTwo");

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function normalizeCode(value) {
    return String(value || "").trim().toUpperCase();
  }

  async function sha256(value) {
    const data = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  function unlockFloor(floor) {
    if (!floor) return;
    floor.classList.remove("locked");
    floor.classList.add("unlocked");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const code = normalizeCode(input.value);

    if (!code) {
      setStatus("Duck Sauce: Put the code in first.");
      return;
    }

    setStatus("Scanning...");

    try {
      const hash = await sha256(code);
      const isMaster = hash === ACCESS_HASHES.master;
      const isLevelOne = hash === ACCESS_HASHES.levelOne;
      const isLevelTwo = hash === ACCESS_HASHES.levelTwo;

      if (isMaster || isLevelOne) {
        unlockFloor(levelOne);
      }

      if (isMaster || isLevelTwo) {
        unlockFloor(levelTwo);
      }

      if (isMaster || isLevelOne || isLevelTwo) {
        setStatus("Access granted. Buck opened the door. Duck Sauce is acting like he did everything.");
        input.value = "";
        if (typeof window.gtag === "function") {
          window.gtag("event", "vault_unlock", {
            event_category: "vault",
            event_label: isMaster ? "master" : "floor"
          });
        }
        return;
      }

      setStatus("Access denied. Buck said try again.");
    } catch (error) {
      setStatus("Vault scanner could not run in this browser.");
    }
  }

  function clearVault() {
    input.value = "";
    levelOne.classList.add("locked");
    levelOne.classList.remove("unlocked");
    levelTwo.classList.add("locked");
    levelTwo.classList.remove("unlocked");
    setStatus("Vault cleared.");
  }

  document.addEventListener("click", (event) => {
    const clearButton = event.target.closest("[data-action='clear-vault']");
    if (!clearButton) return;
    event.preventDefault();
    clearVault();
  });

  if (form) {
    form.addEventListener("submit", handleSubmit);
  }
})();
