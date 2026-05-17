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
    window.__casinoToastTimer = setTimeout(() => { el.style.display = "none"; }, 3200);
  }

  function getPoints() {
    try {
      if (window.HWPoints && typeof window.HWPoints.get === "function") return window.HWPoints.get();
    } catch (error) {}
    return 0;
  }

  function titleRoom(room) {
    if (room === "dominoes") return "Dominoes";
    if (room === "poker") return "Poker";
    if (room === "cash-run") return "Cash Run";
    if (room === "slots") return "Slots";
    return String(room || "table").replace(/-/g, " ");
  }

  function renderBalance(value) {
    const balance = document.getElementById("casinoCoolPoints");
    const next = typeof value === "number" ? value : getPoints();
    if (balance) balance.textContent = String(next);
  }

  async function refreshBalance() {
    try {
      if (window.HWPoints && typeof window.HWPoints.refresh === "function") await window.HWPoints.refresh();
    } catch (error) {}
    renderBalance();
  }

  async function getSupabaseClient() {
    if (!window.HWAuth || typeof window.HWAuth.getClient !== "function") return null;
    const maybeClient = window.HWAuth.getClient();
    const client = maybeClient && typeof maybeClient.then === "function" ? await maybeClient : maybeClient;
    return client && typeof client.rpc === "function" ? client : null;
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

  async function enterTableRoom(room, cost) {
    const client = await getSupabaseClient();
    if (!client) {
      toast("Login system still loading. Refresh and try again.", true);
      return null;
    }

    const gameKey = room === "domino" ? "dominoes" : room;
    const { data, error } = await client.rpc("enter_game_room", {
      p_game_key: gameKey,
      p_buy_in: cost
    });

    if (error) throw error;
    return data || null;
  }

  function setRoomStatus(card, message) {
    if (!card || !message) return;
    let status = card.querySelector("[data-room-status]");
    if (!status) {
      status = document.createElement("p");
      status.setAttribute("data-room-status", "");
      status.style.fontWeight = "1000";
      status.style.color = "#75ff75";
      status.style.marginTop = "12px";
      card.appendChild(status);
    }
    status.textContent = message;
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

    if (room === "cash-run") return;

    actionLocked = true;
    button.disabled = true;

    try {
      if (action === "preview") {
        const payload = await enterTableRoom(room, 0);
        if (payload && payload.ok) {
          setRoomStatus(card, titleRoom(room) + " room ready: " + payload.roomId);
          toast(titleRoom(room) + " room created. CPU play is next.", false);
        }
        return;
      }

      if (action === "buyin") {
        const before = getPoints();
        if (before < cost) {
          toast("Need " + cost + " Cool Points. Current balance: " + before + ".", true);
          return;
        }

        const payload = await enterTableRoom(room, cost);
        if (payload && payload.ok) {
          if (window.HWPoints && typeof window.HWPoints.refresh === "function") await window.HWPoints.refresh();
          renderBalance(typeof payload.balance === "number" ? payload.balance : undefined);
          setRoomStatus(card, titleRoom(room) + " buy-in accepted. Room: " + payload.roomId);
          toast(titleRoom(room) + " table live. Buy-in accepted: " + cost + " CP.", false);
        }
      }
    } catch (error) {
      toast(error.message || "Table room missed. Try again.", true);
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
