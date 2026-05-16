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
    window.__casinoToastTimer = setTimeout(() => { el.style.display = "none"; }, 2600);
  }

  function getPoints() {
    try {
      if (window.HWPoints && typeof window.HWPoints.get === "function") return window.HWPoints.get();
    } catch (error) {}
    return 0;
  }

  function renderBalance() {
    const balance = document.getElementById("casinoCoolPoints");
    if (balance) balance.textContent = String(getPoints());
  }

  async function refreshBalance() {
    try {
      if (window.HWPoints && typeof window.HWPoints.refresh === "function") await window.HWPoints.refresh();
    } catch (error) {}
    renderBalance();
  }

  async function spendCoolPoints(cost, reason) {
    const n = parseInt(cost, 10) || 0;
    if (!n) return true;

    if (!window.HWPoints || typeof window.HWPoints.spend !== "function") {
      toast("Cool Points system still loading. Refresh and try again.", true);
      return false;
    }

    const before = getPoints();
    if (before < n) {
      toast("Need " + n + " Cool Points. Current balance: " + before + ".", true);
      return false;
    }

    const after = await window.HWPoints.spend(n, reason || "casino_room_action");
    renderBalance();
    return after < before;
  }

  function routeSlots(action) {
    if (!window.HWCasinoEngine) {
      toast("Slots engine still loading. Try again in a second.", true);
      return;
    }

    window.HWCasinoEngine.openSlots();
    if (action === "spin") {
      window.setTimeout(() => window.HWCasinoEngine.spinSlots(), 180);
    }
  }

  async function handleRoomAction(button) {
    if (actionLocked) return;
    const card = button.closest(".casino-room");
    if (!card) return;

    const action = button.dataset.roomAction || "preview";
    const room = card.dataset.room || "casino";
    const cost = parseInt(card.dataset.cost, 10) || 0;

    if (room === "slots") {
      routeSlots(action);
      return;
    }

    if (action === "preview") {
      toast(room.replace(/-/g, " ") + " room is multiplayer-ready. Live table engine coming next.", false);
      return;
    }

    actionLocked = true;
    button.disabled = true;

    try {
      if (action === "buyin") {
        const ok = await spendCoolPoints(cost, "casino_" + room + "_buyin");
        if (ok) toast(room.replace(/-/g, " ") + " buy-in saved with Cool Points.", false);
      }
    } finally {
      button.disabled = false;
      actionLocked = false;
    }
  }

  async function boot() {
    const year = document.getElementById("year");
    const authLink = document.getElementById("gamesAuthLink");
    if (year) year.textContent = new Date().getFullYear();

    await refreshBalance();

    if (window.HWAuth && authLink) {
      try {
        const session = await window.HWAuth.getSession();
        if (session && session.email) {
          authLink.textContent = "Manage ID";
          authLink.href = "account.html";
        }
      } catch (error) {}
    }

    document.querySelectorAll("[data-room-action]").forEach((button) => {
      button.addEventListener("click", () => handleRoomAction(button));
    });

    document.addEventListener("hyph:points-updated", renderBalance);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
