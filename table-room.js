(function () {
  "use strict";

  const CARD_SETS = [
    ["A♠", "K♥", "Q♣", "J♦", "10♠"],
    ["9♣", "9♦", "7♥", "4♠", "2♣"],
    ["A♥", "A♦", "8♣", "6♠", "3♥"],
    ["K♠", "Q♠", "10♠", "8♠", "5♠"]
  ];

  const DOMINO_SETS = [
    ["6|6", "6|4", "5|5", "3|2", "0|6"],
    ["5|4", "4|4", "6|1", "2|2", "0|3"],
    ["3|6", "1|1", "5|0", "4|2", "6|2"],
    ["0|0", "2|5", "3|3", "1|6", "4|5"]
  ];

  let mode = "poker";
  let roomId = "";
  let previewIndex = 0;

  function $(id) { return document.getElementById(id); }

  function toast(text, bad) {
    const el = $("tableToast");
    if (!el) return;
    el.textContent = text;
    el.style.display = "block";
    el.style.background = bad ? "linear-gradient(135deg,#ff6b6b,#ffd166)" : "linear-gradient(135deg,#75ff75,#dfff75)";
    clearTimeout(window.__tableToastTimer);
    window.__tableToastTimer = setTimeout(() => { el.style.display = "none"; }, 3200);
  }

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = String(value);
  }

  function roomParam() {
    const params = new URLSearchParams(window.location.search);
    return params.get("room") || params.get("roomId") || "";
  }

  async function getSupabaseClient() {
    if (!window.HWAuth || typeof window.HWAuth.getClient !== "function") return null;
    const maybeClient = window.HWAuth.getClient();
    const client = maybeClient && typeof maybeClient.then === "function" ? await maybeClient : maybeClient;
    return client && typeof client.from === "function" ? client : null;
  }

  async function getCurrentUser() {
    if (!window.HWAuth || typeof window.HWAuth.getCurrentUser !== "function") return null;
    try { return await window.HWAuth.getCurrentUser(); } catch (error) { return null; }
  }

  async function refreshBalance() {
    try {
      if (window.HWPoints && typeof window.HWPoints.refresh === "function") await window.HWPoints.refresh();
      if (window.HWPoints && typeof window.HWPoints.get === "function") setText("tableBalance", window.HWPoints.get());
    } catch (error) {}
  }

  function normalizeMode(value) {
    const text = String(value || "poker").toLowerCase();
    if (text === "dominos" || text === "dominoes" || text === "domino") return "dominoes";
    return "poker";
  }

  function modeLabel() {
    return mode === "dominoes" ? "Dominoes" : "Poker";
  }

  function renderHeader(room) {
    const label = modeLabel();
    setText("tableTitle", label + " Table");
    setText("roomMode", "Free Preview");
    setText("roomCode", room?.room_code || room?.roomCode || roomId || "Preview");
    setText("previewPot", "0 CP");
    setText("tableIntro", label + " room is open in free preview. No Cool Points are charged until the full gameplay loop is built.");
    setText("tableStatus", label + " preview loaded. Choose Start Preview to light up the felt.");
    setText("cpuStatus", "CPU opponent is waiting for a preview round.");
    setText("playerStatus", "You are seated. Buy-ins are locked for now.");
  }

  async function renderPlayer() {
    const user = await getCurrentUser();
    if (user) {
      setText("playerName", user.displayName || user.username || "Player Seat");
      setText("playerAvatar", user.avatarIcon || "🧢");
    }
    await refreshBalance();
  }

  function renderPokerPreview() {
    const cards = CARD_SETS[previewIndex % CARD_SETS.length];
    const zone = $("playZone");
    if (!zone) return;
    zone.innerHTML = '<div class="card-line">' + cards.map((card) => '<span class="play-card">' + card + '</span>').join("") + '</div>';
    setText("tableStatus", "Poker preview hand dealt. CP stays untouched until Start Hand is built.");
    setText("cpuStatus", "CPU checks the felt and waits.");
    setText("playerStatus", "Preview cards dealt. No wager active.");
    toast("Poker preview dealt. No Cool Points charged.", false);
    previewIndex += 1;
  }

  function renderDominoPreview() {
    const tiles = DOMINO_SETS[previewIndex % DOMINO_SETS.length];
    const zone = $("playZone");
    if (!zone) return;
    zone.innerHTML = '<div class="domino-line">' + tiles.map((tile) => '<span class="domino-tile">' + tile + '</span>').join("") + '</div>';
    setText("tableStatus", "Domino preview round staged. CP stays untouched until Start Round is built.");
    setText("cpuStatus", "CPU stacks tiles and waits.");
    setText("playerStatus", "Preview tray loaded. No wager active.");
    toast("Domino preview staged. No Cool Points charged.", false);
    previewIndex += 1;
  }

  function resetPreview() {
    const zone = $("playZone");
    if (zone) zone.innerHTML = "<p>Choose a preview action to light up the table.</p>";
    setText("tableStatus", modeLabel() + " preview reset. The room is still open.");
    setText("cpuStatus", "Waiting at the table.");
    setText("playerStatus", "Connected to the room.");
    toast("Preview reset.", false);
  }

  function startPreview() {
    if (mode === "dominoes") renderDominoPreview();
    else renderPokerPreview();
  }

  async function loadRoom() {
    roomId = roomParam();
    const client = await getSupabaseClient();

    if (!roomId || !client) {
      mode = "poker";
      renderHeader(null);
      await renderPlayer();
      if (!roomId) setText("tableStatus", "No room ID found. Showing offline Poker preview.");
      return;
    }

    try {
      const { data, error } = await client.from("game_rooms").select("id,room_code,game_type,status,created_at").eq("id", roomId).maybeSingle();
      if (error) throw error;
      mode = normalizeMode(data?.game_type);
      renderHeader(data);
      await renderPlayer();
    } catch (error) {
      mode = "poker";
      renderHeader(null);
      await renderPlayer();
      setText("tableStatus", error.message || "Room lookup missed. Showing safe preview mode.");
      toast("Room lookup missed. Safe preview loaded.", true);
    }
  }

  function bind() {
    const year = $("year");
    if (year) year.textContent = new Date().getFullYear();
    const preview = $("previewDealBtn");
    const reset = $("resetTableBtn");
    if (preview) preview.addEventListener("click", startPreview);
    if (reset) reset.addEventListener("click", resetPreview);
  }

  async function boot() {
    bind();
    await loadRoom();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
