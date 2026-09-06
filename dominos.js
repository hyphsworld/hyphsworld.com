(function () {
  "use strict";

  const CONFIG_FILE = "supabase-config.js";
  const CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  const REFRESH_MS = 6500;
  const WIN_POINTS = 100;
  const TUTORIAL_KEY = "hyphsworld_domino_tutorial_seen_v1";

  let sbPromise = null;
  let currentUser = null;
  let activeRoom = null;
  let activeState = null;
  let activeVersion = null;
  let refreshTimer = null;
  let opponentProfile = null;
  let opponentProfileId = null;
  let opponentProfileRequest = 0;

  function $(id) { return document.getElementById(id); }
  function setText(id, value) { const el = $(id); if (el) el.textContent = value; }
  function safeText(value, fallback) { return String(value || fallback || "").replace(/[<>]/g, "").trim(); }
  function roomCode() { return Math.random().toString(36).replace(/[^a-z0-9]/gi, "").slice(2, 8).toUpperCase(); }
  function readableError(error) { return error && error.message ? error.message : String(error || "Unknown error"); }
  function dominoAvatar(type, fallback) {
    if (String(type || "").toLowerCase() === "girl") return "👩🏾";
    return safeText(fallback, "🧢");
  }

  async function loadOpponentProfile(userId) {
    if (!userId || userId === opponentProfileId) return;
    const request = ++opponentProfileRequest;
    opponentProfileId = userId;
    opponentProfile = null;
    try {
      const sb = await getClient();
      const { data, error } = await sb.from("profiles")
        .select("id,display_name,avatar_type,avatar_icon")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      if (request !== opponentProfileRequest || opponentProfileId !== userId) return;
      opponentProfile = data || null;
      renderOpponentSeat(userId);
    } catch (error) {
      if (request === opponentProfileRequest) renderOpponentSeat(userId);
    }
  }

  function renderOpponentSeat(opponentId) {
    const name = opponentProfile && opponentProfile.id === opponentId
      ? safeText(opponentProfile.display_name, "PLAYER TWO")
      : "PLAYER TWO";
    setText("povHudName", opponentId ? name : "OPEN SEAT");
    setText("povHudAvatar", opponentId
      ? dominoAvatar(opponentProfile?.avatar_type, opponentProfile?.avatar_icon)
      : "＋");
    const hud = document.querySelector(".pov-player-hud");
    if (hud) hud.classList.toggle("is-female", Boolean(opponentId && opponentProfile?.avatar_type === "girl"));
    const room = document.querySelector(".domino-pov-room");
    if (room) room.classList.toggle("has-female-opponent", Boolean(opponentId && opponentProfile?.avatar_type === "girl"));
  }

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
      if (window.HWAuth && typeof window.HWAuth.getClient === "function") {
        const shared = await window.HWAuth.getClient();
        if (shared) return shared;
      }
      if (!window.HW_SUPABASE_CONFIG) await loadScript(CONFIG_FILE);
      const config = window.HW_SUPABASE_CONFIG || {};
      if (!configReady(config)) throw new Error("Supabase config missing.");
      if (!window.supabase || !window.supabase.createClient) await loadScript(CDN);
      if (!window.supabase || !window.supabase.createClient) throw new Error("Supabase client unavailable.");
      return window.supabase.createClient(config.url, config.anonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });
    })();
    return sbPromise;
  }

  function tileScore(tile) { return Number(tile?.[0] || 0) + Number(tile?.[1] || 0); }
  function handScore(hand) { return (hand || []).reduce((total, tile) => total + tileScore(tile), 0); }
  function sameTile(a, b) { return Boolean(a && b && a[0] === b[0] && a[1] === b[1]); }

  function tileText(tile) {
    return Array.isArray(tile) ? `${tile[0]}|${tile[1]}` : "?|?";
  }

  function pipFace(value) {
    const patterns = {
      0: [], 1: [5], 2: [1, 9], 3: [1, 5, 9],
      4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9]
    };
    const dots = patterns[Number(value)] || [];
    return `<span class="pip-face" aria-hidden="true">${dots.map((position) => {
      const row = Math.ceil(position / 3);
      const column = ((position - 1) % 3) + 1;
      return `<i style="grid-area:${row}/${column}"></i>`;
    }).join("")}</span>`;
  }

  function tileMarkup(tile, options) {
    const clickable = Boolean(options && options.clickable);
    const index = options && Number.isInteger(options.index) ? options.index : -1;
    const playable = Boolean(options && options.playable);
    const tag = clickable ? "button" : "span";
    const attrs = clickable
      ? ` type="button" data-tile-index="${index}" ${playable ? "" : "disabled aria-disabled=\"true\""}`
      : ` role="img"`;
    const extraClass = options && options.className ? ` ${options.className}` : "";
    const style = options && options.style ? ` style="${options.style}"` : "";
    const classes = `domino-tile${tile[0] === tile[1] ? " is-double" : ""}${clickable ? " tile-button" : ""}${playable ? " is-playable" : " is-blocked"}${extraClass}`;
    return `<${tag} class="${classes}"${attrs}${style} aria-label="Domino ${tileText(tile)}">${pipFace(tile[0])}${pipFace(tile[1])}</${tag}>`;
  }

  function boardChainMarkup(tiles) {
    const run = 6, stepX = 68, stepY = 66;
    const rows = Math.floor((tiles.length - 1) / (run + 1)) + 1;
    const width = run * stepX + 74;
    const height = Math.max(116, rows * stepY + 54);
    const bones = tiles.map((tile, index) => {
      const row = Math.floor(index / (run + 1));
      const position = index % (run + 1);
      const movingRight = row % 2 === 0;
      const isTurn = position === run;
      const x = isTurn ? (movingRight ? (run - 1) * stepX : 0) : (movingRight ? position * stepX : (run - 1 - position) * stepX);
      const y = row * stepY + (isTurn ? Math.round(stepY / 2) : 0);
      const directionClass = !movingRight && !isTurn ? " chain-reverse" : "";
      const endClass = index === 0 ? " chain-left-end" : index === tiles.length - 1 ? " chain-right-end" : "";
      return tileMarkup(tile, { className: `chain-bone${isTurn ? " chain-turn" : ""}${directionClass}${endClass}`, style: `--chain-x:${x}px;--chain-y:${y}px;--chain-r:${isTurn ? 90 : 0}deg` });
    }).join("");
    return `<div class="domino-chain-stage" style="--chain-width:${width}px;--chain-height:${height}px" role="group" aria-label="Connected domino chain">${bones}</div>`;
  }

  function canPlay(tile, board) {
    if (!board || !board.length) return true;
    const left = board[0][0];
    const right = board[board.length - 1][1];
    return tile.includes(left) || tile.includes(right);
  }

  function setStatus(message) { setText("dominosStatus", message); }

  function tutorialSeen() {
    try { return window.localStorage.getItem(TUTORIAL_KEY) === "1"; } catch (error) { return false; }
  }

  function openTutorial() {
    const tutorial = $("dominoTutorial");
    if (!tutorial) return;
    tutorial.hidden = false;
    document.body.classList.add("domino-tutorial-open");
    const close = $("closeDominoTutorial");
    if (close) close.focus();
  }

  function closeTutorial() {
    const tutorial = $("dominoTutorial");
    if (!tutorial) return;
    tutorial.hidden = true;
    document.body.classList.remove("domino-tutorial-open");
    try { window.localStorage.setItem(TUTORIAL_KEY, "1"); } catch (error) {}
    const open = $("openDominoTutorial");
    if (open) open.focus();
  }

  function setCoach(message) { setText("povCoach", message); }

  function setGuestControls(enabled) {
    document.querySelectorAll("#createRoomForm input, #createRoomForm button, #joinRoomForm input, #joinRoomForm button").forEach((control) => {
      control.disabled = !enabled;
    });
    if (!activeRoom) {
      ["drawTileBtn", "passTurnBtn", "submitWinBtn", "leaveRoomBtn"].forEach((id) => {
        const control = $(id);
        if (control) control.disabled = true;
      });
    }
  }

  function initTableRadio() {
    const audio = $("dominoRadioAudio");
    const track = $("dominoRadioTrack");
    const nowPlaying = $("dominoRadioNowPlaying");
    if (!audio || !track) return;
    track.addEventListener("change", () => {
      const selected = track.options[track.selectedIndex];
      audio.pause();
      audio.src = selected.value;
      audio.load();
      if (nowPlaying) nowPlaying.textContent = selected.dataset.title || selected.textContent;
    });
    audio.addEventListener("error", () => {
      if (nowPlaying) nowPlaying.textContent = "TRACK UNAVAILABLE — CHOOSE ANOTHER SONG";
    });
  }

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
    const list = $("roomList");
    if (!list) return;
    if (!currentUser) {
      list.innerHTML = `<div class="hw-leaderboard-empty">Login to view and join live tables.</div>`;
      return;
    }
    const sb = await getClient();
    const { data, error } = await sb.rpc("list_domino_rooms");

    if (error) {
      list.innerHTML = `<div class="hw-leaderboard-empty">Could not load tables: ${safeText(error.message, "Supabase error")}</div>`;
      return;
    }

    const rooms = data && Array.isArray(data.rooms) ? data.rooms : [];
    if (!rooms.length) {
      list.innerHTML = `<div class="hw-leaderboard-empty">No open tables yet. Create one.</div>`;
      return;
    }

    list.innerHTML = rooms.map((room) => `
      <article class="room-row">
        <div><strong>${safeText(room.room_code, "ROOM")}</strong><span>${safeText(room.status, "waiting")} • ${Number(room.player_count || 0)}/2 players</span></div>
        <button class="games-btn" type="button" data-join-code="${safeText(room.room_code, "")}">${Number(room.player_count || 0) >= 2 ? "Rejoin" : "Join"}</button>
      </article>
    `).join("");

    list.querySelectorAll("[data-join-code]").forEach((button) => {
      button.addEventListener("click", () => joinRoomByCodeValue(button.getAttribute("data-join-code")));
    });
  }

  async function createRoom(event) {
    event.preventDefault();
    try {
      await requireUser();
      const sb = await getClient();
      const input = $("roomName");
      const code = safeText(input && input.value ? input.value : roomCode(), "01TABLE").replace(/\s+/g, "").slice(0, 10).toUpperCase() || roomCode();
      setStatus("Creating table through Supabase...");
      const { data, error } = await sb.rpc("create_domino_room", { requested_code: code });
      if (error || !data || data.ok === false) throw error || new Error(safeText(data && data.error, "Room create failed."));
      activeRoom = data.room;
      activeState = data.state;
      activeVersion = Number(data.state?.version || 1);
      if (input) input.value = "";
      setStatus(`Table created: ${activeRoom.room_code}. Share the room code or wait for player two.`);
      renderState();
      startRefresh();
      await listRooms();
    } catch (error) {
      setStatus(`Table did not create: ${readableError(error)}`);
    }
  }

  async function joinRoomByCode(event) {
    event.preventDefault();
    const input = $("roomCodeInput");
    const code = safeText(input && input.value, "").replace(/\s+/g, "").toUpperCase();
    if (!code) return setStatus("Enter a room code first.");
    await joinRoomByCodeValue(code);
    if (input) input.value = "";
  }

  async function joinRoomByCodeValue(code) {
    try {
      await requireUser();
      const sb = await getClient();
      setStatus("Joining table...");
      const { data, error } = await sb.rpc("join_domino_room", { p_room_code: code });
      if (error || !data || data.ok === false) throw error || new Error("Join failed.");
      activeRoom = data.room;
      activeState = data.state;
      activeVersion = Number(data.version || data.state?.version || 1);
      setStatus("Joined table. Play when it is your turn.");
      renderState();
      startRefresh();
      await listRooms();
    } catch (error) {
      setStatus(`Join failed: ${readableError(error).replaceAll("_", " ")}`);
    }
  }

  async function performAction(action, tileIndex) {
    if (!activeRoom || !currentUser || !Number.isInteger(activeVersion)) return setStatus("Join a table first.");
    const sb = await getClient();
    const params = { p_room_id: activeRoom.id, p_action: action, p_expected_version: activeVersion };
    if (Number.isInteger(tileIndex)) params.p_tile_index = tileIndex;
    const { data, error } = await sb.rpc("domino_action", params);
    if (error || !data || data.ok === false) {
      setStatus(`Move rejected: ${readableError(error || data?.error).replaceAll("_", " ")}`);
      await refreshActiveRoom();
      return;
    }
    activeRoom = data.room || activeRoom;
    activeState = data.state;
    activeVersion = Number(data.version);
    setStatus(data.message || "Table updated.");
    renderState();
  }

  async function refreshActiveRoom() {
    if (!activeRoom) return;
    const sb = await getClient();
    const { data, error } = await sb.rpc("get_domino_state", { p_room_id: activeRoom.id });
    if (!error && data && data.state) {
      activeRoom = data.room || activeRoom;
      activeState = data.state;
      activeVersion = Number(data.version || data.state.version);
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
    const isMyTurn = activeState.turnUserId === currentUser.userId;
    setText("activeTurn", isMyTurn ? "Your Turn" : "Opponent");
    setText("povTurnBanner", isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN");

    const opponentId = Object.keys(activeState.hands || {}).find((id) => id !== currentUser.userId);
    const opponentTiles = opponentId ? (activeState.hands[opponentId] || []).length : 0;
    if (opponentId && opponentId !== opponentProfileId) loadOpponentProfile(opponentId);
    if (!opponentId) {
      opponentProfileId = null;
      opponentProfile = null;
    }
    renderOpponentSeat(opponentId);
    setText("povHudTiles", opponentId ? `${opponentTiles} bones` : "Waiting for player");
    setText("povHudTurn", opponentId && activeState.turnUserId === opponentId ? "PLAYING" : "WAITING");
    setText("boneyardCount", `Boneyard: ${(activeState.deck || []).length}`);
    setText("playerPipCount", `Your pips: ${handScore((activeState.hands || {})[currentUser.userId])}`);
    setText("povSelfAvatar", dominoAvatar(currentUser.avatarType, currentUser.avatarIcon));
    setText("povSelfName", safeText(currentUser.displayName, "YOUR SEAT"));
    document.body.classList.add("domino-game-active");

    const boardTiles = activeState.board || [];
    board.innerHTML = boardTiles.length
      ? boardChainMarkup(boardTiles)
      : `<span class="hw-leaderboard-empty">High double opens. No double? Highest pip bone starts.</span>`;

    const myHand = (activeState.hands || {})[currentUser.userId] || [];
    hand.innerHTML = myHand.length
      ? myHand.map((tile, index) => tileMarkup(tile, { clickable: true, index, playable: isMyTurn && canPlay(tile, boardTiles) && (boardTiles.length || !activeState.openingTile || sameTile(tile, activeState.openingTile)) })).join("")
      : `<span class="hw-leaderboard-empty">No tiles in your hand. Submit win if the table is finished.</span>`;

    hand.querySelectorAll("[data-tile-index]").forEach((button) => {
      button.addEventListener("click", async () => {
        await performAction("play", Number(button.getAttribute("data-tile-index")));
      });
    });

    const drawButton = $("drawTileBtn");
    const passButton = $("passTurnBtn");
    const playable = myHand.some((tile) => canPlay(tile, boardTiles) && (boardTiles.length || !activeState.openingTile || sameTile(tile, activeState.openingTile)));
    if (drawButton) drawButton.disabled = !isMyTurn || playable || !(activeState.deck || []).length || activeState.status !== "playing";
    if (passButton) passButton.disabled = !isMyTurn || playable || Boolean((activeState.deck || []).length) || activeState.status !== "playing";
    const submitButton = $("submitWinBtn");
    if (submitButton) submitButton.disabled = activeState.status !== "finished" || activeState.winnerUserId !== currentUser.userId;

    if (activeState.status === "waiting") {
      setCoach(`Share room code ${activeRoom.room_code || "above"} with player two.`);
    } else if (activeState.status === "finished") {
      setCoach(activeState.winnerUserId === currentUser.userId ? "You won! Tap Submit Win to collect your Cool Points." : "Game over. Start or join another table for a rematch.");
    } else if (!isMyTurn) {
      setCoach("Opponent’s turn. Your bones will unlock when it’s time to play.");
    } else if (playable) {
      setCoach(boardTiles.length ? "Your turn: tap any glowing bone that matches either end of the chain." : "Your turn: tap the glowing opening bone to start the chain.");
    } else if ((activeState.deck || []).length) {
      setCoach("No matching bone. Tap Draw Bone below.");
    } else {
      setCoach("No matching bone and the boneyard is empty. Tap Pass.");
    }
    const leaveButton = $("leaveRoomBtn");
    if (leaveButton) leaveButton.disabled = false;

    log.innerHTML = (activeState.log || []).slice().reverse().map((line) => `<p>${safeText(line, "Table updated.")}</p>`).join("") || `<p>Duck Sauce: “Quiet table. Suspicious.”</p>`;
  }

  async function handleDraw() {
    if (!activeState || !currentUser) return setStatus("Join a table first.");
    await performAction("draw");
  }

  async function handlePass() {
    if (!activeState || !currentUser) return setStatus("Join a table first.");
    await performAction("pass");
  }

  async function submitWin() {
    if (!activeRoom || !activeState || !currentUser) return setStatus("Join a table first.");
    const sb = await getClient();
    const { data, error } = await sb.rpc("claim_domino_win", { p_room_id: activeRoom.id });
    if (error || !data || data.ok === false) return setStatus(`Win rejected: ${readableError(error || data?.error).replaceAll("_", " ")}`);
    setStatus(data.already_claimed ? "This win was already credited." : `Verified win submitted. +${WIN_POINTS} Cool Points.`);
    try { window.dispatchEvent(new CustomEvent("hw:points-change", { detail: { source: "01_dominos_win" } })); } catch (error) {}
  }

  function leaveView() {
    activeRoom = null;
    activeState = null;
    activeVersion = null;
    opponentProfileRequest += 1;
    opponentProfileId = null;
    opponentProfile = null;
    document.body.classList.remove("domino-game-active");
    if (refreshTimer) clearInterval(refreshTimer);
    setText("activeRoomCode", "None");
    setText("activeTurn", "Waiting");
    setText("povTurnBanner", "WAITING FOR TABLE");
    setCoach("Start a table or enter a room code. We’ll guide every move.");
    setText("povHudName", "OPEN SEAT");
    setText("povHudTiles", "Waiting for player");
    setText("povHudTurn", "WAITING");
    setText("povHudAvatar", "＋");
    const room = document.querySelector(".domino-pov-room");
    if (room) room.classList.remove("has-female-opponent");
    setText("povSelfAvatar", dominoAvatar(currentUser?.avatarType, currentUser?.avatarIcon));
    setText("povSelfName", currentUser ? safeText(currentUser.displayName, "YOUR SEAT") : "YOUR SEAT");
    setText("boneyardCount", "Boneyard: —");
    setText("playerPipCount", "Your pips: —");
    if ($("boardTiles")) $("boardTiles").innerHTML = `<span class="hw-leaderboard-empty">Join or create a room to start.</span>`;
    if ($("playerHand")) $("playerHand").innerHTML = "";
    if ($("dominoLog")) $("dominoLog").innerHTML = `<p>Duck Sauce: “Somebody slap a bone on the table.”</p>`;
    setStatus("Left table view. Open tables are still listed.");
    setGuestControls(Boolean(currentUser));
  }

  async function boot() {
    const year = $("year");
    if (year) year.textContent = new Date().getFullYear();

    try {
      await requireUser();
      setStatus("Logged in. Create or join a table.");
      setGuestControls(true);
    } catch (error) {
      setStatus("Login required to create, join, and submit scores.");
      currentUser = null;
      setGuestControls(false);
    }

    const createForm = $("createRoomForm");
    const joinForm = $("joinRoomForm");
    const refresh = $("refreshRooms");
    const draw = $("drawTileBtn");
    const pass = $("passTurnBtn");
    const submit = $("submitWinBtn");
    const leave = $("leaveRoomBtn");
    const openTutorialButton = $("openDominoTutorial");
    const closeTutorialButton = $("closeDominoTutorial");
    const finishTutorialButton = $("finishDominoTutorial");
    const tutorial = $("dominoTutorial");

    if (createForm) createForm.addEventListener("submit", createRoom);
    if (joinForm) joinForm.addEventListener("submit", joinRoomByCode);
    if (refresh) refresh.addEventListener("click", listRooms);
    if (draw) draw.addEventListener("click", handleDraw);
    if (pass) pass.addEventListener("click", handlePass);
    if (submit) submit.addEventListener("click", submitWin);
    if (leave) leave.addEventListener("click", leaveView);
    if (openTutorialButton) openTutorialButton.addEventListener("click", openTutorial);
    if (closeTutorialButton) closeTutorialButton.addEventListener("click", closeTutorial);
    if (finishTutorialButton) finishTutorialButton.addEventListener("click", closeTutorial);
    if (tutorial) tutorial.addEventListener("click", (event) => { if (event.target === tutorial) closeTutorial(); });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && tutorial && !tutorial.hidden) closeTutorial(); });
    initTableRadio();

    if (!tutorialSeen()) window.setTimeout(openTutorial, 450);

    document.addEventListener("hyph:auth-state-changed", async (event) => {
      if (event?.detail?.event === "SIGNED_OUT") {
        currentUser = null;
        leaveView();
        setGuestControls(false);
        setStatus("Login required to create, join, and submit scores.");
        await listRooms();
        return;
      }
      try {
        await requireUser();
        setGuestControls(true);
        await listRooms();
      } catch (error) {}
    });

    await listRooms();
    setInterval(listRooms, 30000);
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
