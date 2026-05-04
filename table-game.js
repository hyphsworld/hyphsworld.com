(function () {
  "use strict";

  const CONFIG_FILE = "supabase-config.js";
  const CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  const REFRESH_MS = 7000;
  const GAME_CONFIG = {
    dice: { title: "Dice Table", intro: "Roll dice, beat the table, submit the score, and stack Cool Points.", scoreKey: "01_dice", winPoints: 75, maxPlayers: 2 },
    blackjack: { title: "Blackjack Table", intro: "Hit, stand, beat the dealer, and submit your 21 pressure to the leaderboard.", scoreKey: "01_blackjack", winPoints: 100, maxPlayers: 2 },
    poker: { title: "Poker Room Beta", intro: "Poker room shell is live. Use beta scoring while full betting and hand ranks come next.", scoreKey: "01_poker_beta", winPoints: 125, maxPlayers: 6 }
  };

  let sbPromise = null;
  let currentUser = null;
  let activeRoom = null;
  let activeState = null;
  let refreshTimer = null;
  let gameType = "dice";
  let localScore = 0;

  function $(id) { return document.getElementById(id); }
  function setText(id, value) { const el = $(id); if (el) el.textContent = value; }
  function safeText(value, fallback) { return String(value || fallback || "").replace(/[<>]/g, "").trim(); }
  function rand(max) { return Math.floor(Math.random() * max); }
  function roomCode() { return Math.random().toString(36).replace(/[^a-z0-9]/gi, "").slice(2, 8).toUpperCase(); }
  function cardValue(card) { return Math.min(card.rank, 10); }
  function handTotal(cards) {
    let total = 0;
    let aces = 0;
    cards.forEach((card) => { if (card.rank === 1) { aces += 1; total += 11; } else total += cardValue(card); });
    while (total > 21 && aces > 0) { total -= 10; aces -= 1; }
    return total;
  }
  function cardLabel(card) { const names = { 1: "A", 11: "J", 12: "Q", 13: "K" }; return `${names[card.rank] || card.rank}${card.suit}`; }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts).find((script) => script.src && script.src.includes(src));
      if (existing) { existing.addEventListener("load", resolve, { once: true }); setTimeout(resolve, 200); return; }
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Could not load " + src));
      document.head.appendChild(script);
    });
  }

  function configReady(config) {
    const url = String(config?.url || "").trim();
    const anonKey = String(config?.anonKey || config?.anon_key || "").trim();
    return Boolean(url && anonKey && !/PASTE_|YOUR_|PROJECT_URL|ANON_PUBLIC_KEY/i.test(url + anonKey));
  }

  async function getClient() {
    if (sbPromise) return sbPromise;
    sbPromise = (async () => {
      if (!window.HW_SUPABASE_CONFIG) await loadScript(CONFIG_FILE);
      const config = window.HW_SUPABASE_CONFIG || {};
      if (!configReady(config)) throw new Error("Supabase config missing.");
      if (!window.supabase || !window.supabase.createClient) await loadScript(CDN);
      if (!window.supabase || !window.supabase.createClient) throw new Error("Supabase client unavailable.");
      return window.supabase.createClient(config.url, config.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    })();
    return sbPromise;
  }

  async function requireUser() {
    if (!window.HWAuth) throw new Error("Auth unavailable.");
    const user = await window.HWAuth.getCurrentUser();
    if (!user || !user.userId) throw new Error("Login required to play.");
    currentUser = user;
    const authLink = $("tableAuthLink");
    if (authLink) { authLink.textContent = "Manage ID"; authLink.href = "account.html"; }
    return user;
  }

  function setStatus(message) { setText("tableStatus", message); }

  function getGameType() {
    const params = new URLSearchParams(window.location.search);
    const requested = String(params.get("game") || "dice").toLowerCase();
    return GAME_CONFIG[requested] ? requested : "dice";
  }

  function applyGameCopy() {
    const cfg = GAME_CONFIG[gameType];
    document.title = `${cfg.title} | HYPHSWORLD`;
    setText("tableGameTitle", cfg.title);
    setText("tableGameIntro", cfg.intro);
    setText("tableSideTitle", `${cfg.title} Tables`);
    setText("tableBoardTitle", cfg.title);
    setText("tableModeLabel", gameType.toUpperCase());
    setText("tickerGameName", cfg.title.toUpperCase());
    setText("tickerGameName2", cfg.title.toUpperCase());
  }

  async function listRooms() {
    const sb = await getClient();
    const list = $("tableRoomList");
    if (!list) return;
    const { data, error } = await sb.from("game_rooms").select("id,room_code,game_type,status,max_players,created_at").eq("game_type", gameType).in("status", ["waiting", "playing"]).order("created_at", { ascending: false }).limit(10);
    if (error) { list.innerHTML = `<div class="hw-leaderboard-empty">Could not load tables: ${safeText(error.message, "Supabase error")}</div>`; return; }
    if (!data || !data.length) { list.innerHTML = `<div class="hw-leaderboard-empty">No open ${gameType} tables yet. Create one.</div>`; return; }
    list.innerHTML = data.map((room) => `
      <article class="room-row">
        <div><strong>${safeText(room.room_code, "ROOM")}</strong><span>${safeText(room.status, "waiting")} • ${safeText(room.game_type, gameType)}</span></div>
        <button class="games-btn" type="button" data-join-room="${room.id}">Join</button>
      </article>
    `).join("");
    list.querySelectorAll("[data-join-room]").forEach((button) => button.addEventListener("click", () => joinRoomById(button.getAttribute("data-join-room"))));
  }

  async function createRoom(event) {
    event.preventDefault();
    await requireUser();
    const sb = await getClient();
    const input = $("tableRoomName");
    const code = safeText(input && input.value ? input.value : roomCode(), "TABLE").replace(/\s+/g, "").slice(0, 10).toUpperCase() || roomCode();
    setStatus(`Creating ${gameType} table through Supabase...`);
    const { data, error } = await sb.rpc("create_table_game_room", { requested_code: code, requested_game_type: gameType });
    if (error || !data || data.ok === false) {
      const message = error ? error.message : safeText(data && data.error, "Room create failed.");
      setStatus(`Table did not create: ${message}`);
      return;
    }
    activeRoom = data.room;
    activeState = data.state;
    if (input) input.value = "";
    setStatus(`Table created: ${activeRoom.room_code}.`);
    renderState();
    startRefresh();
    await listRooms();
  }

  async function joinRoomByCode(event) {
    event.preventDefault();
    const input = $("tableRoomCodeInput");
    const code = safeText(input && input.value, "").replace(/\s+/g, "").toUpperCase();
    if (!code) return setStatus("Enter a room code first.");
    const sb = await getClient();
    const { data, error } = await sb.from("game_rooms").select("id").eq("room_code", code).eq("game_type", gameType).maybeSingle();
    if (error || !data) return setStatus("Room code not found.");
    await joinRoomById(data.id);
    if (input) input.value = "";
  }

  async function joinRoomById(roomId) {
    const user = await requireUser();
    const sb = await getClient();
    setStatus("Joining table...");
    const { data: room, error: roomError } = await sb.from("game_rooms").select("*").eq("id", roomId).maybeSingle();
    if (roomError || !room) return setStatus("Table not found.");
    const { data: players } = await sb.from("game_players").select("user_id,seat_number").eq("room_id", room.id).order("seat_number", { ascending: true });
    const already = (players || []).find((p) => p.user_id === user.userId);
    if (!already) {
      if ((players || []).length >= (room.max_players || GAME_CONFIG[gameType].maxPlayers)) return setStatus("That table is full.");
      const { error: joinError } = await sb.from("game_players").insert({ room_id: room.id, user_id: user.userId, seat_number: (players || []).length + 1, status: "ready", score: 0, bet: 0 });
      if (joinError) return setStatus(`Join failed: ${joinError.message}`);
    }
    const { data: stateRow } = await sb.from("game_state").select("state").eq("room_id", room.id).maybeSingle();
    let nextState = stateRow?.state || {};
    nextState = { ...nextState, status: "playing", updatedAt: new Date().toISOString(), log: [...(nextState.log || []), `${currentUser.displayName || "Player"}: joined the table.`].slice(-16) };
    await saveState(room, nextState);
    activeRoom = { ...room, status: nextState.status };
    activeState = nextState;
    setStatus("Joined table. Run a round when ready.");
    renderState();
    startRefresh();
    await listRooms();
  }

  async function saveState(room, nextState) {
    if (!room || !currentUser) return;
    const sb = await getClient();
    activeState = nextState;
    const { error: stateError } = await sb.from("game_state").upsert({ room_id: room.id, state: nextState, updated_by: currentUser.userId }, { onConflict: "room_id" });
    if (stateError) return setStatus(`Save failed: ${stateError.message}`);
    await sb.from("game_rooms").update({ status: nextState.status, current_turn_user_id: currentUser.userId, updated_at: new Date().toISOString() }).eq("id", room.id);
  }

  async function refreshActiveRoom() {
    if (!activeRoom) return;
    const sb = await getClient();
    const { data: row } = await sb.from("game_state").select("state").eq("room_id", activeRoom.id).maybeSingle();
    if (row && row.state) { activeState = row.state; renderState(); }
  }
  function startRefresh() { if (refreshTimer) clearInterval(refreshTimer); refreshTimer = setInterval(refreshActiveRoom, REFRESH_MS); }

  function diceRound() {
    if (!activeRoom || !activeState) return setStatus("Create or join a Dice table first.");
    const player = [rand(6) + 1, rand(6) + 1];
    const table = [rand(6) + 1, rand(6) + 1];
    const playerTotal = player[0] + player[1];
    const tableTotal = table[0] + table[1];
    localScore = Math.max(0, playerTotal * 10 - tableTotal * 3);
    const result = playerTotal >= tableTotal ? "WIN" : "LOSS";
    activeState = { ...activeState, status: "playing", rolls: { ...(activeState.rolls || {}), [currentUser.userId]: player, table }, lastResult: result, lastScore: localScore, log: [...(activeState.log || []), `${currentUser.displayName || "Player"}: rolled ${playerTotal}. Table rolled ${tableTotal}. ${result}.`].slice(-16), updatedAt: new Date().toISOString() };
    saveState(activeRoom, activeState);
    renderState();
  }

  function makeCardDeck() {
    const suits = ["♠", "♥", "♦", "♣"];
    const deck = [];
    suits.forEach((suit) => { for (let rank = 1; rank <= 13; rank += 1) deck.push({ rank, suit }); });
    for (let i = deck.length - 1; i > 0; i -= 1) { const j = rand(i + 1); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    return deck;
  }

  function blackjackDeal() {
    if (!activeRoom || !activeState) return setStatus("Create or join a Blackjack table first.");
    const deck = makeCardDeck();
    const player = [deck.shift(), deck.shift()];
    const dealer = [deck.shift(), deck.shift()];
    localScore = handTotal(player);
    activeState = { ...activeState, status: "playing", blackjack: { deck, player, dealer, stood: false, result: "playing" }, lastScore: localScore, log: [...(activeState.log || []), `${currentUser.displayName || "Player"}: dealt blackjack hand.`].slice(-16), updatedAt: new Date().toISOString() };
    saveState(activeRoom, activeState);
    renderState();
  }

  function blackjackHit() {
    const bj = activeState && activeState.blackjack;
    if (!bj || bj.result !== "playing") return setStatus("Deal a blackjack hand first.");
    const deck = [...bj.deck];
    const player = [...bj.player, deck.shift()];
    const total = handTotal(player);
    const result = total > 21 ? "bust" : "playing";
    localScore = total > 21 ? 0 : total * 5;
    activeState = { ...activeState, blackjack: { ...bj, deck, player, result }, lastScore: localScore, log: [...(activeState.log || []), `${currentUser.displayName || "Player"}: hit. Total ${total}.`].slice(-16), updatedAt: new Date().toISOString() };
    saveState(activeRoom, activeState);
    renderState();
  }

  function blackjackStand() {
    const bj = activeState && activeState.blackjack;
    if (!bj || bj.result !== "playing") return setStatus("Deal a blackjack hand first.");
    let deck = [...bj.deck];
    let dealer = [...bj.dealer];
    while (handTotal(dealer) < 17) dealer.push(deck.shift());
    const playerTotal = handTotal(bj.player);
    const dealerTotal = handTotal(dealer);
    let result = "loss";
    if (dealerTotal > 21 || playerTotal > dealerTotal) result = "win";
    else if (playerTotal === dealerTotal) result = "push";
    localScore = result === "win" ? playerTotal * 10 : result === "push" ? playerTotal * 4 : Math.max(1, playerTotal);
    activeState = { ...activeState, blackjack: { ...bj, deck, dealer, stood: true, result }, lastScore: localScore, log: [...(activeState.log || []), `${currentUser.displayName || "Player"}: stood at ${playerTotal}. Dealer ${dealerTotal}. ${result.toUpperCase()}.`].slice(-16), updatedAt: new Date().toISOString() };
    saveState(activeRoom, activeState);
    renderState();
  }

  function pokerBetaRound() {
    if (!activeRoom || !activeState) return setStatus("Create or join a Poker table first.");
    const deck = makeCardDeck();
    const hand = [deck.shift(), deck.shift()];
    const community = [deck.shift(), deck.shift(), deck.shift(), deck.shift(), deck.shift()];
    localScore = hand.reduce((sum, card) => sum + cardValue(card), 0) * 10 + rand(25);
    activeState = { ...activeState, poker: { hand, community, betaScore: localScore }, lastScore: localScore, log: [...(activeState.log || []), `${currentUser.displayName || "Player"}: ran Poker Beta hand for ${localScore}.`].slice(-16), updatedAt: new Date().toISOString() };
    saveState(activeRoom, activeState);
    renderState();
  }

  async function submitScore() {
    if (!activeRoom || !activeState || !currentUser) return setStatus("Create or join a table first.");
    const score = Math.max(1, Number(activeState.lastScore || localScore || 1));
    const cfg = GAME_CONFIG[gameType];
    const sb = await getClient();
    const { error } = await sb.from("game_scores").insert({ user_id: currentUser.userId, game_key: cfg.scoreKey, score, points_delta: cfg.winPoints, metadata: { room_code: activeRoom.room_code, source: "table_game" } });
    if (error) return setStatus(`Score save failed: ${error.message}`);
    if (window.HWAuth && typeof window.HWAuth.addPoints === "function") { try { await window.HWAuth.addPoints(cfg.winPoints, `${cfg.scoreKey}_win`); } catch (error) {} }
    setStatus(`Score submitted: ${score}. +${cfg.winPoints} Cool Points.`);
    activeState = { ...activeState, log: [...(activeState.log || []), `${currentUser.displayName || "Player"}: submitted ${score}. +${cfg.winPoints} Cool Points.`].slice(-16), updatedAt: new Date().toISOString() };
    await saveState(activeRoom, activeState);
    renderState();
  }

  function renderState() {
    const stage = $("tableStage");
    const controls = $("tableControls");
    const log = $("tableLog");
    if (!stage || !controls || !log) return;
    if (!activeRoom || !activeState || !currentUser) {
      stage.innerHTML = `<div class="hw-leaderboard-empty">Create or join a table to start.</div>`;
      controls.innerHTML = "";
      return;
    }
    setText("tableActiveRoomCode", activeRoom.room_code || "ROOM");
    setText("tableModeLabel", gameType.toUpperCase());

    if (gameType === "dice") {
      const rolls = activeState.rolls || {};
      const player = rolls[currentUser.userId] || [];
      const table = rolls.table || [];
      stage.innerHTML = `<div class="bone-yard"><span class="domino-tile"><span>${player[0] || "?"}</span><span>${player[1] || "?"}</span></span><strong>VS</strong><span class="domino-tile"><span>${table[0] || "?"}</span><span>${table[1] || "?"}</span></span><div class="hw-leaderboard-empty">Score: ${activeState.lastScore || 0}</div></div>`;
      controls.innerHTML = `<button class="games-btn primary" type="button" data-action="dice-roll">Roll Dice</button>`;
    } else if (gameType === "blackjack") {
      const bj = activeState.blackjack || { player: [], dealer: [], result: "waiting" };
      stage.innerHTML = `<div class="bone-yard"><div><strong>Player: ${handTotal(bj.player || [])}</strong><p>${(bj.player || []).map(cardLabel).join(" ") || "No cards"}</p></div><div><strong>Dealer: ${handTotal(bj.dealer || [])}</strong><p>${(bj.dealer || []).map(cardLabel).join(" ") || "No cards"}</p></div><div class="hw-leaderboard-empty">Result: ${safeText(bj.result, "waiting")} • Score: ${activeState.lastScore || 0}</div></div>`;
      controls.innerHTML = `<button class="games-btn primary" type="button" data-action="blackjack-deal">Deal</button><button class="games-btn" type="button" data-action="blackjack-hit">Hit</button><button class="games-btn ghost" type="button" data-action="blackjack-stand">Stand</button>`;
    } else {
      const poker = activeState.poker || { hand: [], community: [] };
      stage.innerHTML = `<div class="bone-yard"><div><strong>Your Hand</strong><p>${(poker.hand || []).map(cardLabel).join(" ") || "No cards"}</p></div><div><strong>Community</strong><p>${(poker.community || []).map(cardLabel).join(" ") || "No cards"}</p></div><div class="hw-leaderboard-empty">Beta Score: ${activeState.lastScore || 0}</div></div>`;
      controls.innerHTML = `<button class="games-btn primary" type="button" data-action="poker-beta">Run Poker Beta Hand</button>`;
    }

    controls.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => {
      const action = button.getAttribute("data-action");
      if (action === "dice-roll") diceRound();
      if (action === "blackjack-deal") blackjackDeal();
      if (action === "blackjack-hit") blackjackHit();
      if (action === "blackjack-stand") blackjackStand();
      if (action === "poker-beta") pokerBetaRound();
    }));

    log.innerHTML = (activeState.log || []).slice().reverse().map((line) => `<p>${safeText(line, "Table updated.")}</p>`).join("") || `<p>Duck Sauce: “Quiet table. Suspicious.”</p>`;
  }

  function leaveView() {
    activeRoom = null;
    activeState = null;
    if (refreshTimer) clearInterval(refreshTimer);
    setText("tableActiveRoomCode", "None");
    setText("tableModeLabel", gameType.toUpperCase());
    renderState();
    setStatus("Left table view. Open tables are still listed.");
  }

  async function boot() {
    const year = $("year");
    if (year) year.textContent = new Date().getFullYear();
    gameType = getGameType();
    applyGameCopy();
    try { await requireUser(); setStatus(`Logged in. Create or join a ${gameType} table.`); } catch (error) { setStatus("Login required to create, join, and submit scores."); }
    $("tableCreateForm")?.addEventListener("submit", createRoom);
    $("tableJoinForm")?.addEventListener("submit", joinRoomByCode);
    $("tableRefreshRooms")?.addEventListener("click", listRooms);
    $("tableSubmitScoreBtn")?.addEventListener("click", submitScore);
    $("tableLeaveBtn")?.addEventListener("click", leaveView);
    $("tableResetRoundBtn")?.addEventListener("click", () => { if (gameType === "dice") diceRound(); else if (gameType === "blackjack") blackjackDeal(); else pokerBetaRound(); });
    await listRooms();
    setInterval(listRooms, 30000);
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
