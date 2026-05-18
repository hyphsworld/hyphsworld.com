(function () {
  "use strict";

  const POKER_PREVIEWS = [
    { label: "Two Pair", board: ["A♠", "Q♠", "9♦", "A♦", "10♦"], player: ["4♥", "3♠"], cpu: [["K♣", "K♦"], ["7♠", "7♥"], ["J♣", "8♦"], ["5♣", "5♥"], ["2♦", "2♣"]] },
    { label: "Flush Draw", board: ["K♠", "Q♠", "10♠", "8♣", "5♠"], player: ["A♠", "3♠"], cpu: [["9♥", "9♣"], ["6♦", "6♣"], ["J♥", "4♦"], ["Q♦", "2♣"], ["7♣", "7♦"]] },
    { label: "Pair", board: ["9♣", "9♦", "7♥", "4♠", "2♣"], player: ["A♥", "K♦"], cpu: [["3♣", "3♦"], ["8♠", "8♥"], ["10♣", "6♦"], ["Q♥", "5♣"], ["J♦", "2♠"]] },
    { label: "High Card", board: ["A♥", "J♣", "8♦", "6♠", "3♥"], player: ["K♠", "Q♦"], cpu: [["4♥", "4♣"], ["5♠", "5♦"], ["10♥", "2♦"], ["9♠", "7♦"], ["6♣", "3♣"]] }
  ];

  const DOMINO_SETS = [
    ["6|6", "6|4", "5|5", "3|2", "0|6"],
    ["5|4", "4|4", "6|1", "2|2", "0|3"],
    ["3|6", "1|1", "5|0", "4|2", "6|2"],
    ["0|0", "2|5", "3|3", "1|6", "4|5"]
  ];

  let mode = "poker";
  let roomId = "";
  let roomCode = "Preview";
  let previewIndex = 0;
  let expandedSeats = false;
  let player = { name: "Player Seat", avatar: "🧢", points: 0 };

  function $(id) { return document.getElementById(id); }
  function toast(text, bad) { const el = $("tableToast"); if (!el) return; el.textContent = text; el.style.display = "block"; el.style.background = bad ? "linear-gradient(135deg,#ff6b6b,#ffd166)" : "linear-gradient(135deg,#75ff75,#dfff75)"; clearTimeout(window.__tableToastTimer); window.__tableToastTimer = setTimeout(() => { el.style.display = "none"; }, 3200); }
  function setText(id, value) { const el = $(id); if (el) el.textContent = String(value); }
  function roomParam() { const params = new URLSearchParams(window.location.search); return params.get("room") || params.get("roomId") || ""; }

  async function getSupabaseClient() { if (!window.HWAuth || typeof window.HWAuth.getClient !== "function") return null; const maybeClient = window.HWAuth.getClient(); const client = maybeClient && typeof maybeClient.then === "function" ? await maybeClient : maybeClient; return client && typeof client.from === "function" ? client : null; }
  async function getCurrentUser() { if (!window.HWAuth || typeof window.HWAuth.getCurrentUser !== "function") return null; try { return await window.HWAuth.getCurrentUser(); } catch (error) { return null; } }
  async function refreshBalance() { try { if (window.HWPoints && typeof window.HWPoints.refresh === "function") await window.HWPoints.refresh(); if (window.HWPoints && typeof window.HWPoints.get === "function") { player.points = window.HWPoints.get(); setText("tableBalance", player.points); } } catch (error) {} }

  function normalizeMode(value) { const text = String(value || "poker").toLowerCase(); if (text === "dominos" || text === "dominoes" || text === "domino") return "dominoes"; return "poker"; }
  function modeLabel() { return mode === "dominoes" ? "Dominoes" : "Poker"; }
  function cardHtml(card) { return '<span class="play-card">' + card + '</span>'; }
  function miniCards(cards) { return '<div class="seat-cards">' + cards.map((card) => '<span class="seat-mini-card">' + card + '</span>').join("") + '</div>'; }

  function seatHtml(cls, avatar, name, points, bet, cards) {
    return '<article class="table-seat ' + cls + '"><div class="seat-head"><span class="seat-avatar">' + avatar + '</span><div><div class="seat-name">' + name + '</div><div class="seat-points">' + points + ' CP</div></div></div><span class="seat-bet">● ' + bet + '</span>' + miniCards(cards || ["▢", "▢"]) + '</article>';
  }

  function addToggleButton() {
    const actions = document.querySelector(".table-actions");
    if (!actions || $("toggleSeatsBtn")) return;
    const btn = document.createElement("button");
    btn.className = "table-btn secondary";
    btn.type = "button";
    btn.id = "toggleSeatsBtn";
    btn.textContent = "Add More CPUs";
    btn.addEventListener("click", function () {
      expandedSeats = !expandedSeats;
      btn.textContent = expandedSeats ? "One CPU Mode" : "Add More CPUs";
      if (mode === "poker") renderPokerPreview(true);
    });
    actions.insertBefore(btn, actions.children[1] || null);
  }

  function renderHeader(room) {
    const label = modeLabel();
    setText("tableTitle", label + " Table"); setText("roomMode", "Free Preview"); setText("roomCode", room?.room_code || room?.roomCode || roomCode || roomId || "Preview"); setText("previewPot", "0 CP");
    setText("tableIntro", label + " room is open in free preview. No Cool Points are charged until the full gameplay loop is built.");
    setText("tableStatus", label + " preview loaded. Choose Start Preview to light up the felt."); setText("cpuStatus", "CPU opponent is waiting for a preview round."); setText("playerStatus", "You are seated. Buy-ins are locked for now.");
  }

  async function renderPlayer() { const user = await getCurrentUser(); if (user) { player.name = user.displayName || user.username || "Player Seat"; player.avatar = user.avatarIcon || "🧢"; setText("playerName", player.name); setText("playerAvatar", player.avatar); } await refreshBalance(); }

  function renderPokerPreview(keepIndex) {
    const hand = POKER_PREVIEWS[previewIndex % POKER_PREVIEWS.length];
    const zone = $("playZone"); if (!zone) return;
    const extraSeats = expandedSeats ? seatHtml('seat-left-top', '🛸', 'CPU 02', 200, 'D 200', hand.cpu[1]) + seatHtml('seat-right-top', '😎', 'CPU 03', 99999, 'D 200', hand.cpu[2]) + seatHtml('seat-left-bottom', '👾', 'CPU 04', 200, 'D 200', hand.cpu[3]) + seatHtml('seat-right-bottom', '🧪', 'CPU 05', 200, 'D 200', hand.cpu[4]) : '<div class="empty-seat empty-left">+ CPU</div><div class="empty-seat empty-right">+ CPU</div>';
    zone.innerHTML = '<div class="poker-table-shell ' + (expandedSeats ? 'is-expanded' : 'is-simple') + '"><div class="table-felt-logo">HW</div>' + seatHtml('seat-top', '🤖', 'CPU 01', 200, 'D 200', hand.cpu[0]) + extraSeats + seatHtml('seat-player', player.avatar, player.name, player.points, 'Preview', hand.player) + '<div class="community-zone"><div class="hand-badge">' + hand.label + '</div><div class="community-cards">' + hand.board.map(cardHtml).join("") + '</div><div class="pot-badge">Pot: 0 CP Preview</div></div></div>';
    setText("tableStatus", expandedSeats ? "Poker preview dealt with extra CPU seats. No Cool Points charged." : "Poker preview dealt one-on-one. Tap Add More CPUs for a fuller table.");
    setText("cpuStatus", expandedSeats ? "Multiple CPU seats active in preview mode." : "CPU 01 is active. Extra seats are optional.");
    setText("playerStatus", "Preview hand dealt. No wager active."); toast("Poker preview dealt. No CP charged.", false);
    if (!keepIndex) previewIndex += 1;
  }

  function renderDominoPreview() {
    const tiles = DOMINO_SETS[previewIndex % DOMINO_SETS.length]; const zone = $("playZone"); if (!zone) return;
    zone.innerHTML = '<div class="domino-table-shell"><div class="domino-board"><div class="domino-label">CPU Tray</div><div class="domino-rack"><span class="domino-tile">▦</span><span class="domino-tile">▦</span><span class="domino-tile">▦</span></div><div class="domino-label">Center Chain</div><div class="domino-chain">' + tiles.map((tile) => '<span class="domino-tile">' + tile + '</span>').join("") + '</div><div class="domino-label">' + player.name + ' Tray</div><div class="domino-rack"><span class="domino-tile">6|6</span><span class="domino-tile">5|4</span><span class="domino-tile">3|2</span></div></div></div>';
    setText("tableStatus", "Domino preview round staged. CP stays untouched until Start Round is built."); setText("cpuStatus", "CPU stacks tiles and waits."); setText("playerStatus", "Preview tray loaded. No wager active."); toast("Domino preview staged. No Cool Points charged.", false); previewIndex += 1;
  }

  function resetPreview() { const zone = $("playZone"); if (zone) zone.innerHTML = "<p>Choose a preview action to light up the table.</p>"; setText("tableStatus", modeLabel() + " preview reset. The room is still open."); setText("cpuStatus", "Waiting at the table."); setText("playerStatus", "Connected to the room."); toast("Preview reset.", false); }
  function startPreview() { if (mode === "dominoes") renderDominoPreview(); else renderPokerPreview(false); }

  async function loadRoom() {
    roomId = roomParam(); const client = await getSupabaseClient();
    if (!roomId || !client) { mode = "poker"; renderHeader(null); await renderPlayer(); if (!roomId) setText("tableStatus", "No room ID found. Showing offline Poker preview."); return; }
    try { const { data, error } = await client.from("game_rooms").select("id,room_code,game_type,status,created_at").eq("id", roomId).maybeSingle(); if (error) throw error; mode = normalizeMode(data?.game_type); roomCode = data?.room_code || roomId; renderHeader(data); await renderPlayer(); } catch (error) { mode = "poker"; renderHeader(null); await renderPlayer(); setText("tableStatus", error.message || "Room lookup missed. Showing safe preview mode."); toast("Room lookup missed. Safe preview loaded.", true); }
  }

  function bind() { const year = $("year"); if (year) year.textContent = new Date().getFullYear(); const preview = $("previewDealBtn"); const reset = $("resetTableBtn"); if (preview) preview.addEventListener("click", startPreview); if (reset) reset.addEventListener("click", resetPreview); addToggleButton(); }
  async function boot() { bind(); await loadRoom(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
