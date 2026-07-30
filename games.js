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
    try {
      if (window.HWPoints && typeof window.HWPoints.get === "function") return window.HWPoints.get();
      if (window.HWPoints && typeof window.HWPoints.getState === "function") return window.HWPoints.getState().points;
    } catch (error) {}
    return 0;
  }

  function renderBalance(value) {
    const next = typeof value === "number" ? value : getPoints();
    const balance = document.getElementById("casinoCoolPoints");
    if (balance) balance.textContent = String(next);
  }

  async function refreshBalance() {
    try {
      if (window.HWPoints && typeof window.HWPoints.refresh === "function") await window.HWPoints.refresh();
      if (window.HWUserWidget && typeof window.HWUserWidget.refresh === "function") window.HWUserWidget.refresh();
    } catch (error) {}
    renderBalance();
  }

  async function getSupabaseClient() {
    if (!window.HWAuth || typeof window.HWAuth.getClient !== "function") return null;
    const maybeClient = window.HWAuth.getClient();
    const client = maybeClient && typeof maybeClient.then === "function" ? await maybeClient : maybeClient;
    return client && typeof client.rpc === "function" ? client : null;
  }

  function titleRoom(room) {
    if (room === "dominoes" || room === "domino") return "Dominoes";
    if (room === "poker") return "Poker";
    if (room === "cash-run") return "Cash Run";
    if (room === "slots") return "Slots";
    return String(room || "table").replace(/-/g, " ");
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

  async function enterTableRoom(room) {
    const client = await getSupabaseClient();
    if (!client) {
      toast("Login system still loading. Refresh and try again.", true);
      return null;
    }

    const gameKey = room === "domino" ? "dominoes" : room;
    const { data, error } = await client.rpc("enter_game_room", {
      p_game_key: gameKey,
      p_buy_in: 0
    });

    if (error) throw error;
    return data || null;
  }

  function setRoomStatus(card, message, payload) {
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

    const oldLink = card.querySelector("[data-open-table-room]");
    if (oldLink) oldLink.remove();

    if (payload && payload.roomId) {
      const link = document.createElement("a");
      link.href = "table-room.html?room=" + encodeURIComponent(payload.roomId);
      link.textContent = "Open Table Room";
      link.setAttribute("data-open-table-room", "");
      link.className = "room-btn";
      link.style.display = "inline-flex";
      link.style.justifyContent = "center";
      link.style.marginTop = "12px";
      link.style.width = "100%";
      card.appendChild(link);
    }
  }

  function markTableBuyInsAsPreviewOnly() {
    document.querySelectorAll('.casino-room[data-room="poker"] [data-room-action="buyin"], .casino-room[data-room="dominoes"] [data-room-action="buyin"]').forEach((button) => {
      button.textContent = button.textContent.replace("Buy-In", "Locked Until Gameplay");
      button.setAttribute("aria-label", "Gameplay screen must be built before Cool Points buy-in is enabled");
    });
  }

  async function handleRoomAction(button) {
    if (actionLocked) return;
    const card = button.closest(".casino-room");
    if (!card) return;

    const action = button.dataset.roomAction || "preview";
    const room = card.dataset.room || "casino";

    if (room === "slots") {
      routeSlots(action);
      return;
    }

    if (room === "cash-run") return;

    if (action === "buyin") {
      setRoomStatus(card, titleRoom(room) + " buy-in is locked until the playable table screen is built.");
      toast(titleRoom(room) + " buy-in paused. No Cool Points charged until gameplay exists.", true);
      return;
    }

    actionLocked = true;
    button.disabled = true;

    try {
      const payload = await enterTableRoom(room);
      if (payload && payload.ok) {
        const roomLabel = payload.roomCode || payload.roomId;
        setRoomStatus(card, titleRoom(room) + " room ready: " + roomLabel, payload);
        toast(titleRoom(room) + " preview room created. Tap Open Table Room.", false);
      } else {
        setRoomStatus(card, titleRoom(room) + " room request finished, but no room payload came back.");
      }
    } catch (error) {
      const message = error && error.message ? error.message : "Table room missed. Try again.";
      setRoomStatus(card, message);
      toast(message, true);
    } finally {
      button.disabled = false;
      actionLocked = false;
    }
  }

  async function quickJoinRoom(event) {
    event.preventDefault();
    const input = document.getElementById("quickJoinCode");
    const status = document.getElementById("quickJoinStatus");
    const code = String(input && input.value || "").trim().toUpperCase();
    if (!code) {
      if (status) status.textContent = "Enter a room code first.";
      return;
    }

    try {
      if (status) status.textContent = "Joining room...";
      if (!window.HWMultiplayerInvites || typeof window.HWMultiplayerInvites.joinTable !== "function") throw new Error("Multiplayer helper still loading.");
      const result = await window.HWMultiplayerInvites.joinTable(code);
      const roomId = result && result.room && result.room.id;
      if (window.HWAuth && typeof window.HWAuth.addPoints === "function") {
        try { await window.HWAuth.addPoints(8, "multiplayer_quick_join"); } catch (error) {}
      }
      if (status) status.textContent = "Joined. +8 Cool Points. Sending you to the live table...";
      if (roomId) window.location.href = "table-room.html?room=" + encodeURIComponent(roomId) + "&joined=1";
      else window.location.href = "games.html?room=" + encodeURIComponent(result.roomCode || code) + "&joined=1";
    } catch (error) {
      if (status) status.textContent = error.message || "Could not join room.";
    }
  }

  async function boot() {
    const year = document.getElementById("year");
    const authLink = document.getElementById("gamesAuthLink");
    if (year) year.textContent = new Date().getFullYear();

    markTableBuyInsAsPreviewOnly();
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
      if (button.__hwCasinoActionBound) return;
      button.__hwCasinoActionBound = true;
      button.addEventListener("click", () => handleRoomAction(button));
    });

    document.addEventListener("hyph:points-updated", function (event) {
      const points = event && event.detail && typeof event.detail.points === "number" ? event.detail.points : undefined;
      renderBalance(points);
    });
    window.addEventListener("hw:points-change", function (event) {
      const points = event && event.detail && typeof event.detail.points === "number" ? event.detail.points : undefined;
      renderBalance(points);
    });

    const quickJoinForm = document.getElementById("quickJoinForm");
    if (quickJoinForm && !quickJoinForm.__hwQuickJoinBound) {
      quickJoinForm.__hwQuickJoinBound = true;
      quickJoinForm.addEventListener("submit", quickJoinRoom);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();