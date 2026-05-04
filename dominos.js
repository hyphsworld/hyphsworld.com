(function () {
  "use strict";

  const CONFIG_FILE = "supabase-config.js";
  const CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  const REFRESH_MS = 6500;
  const START_HAND = 7;
  const WIN_POINTS = 100;

  let sbPromise = null;
  let currentUser = null;
  let activeRoom = null;
  let activeState = null;
  let refreshTimer = null;

  function $(id) { return document.getElementById(id); }
  function setText(id, value) { const el = $(id); if (el) el.textContent = value; }
  function safeText(value, fallback) { return String(value || fallback || "").replace(/[<>]/g, "").trim(); }
  function rand(max) { return Math.floor(Math.random() * max); }
  function roomCode() { return Math.random().toString(36).replace(/[^a-z0-9]/gi, "").slice(2, 8).toUpperCase(); }
  function readableError(error) { return error && error.message ? error.message : String(error || "Unknown error"); }

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
      return window.supabase.createClient(config.url, config.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    })();
    return sbPromise;
  }

  function makeDeck() {
    const deck = [];
    for (let a = 0; a <= 6; a += 1) {
      for (let b = a; b <= 6; b += 1) deck.push([a, b]);
    }
    for (let i = deck.length - 1; i > 0; i -= 1) {
      const j = rand(i + 1);
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function createInitialState(userId) {
    const deck = makeDeck();
    const hostHand = deck.splice(0, START_HAND);
    return {
      version: 1,
      game: "dominos",
      status: "waiting",
      turnUserId: userId,
      board: [],
      hands: { [userId]: hostHand },
      deck,
      log: ["Duck Sauce: Table open. Waiting on player two."],
      winnerUserId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function drawHandForJoin(state, userId) {
    if (state.hands && state.hands[userId]) return state;
    const deck = Array.isArray(state.deck) ? state.deck : makeDeck();
    const hand = deck.splice(0, START_HAND);
    return {
      ...state,
      status: "playing",
      hands: { ...(state.hands || {}), [userId]: hand },
      deck,
      log: [...(state.log || []), "Buck: Player two cleared. Game live."],
      updatedAt: new Date().toISOString()
    };
  }

  function tileText(tile) {
    return Array.isArray(tile) ? `${tile[0]}|${tile[1]}` : "?|?";
  }

  function canPlay(tile, board) {
    if (!board || !board.length) return true;
    const left = board[0][0];
    const right = board[board.length - 1][1];
    return tile.includes(left) || tile.includes(right);
  }

  function playTile(state, userId, tileIndex) {
    const hand = [...((state.hands || {})[userId] || [])];
    const tile = hand[tileIndex];
    if (!tile) return { state, ok: false, message: "Tile missing." };
    if (state.turnUserId !== userId) return { state, ok: false, message: "Not your turn yet." };
    if (!canPlay(tile, state.board || [])) return { state, ok: false, message: "That tile does not touch the board." };

    hand.splice(tileIndex, 1);
    const board = [...(state.board || [])];

    if (!board.length) {
      board.push(tile);
    } else {
      const left = board[0][0];
      const right = board[board.length - 1][1];
      if (tile[1] === left) board.unshift(tile);
      else if (tile[0] === left) board.unshift([tile[1], tile[0]]);
      else if (tile[0] === right) board.push(tile);
      else if (tile[1] === right) board.push([tile[1], tile[0]]);
    }

    const playerIds = Object.keys(state.hands || {});
    const nextTurn = playerIds.find((id) => id !== userId) || userId;
    const winnerUserId = hand.length === 0 ? userId : null;

    return {
      ok: true,
      message: winnerUserId ? "Winner detected. Submit the win." : "Tile played.",
      state: {
        ...state,
        status: winnerUserId ? "finished" : "playing",
        winnerUserId,
        turnUserId: winnerUserId ? userId : nextTurn,
        board,
        hands: { ...(state.hands || {}), [userId]: hand },
        log: [...(state.log || []), `${currentUser.displayName || "Player"}: played ${tileText(tile)}.`].slice(-16),
        updatedAt: new Date().toISOString(),
        version: (state.version || 1) + 1
      }
    };
  }

  function drawTile(state, userId) {
    if (state.turnUserId !== userId) return { state, ok: false, message: "Not your turn to draw." };
    const deck = [...(state.deck || [])];
    if (!deck.length) return { state, ok: false, message: "Boneyard empty." };
    const tile = deck.shift();
    const hand = [...((state.hands || {})[userId] || []), tile];
    return {
      ok: true,
      message: "Tile drawn.",
      state: {
        ...state,
        deck,
        hands: { ...(state.hands || {}), [userId]: hand },
        log: [...(state.log || []), `${currentUser.displayName || "Player"}: drew from the boneyard.`].slice(-16),
        updatedAt: new Date().toISOString(),
        version: (state.version || 1) + 1
      }
    };
  }

  function setStatus(message) { setText("dominosStatus", message); }

  async function requireUser() {
    if (!window.HWAuth) throw new Error("Auth unavailable.");
    const user = await window.HWAuth.getCurrentUser();
    if (!user || !user.userId) throw new Error("Login required to play.");
    currentUser = user;
    const authLink = $("dominosAuthLink");
    if (authLink) { authLink.textContent = "Manage ID"; authLink.href = "account.html"; }
    return user;
  }

  async function listRooms() {
    const sb = await getClient();
    const list = $("roomList");
    if (!list) return;
    const { data, error } = await sb
      .from("game_rooms")
      .select("id,room_code,game_type,status,max_players,created_at")
      .eq("game_type", "dominos")
      .in("status", ["waiting", "playing"])
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      list.innerHTML = `<div class="hw-leaderboard-empty">Could not load tables: ${safeText(error.message, "Supabase error")}</div>`;
      return;
    }

    if (!data || !data.length) {
      list.innerHTML = `<div class="hw-leaderboard-empty">No open tables yet. Create one.</div>`;
      return;
    }

    list.innerHTML = data.map((room) => `
      <article class="room-row">
        <div><strong>${safeText(room.room_code, "ROOM")}</strong><span>${safeText(room.status, "waiting")} • ${safeText(room.game_type, "dominos")}</span></div>
        <button class="games-btn" type="button" data-join-room="${room.id}">Join</button>
      </article>
    `).join("");

    list.querySelectorAll("[data-join-room]").forEach((button) => {
      button.addEventListener("click", () => joinRoomById(button.getAttribute("data-join-room")));
    });
  }

  async function createRoom(event) {
    event.preventDefault();
    await requireUser();
    const sb = await getClient();
    const input = $("roomName");
    const code = safeText(input && input.value ? input.value : roomCode(), "01TABLE").replace(/\s+/g, "").slice(0, 10).toUpperCase() || roomCode();

    setStatus("Creating table through Supabase...");

    const { data, error } = await sb.rpc("create_domino_room", { requested_code: code });

    if (error || !data || data.ok === false) {
      const message = error ? readableError(error) : safeText(data && data.error, "Room create failed.");
      console.warn("01 Domino Room create warning:", message);
      setStatus(`Table did not create: ${message}`);
      return;
    }

    activeRoom = data.room;
    activeState = data.state;
    if (input) input.value = "";
    setStatus(`Table created: ${activeRoom.room_code}. Share the room code or wait for player two.`);
    renderState();
    startRefresh();
    await listRooms();
  }

  async function joinRoomByCode(event) {
    event.preventDefault();
    const input = $("roomCodeInput");
    const code = safeText(input && input.value, "").replace(/\s+/g, "").toUpperCase();
    if (!code) return setStatus("Enter a room code first.");
    const sb = await getClient();
    const { data, error } = await sb.from("game_rooms").select("id").eq("room_code", code).eq("game_type", "dominos").maybeSingle();
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
      if ((players || []).length >= 2) return setStatus("That table is full.");
      const { error: joinError } = await sb.from("game_players").insert({ room_id: room.id, user_id: user.userId, seat_number: (players || []).length + 1, status: "ready", score: 0, bet: 0 });
      if (joinError) return setStatus(`Join failed: ${joinError.message}`);
    }

    const { data: stateRow } = await sb.from("game_state").select("state").eq("room_id", room.id).maybeSingle();
    let nextState = stateRow?.state || createInitialState(room.host_id || user.userId);
    nextState = drawHandForJoin(nextState, user.userId);

    await sb.from("game_state").upsert({ room_id: room.id, state: nextState, updated_by: user.userId }, { onConflict: "room_id" });
    await sb.from("game_rooms").update({ status: nextState.status, current_turn_user_id: nextState.turnUserId, updated_at: new Date().toISOString() }).eq("id", room.id);

    activeRoom = { ...room, status: nextState.status };
    activeState = nextState;
    setStatus("Joined table. Play when it is your turn.");
    renderState();
    startRefresh();
    await listRooms();
  }

  async function saveState(nextState) {
    if (!activeRoom || !currentUser) return;
    const sb = await getClient();
    activeState = nextState;
    const { error: stateError } = await sb.from("game_state").upsert({ room_id: activeRoom.id, state: nextState, updated_by: currentUser.userId }, { onConflict: "room_id" });
    if (stateError) return setStatus(`Save failed: ${stateError.message}`);
    await sb.from("game_rooms").update({ status: nextState.status, current_turn_user_id: nextState.turnUserId, updated_at: new Date().toISOString() }).eq("id", activeRoom.id);
    renderState();
  }

  async function refreshActiveRoom() {
    if (!activeRoom) return;
    const sb = await getClient();
    const { data: row } = await sb.from("game_state").select("state").eq("room_id", activeRoom.id).maybeSingle();
    if (row && row.state) {
      activeState = row.state;
      renderState();
    }
  }

  function startRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(refreshActiveRoom, REFRESH_MS);
  }

  function renderState() {
    const board = $("boardTiles");
    const hand = $("playerHand");
    const log = $("dominoLog");
    if (!activeRoom || !activeState || !currentUser || !board || !hand || !log) return;

    setText("activeRoomCode", activeRoom.room_code || "ROOM");
    setText("activeTurn", activeState.turnUserId === currentUser.userId ? "Your Turn" : "Opponent");

    const boardTiles = activeState.board || [];
    board.innerHTML = boardTiles.length
      ? boardTiles.map((tile) => `<span class="domino-tile"><span>${tile[0]}</span><span>${tile[1]}</span></span>`).join("")
      : `<span class="hw-leaderboard-empty">Board empty. First playable tile can go anywhere.</span>`;

    const myHand = (activeState.hands || {})[currentUser.userId] || [];
    hand.innerHTML = myHand.length
      ? myHand.map((tile, index) => `<button class="domino-tile tile-button" type="button" data-tile-index="${index}"><span>${tile[0]}</span><span>${tile[1]}</span></button>`).join("")
      : `<span class="hw-leaderboard-empty">No tiles in your hand. Submit win if the table is finished.</span>`;

    hand.querySelectorAll("[data-tile-index]").forEach((button) => {
      button.addEventListener("click", async () => {
        const result = playTile(activeState, currentUser.userId, Number(button.getAttribute("data-tile-index")));
        setStatus(result.message);
        if (result.ok) await saveState(result.state);
      });
    });

    log.innerHTML = (activeState.log || []).slice().reverse().map((line) => `<p>${safeText(line, "Table updated.")}</p>`).join("") || `<p>Duck Sauce: “Quiet table. Suspicious.”</p>`;
  }

  async function handleDraw() {
    if (!activeState || !currentUser) return setStatus("Join a table first.");
    const result = drawTile(activeState, currentUser.userId);
    setStatus(result.message);
    if (result.ok) await saveState(result.state);
  }

  async function submitWin() {
    if (!activeRoom || !activeState || !currentUser) return setStatus("Join a table first.");
    const myHand = (activeState.hands || {})[currentUser.userId] || [];
    const canClaim = activeState.winnerUserId === currentUser.userId || myHand.length === 0;
    if (!canClaim) return setStatus("Buck says you need an empty hand before claiming the win.");

    const sb = await getClient();
    const score = Math.max(1, 100 - myHand.length + ((activeState.board || []).length * 5));
    const { error: scoreError } = await sb.from("game_scores").insert({ user_id: currentUser.userId, game_key: "01_dominos", score, points_delta: WIN_POINTS, metadata: { room_code: activeRoom.room_code, source: "01_domino_room" } });
    if (scoreError) return setStatus(`Score save failed: ${scoreError.message}`);

    if (window.HWAuth && typeof window.HWAuth.addPoints === "function") {
      try { await window.HWAuth.addPoints(WIN_POINTS, "01_dominos_win"); } catch (error) {}
    }

    const nextState = {
      ...activeState,
      status: "finished",
      winnerUserId: currentUser.userId,
      log: [...(activeState.log || []), `${currentUser.displayName || "Player"}: claimed the win. +${WIN_POINTS} Cool Points.`].slice(-16),
      updatedAt: new Date().toISOString(),
      version: (activeState.version || 1) + 1
    };

    await saveState(nextState);
    setStatus("Win submitted. Leaderboard will update on refresh.");
  }

  function leaveView() {
    activeRoom = null;
    activeState = null;
    if (refreshTimer) clearInterval(refreshTimer);
    setText("activeRoomCode", "None");
    setText("activeTurn", "Waiting");
    if ($("boardTiles")) $("boardTiles").innerHTML = `<span class="hw-leaderboard-empty">Join or create a room to start.</span>`;
    if ($("playerHand")) $("playerHand").innerHTML = "";
    if ($("dominoLog")) $("dominoLog").innerHTML = `<p>Duck Sauce: “Somebody slap a bone on the table.”</p>`;
    setStatus("Left table view. Open tables are still listed.");
  }

  async function boot() {
    const year = $("year");
    if (year) year.textContent = new Date().getFullYear();

    try {
      await requireUser();
      setStatus("Logged in. Create or join a table.");
    } catch (error) {
      setStatus("Login required to create, join, and submit scores.");
    }

    const createForm = $("createRoomForm");
    const joinForm = $("joinRoomForm");
    const refresh = $("refreshRooms");
    const draw = $("drawTileBtn");
    const submit = $("submitWinBtn");
    const leave = $("leaveRoomBtn");

    if (createForm) createForm.addEventListener("submit", createRoom);
    if (joinForm) joinForm.addEventListener("submit", joinRoomByCode);
    if (refresh) refresh.addEventListener("click", listRooms);
    if (draw) draw.addEventListener("click", handleDraw);
    if (submit) submit.addEventListener("click", submitWin);
    if (leave) leave.addEventListener("click", leaveView);

    await listRooms();
    setInterval(listRooms, 30000);
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
