(function () {
  "use strict";

  let actionLocked = false;

  function toast(text, bad) {
    const el = document.getElementById("casinoToast");
    if (!el) return;
    el.textContent = text;
    el.style.display = "block";
    el.style.background = bad ? "linear-gradient(135deg,#ff6b6b,#ffd166)" : "linear-gradient(135deg,#75ff75,#dfff75)";
    clearTimeout(window.__casinoToastTimer);
    window.__casinoToastTimer = setTimeout(() => { el.style.display = "none"; }, 3400);
  }

  function getPoints() {