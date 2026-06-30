(function () {
  "use strict";

  let actionLocked = false;
  let dailySpinLocked = false;

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

    document.querySelectorAll("[data-hw-daily-balance]").forEach((el) => {
      el.textContent = String(next);
    });
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

  function injectDailySpinStyles() {
    if (document.getElementById("hwDailySpinStyles")) return;
    const style = document.createElement("style");
    style.id = "hwDailySpinStyles";
    style.textContent = "" +
      ".daily-wheel-card{position:relative;width:min(1180px,calc(100% - 28px));margin:22px auto;padding:22px;border-radius:32px;border:1px solid rgba(31,252,255,.34);background:radial-gradient(circle at 14% 0%,rgba(31,252,255,.24),transparent 32%),radial-gradient(circle at 86% 4%,rgba(255,79,216,.20),transparent 34%),linear-gradient(145deg,rgba(6,10,30,.94),rgba(0,0,0,.88));box-shadow:0 28px 80px rgba(0,0,0,.45),0 0 34px rgba(31,252,255,.14);overflow:hidden;color:#f4fff4}" +
      ".daily-wheel-card:before{content:\"\";position:absolute;inset:-30%;background:conic-gradient(from 90deg,rgba(117,255,117,.14),rgba(31,252,255,.18),rgba(255,79,216,.16),rgba(255,228,92,.14),rgba(117,255,117,.14));animation:hwDailySpinGlow 8s linear infinite;opacity:.52}" +
      ".daily-wheel-card>*{position:relative;z-index:1}.daily-spin-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,330px);gap:18px;align-items:center}.daily-wheel-kicker{display:inline-flex;padding:8px 12px;border-radius:999px;background:#1ffcff;color:#041014;font-weight:1000;letter-spacing:.14em;text-transform:uppercase;font-size:.74rem}.daily-wheel-card h2{margin:14px 0 8px;font-size:clamp(2.5rem,8vw,6rem);line-height:.84;text-transform:uppercase;letter-spacing:-.07em;text-shadow:4px 4px 0 rgba(255,79,216,.50),0 0 28px rgba(31,252,255,.22)}.daily-wheel-card p{max-width:760px;color:rgba(244,255,244,.78);font-weight:800;line-height:1.6}.daily-spin-status{margin-top:14px;padding:12px 14px;border-radius:18px;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.38);font-weight:1000;color:#dfff75}.daily-spin-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.daily-spin-btn{appearance:none;border:0;border-radius:999px;padding:13px 18px;background:linear-gradient(90deg,#75ff75,#1ffcff,#ffe45c);color:#050505;font-weight:1000;text-transform:uppercase;letter-spacing:.06em;cursor:pointer}.daily-spin-btn:disabled{opacity:.65;cursor:not-allowed}.daily-spin-mini{display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:12px 14px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.16);font-weight:1000}.daily-spin-orb{display:grid;place-items:center;aspect-ratio:1;width:100%;min-height:220px;border-radius:999px;background:radial-gradient(circle at 30% 20%,#fff,#ffe45c 18%,#ff4fd8 38%,#1ffcff 58%,#111 78%);box-shadow:inset 0 0 35px rgba(0,0,0,.42),0 0 44px rgba(31,252,255,.22);font-size:clamp(3rem,9vw,5.5rem);font-weight:1000;color:#050505;text-shadow:0 2px 0 rgba(255,255,255,.34)}.daily-spin-orb.is-spinning{animation:hwDailySpin 1.05s cubic-bezier(.2,.7,.2,1)}@keyframes hwDailySpin{to{transform:rotate(1080deg) scale(1.04)}}@keyframes hwDailySpinGlow{to{transform:rotate(360deg)}}@media(max-width:760px){.daily-spin-grid{grid-template-columns:1fr}.daily-spin-orb{max-width:260px;margin:0 auto}.daily-spin-btn,.daily-spin-mini{width:100%;justify-content:center}}";
    document.head.appendChild(style);
  }

  function mountDailySpinCard() {
    if (document.querySelector("[data-hw-daily-spin-card]")) return;
    const hero = document.querySelector(".casino-hero");
    if (!hero) return;

    injectDailySpinStyles();

    const card = document.createElement("section");
    card.className = "daily-wheel-card";
    card.setAttribute("data-hw-daily-spin-card", "");
    card.setAttribute("aria-label", "Daily Spin Cool Points reward");
    card.innerHTML = "" +
      "<div class=\"daily-spin-grid\">" +
        "<div>" +
          "<span class=\"daily-wheel-kicker\">Daily Spin / Real Cool Points</span>" +
          "<h2>Daily Spin</h2>" +
          "<p>One clean spin per day. Supabase pays the reward, logs the win, updates your HYPHSWORLD ID, and keeps Duck Sauce from letting anybody tap-dance the button.</p>" +
          "<div class=\"daily-spin-actions\">" +
            "<button class=\"daily-spin-btn\" type=\"button\" data-hw-daily-spin-btn>Spin For Points</button>" +
            "<span class=\"daily-spin-mini\">Balance: <strong data-hw-daily-balance>" + String(getPoints()) + "</strong> CP</span>" +
          "</div>" +
          "<div class=\"daily-spin-status\" data-hw-daily-spin-status>Ready. Login with your HYPHSWORLD ID, then spin.</div>" +
        "</div>" +
        "<div class=\"daily-spin-orb\" data-hw-daily-spin-orb>🦆</div>" +
      "</div>";

    hero.insertAdjacentElement("afterend", card);

    const button = card.querySelector("[data-hw-daily-spin-btn]");
    if (button) button.addEventListener("click", claimDailySpin);
  }

  async function claimDailySpin() {
    if (dailySpinLocked) return;

    const button = document.querySelector("[data-hw-daily-spin-btn]");
    const status = document.querySelector("[data-hw-daily-spin-status]");
    const orb = document.querySelector("[data-hw-daily-spin-orb]");

    dailySpinLocked = true;
    if (button) button.disabled = true;
    if (orb) {
      orb.classList.remove("is-spinning");
      void orb.offsetWidth;
      orb.classList.add("is-spinning");
    }
    if (status) status.textContent = "Spinning... contacting Supabase ledger.";

    try {
      const client = await getSupabaseClient();
      if (!client) throw new Error("Login system still loading. Refresh and try again.");

      await new Promise((resolve) => window.setTimeout(resolve, 900));
      const { data, error } = await client.rpc("claim_daily_spin");
      if (error) throw error;

      const payload = data || {};
      if (payload.already_spun) {
        if (status) status.textContent = payload.message || "Duck Sauce said you already spun today. Come back tomorrow.";
        toast("Already spun today. Duck Sauce has the logs.", true);
        return;
      }

      const points = Number.parseInt(payload.points_awarded, 10) || 0;
      const balance = Number.parseInt(payload.balance, 10) || 0;
      const prize = payload.prize_label || "Daily Spin Reward";

      if (status) status.textContent = "POINTS VERIFIED: +" + points + " CP — " + prize + ". Duck Sauce approves.";
      toast("Daily Spin paid: +" + points + " Cool Points.", false);
      renderBalance(balance);
      await refreshBalance();

      try {
        document.dispatchEvent(new CustomEvent("hyph:points-updated", { detail: { points: balance, source: "daily_spin" } }));
      } catch (error) {}
    } catch (error) {
      const message = error && error.message ? error.message : "Daily Spin missed. Try again.";
      if (status) status.textContent = message;
      toast(message, true);
      try { console.error("HYPHSWORLD Daily Spin error:", error); } catch (e) {}
    } finally {
      dailySpinLocked = false;
      if (button) button.disabled = false;
      if (orb) window.setTimeout(() => orb.classList.remove("is-spinning"), 350);
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
      }
    } catch (error) {
      toast(error.message || "Table room missed. Try again.", true);
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
    if (!code) { if (status) status.textContent = "Enter a room code first."; return; }
    try {
      if (status) status.textContent = "Joining room...";
      if (!window.HWMultiplayerInvites || typeof window.HWMultiplayerInvites.joinTable !== "function") throw new Error("Multiplayer helper still loading.");
      const result = await window.HWMultiplayerInvites.joinTable(code);
      const roomId = result && result.room && result.room.id;
      if (window.HWAuth && typeof window.HWAuth.addPoints === "function") { try { await window.HWAuth.addPoints(8, "multiplayer_quick_join"); } catch (error) {} }
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
    mountDailySpinCard();
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

    const quickJoinForm = document.getElementById("quickJoinForm");
    if (quickJoinForm) quickJoinForm.addEventListener("submit", quickJoinRoom);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();