/*
  HYPHSWORLD Casino — Hosted Game Tables + CPU Mode
  --------------------------------------------------
  Users do NOT set up their own database tables.

  Features:
  - Create hosted casino/table rooms using HYPHSWORLD Supabase.
  - Join rooms with a code.
  - Auto-save last room so users do not need to remember the code.
  - Resume last table.
  - Play CPU Blackjack immediately, no second human required.

  Security:
  - Frontend uses publishable Supabase key only.
  - Never put service-role keys in frontend files.
  - Game writes go through hardened Supabase RPC functions.
*/

(() => {
  "use strict";

  const SUPABASE_URL = "https://yuhxtdkhsltaqiagrtys.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_oYdN-75W3b7k3m1zLukI-A_BKWVDD5e";
  const STORAGE_KEY = "hyphsworld:lastCasinoTable:v1";

  const STATE = {
    supabase: null,
    user: null,
    room: null,
    gameState: null,
    busy: false,
    channel: null,
  };

  const GAME_LABELS = {
    blackjack: "Blackjack",
    dice: "Dice",
    poker: "Poker",
    dominos: "Dominos",
  };

  const $ = (selector, root = document) => root.querySelector(selector);

  function ensureSupabaseClient() {
    if (STATE.supabase) return STATE.supabase;

    const lib = window.supabase;
    if (!lib || typeof lib.createClient !== "function") {
      throw new Error("Supabase library is not loaded. Add @supabase/supabase-js before casino.js.");
    }

    STATE.supabase = lib.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: { eventsPerSecond: 5 },
      },
    });

    return STATE.supabase;
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key === "html") node.innerHTML = value;
      else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
      else if (value !== null && value !== undefined) node.setAttribute(key, value);
    });
    children.forEach((child) => node.append(child));
    return node;
  }

  function toast(message, type = "info") {
    let box = $("#hwCasinoToast");
    if (!box) {
      box = el("div", { id: "hwCasinoToast", class: "hw-casino-toast" });
      document.body.append(box);
    }
    box.textContent = message;
    box.dataset.type = type;
    box.classList.add("is-visible");
    window.clearTimeout(box._timer);
    box._timer = window.setTimeout(() => box.classList.remove("is-visible"), 3800);
  }

  function normalizeError(error) {
    const msg = error?.message || String(error || "Unknown error");
    const map = {
      not_authenticated: "Log in first, P. Casino tables need a HYPHSWORLD account.",
      LOGIN_REQUIRED: "Log in first, P. Casino tables need a HYPHSWORLD account.",
      ROOM_CREATION_RATE_LIMITED: "Slow down P — too many tables opened too fast.",
      room_creation_rate_limited: "Slow down P — too many tables opened too fast.",
      room_not_found: "That room code is not active.",
      room_full: "That table is full.",
      game_state_rate_limited: "Game is updating too fast. Try again in a second.",
      invalid_game_state_size: "That game state is too large.",
      not_room_player: "You have to join the table before changing the game.",
      unsupported_game_type: "That game type is not supported yet.",
      UNSUPPORTED_GAME_TYPE: "That game type is not supported yet.",
    };
    return map[msg] || msg;
  }

  async function getUser() {
    const supabase = ensureSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.warn("HYPHSWORLD auth user check failed:", error.message);
      STATE.user = null;
      return null;
    }
    STATE.user = data?.user || null;
    return STATE.user;
  }

  function injectStyles() {
    if ($("#hwCasinoBridgeStyles")) return;
    const css = `
      .hw-table-dock{
        position:relative; z-index:5; margin:22px auto; max-width:1100px;
        border:2px solid rgba(57,255,20,.7); border-radius:28px; padding:18px;
        background:
          radial-gradient(circle at 10% 0%, rgba(255,0,128,.2), transparent 26%),
          radial-gradient(circle at 90% 15%, rgba(0,245,255,.18), transparent 30%),
          linear-gradient(135deg, rgba(2,8,6,.96), rgba(8,16,10,.92));
        box-shadow:0 0 28px rgba(57,255,20,.24), inset 0 0 22px rgba(255,255,255,.05);
        color:#f5fff7; font-family:inherit;
      }
      .hw-table-dock *{box-sizing:border-box}
      .hw-dock-head{display:flex; flex-wrap:wrap; gap:14px; align-items:flex-start; justify-content:space-between; margin-bottom:16px}
      .hw-dock-kicker{font-weight:900; letter-spacing:.16em; color:#39ff14; text-transform:uppercase; font-size:.78rem}
      .hw-dock-title{margin:3px 0 2px; font-size:clamp(1.45rem,3vw,2.35rem); line-height:1; text-transform:uppercase}
      .hw-dock-copy{margin:0; color:rgba(245,255,247,.78); max-width:760px}
      .hw-user-pill{border:1px solid rgba(255,255,255,.18); background:rgba(0,0,0,.35); border-radius:999px; padding:10px 13px; font-weight:800; white-space:nowrap}
      .hw-table-grid{display:grid; grid-template-columns:repeat(12,1fr); gap:12px; align-items:end}
      .hw-field{grid-column:span 3; min-width:0}
      .hw-field.hw-wide{grid-column:span 4}
      .hw-field label{display:block; margin:0 0 7px; font-size:.78rem; color:#baffb5; font-weight:900; text-transform:uppercase; letter-spacing:.08em}
      .hw-field input,.hw-field select{
        width:100%; border:1px solid rgba(255,255,255,.2); background:#061108; color:white;
        border-radius:16px; min-height:46px; padding:0 13px; font-weight:800; outline:none;
      }
      .hw-field input:focus,.hw-field select:focus{border-color:#39ff14; box-shadow:0 0 0 3px rgba(57,255,20,.16)}
      .hw-actions{grid-column:span 5; display:flex; gap:10px; flex-wrap:wrap}
      .hw-casino-btn{
        border:0; cursor:pointer; border-radius:999px; min-height:46px; padding:0 17px;
        font-weight:1000; text-transform:uppercase; letter-spacing:.04em; color:#041006;
        background:linear-gradient(135deg,#39ff14,#ffef00,#00f5ff); box-shadow:0 10px 22px rgba(0,0,0,.35);
      }
      .hw-casino-btn.secondary{background:linear-gradient(135deg,#ff2bd6,#39ff14); color:white}
      .hw-casino-btn.dark{background:#101810; color:#eaffea; border:1px solid rgba(255,255,255,.15)}
      .hw-casino-btn.cpu{background:linear-gradient(135deg,#ff2bd6,#ffef00,#39ff14); color:#050705}
      .hw-casino-btn:disabled{opacity:.55; cursor:not-allowed; filter:grayscale(.7)}
      .hw-room-card{margin-top:15px; display:none; border:1px solid rgba(255,255,255,.15); border-radius:22px; padding:14px; background:rgba(0,0,0,.32)}
      .hw-room-card.is-live{display:block}
      .hw-room-row{display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between}
      .hw-room-code{font-size:clamp(1.4rem,4vw,2.6rem); font-weight:1000; letter-spacing:.12em; color:#ffef00; text-shadow:0 0 16px rgba(255,239,0,.4)}
      .hw-room-meta{display:flex; gap:8px; flex-wrap:wrap; margin-top:8px}
      .hw-chip{border:1px solid rgba(255,255,255,.16); background:rgba(255,255,255,.06); border-radius:999px; padding:8px 10px; font-weight:900; font-size:.82rem}
      .hw-state-box{margin-top:12px; border-radius:16px; padding:12px; background:#030704; border:1px solid rgba(57,255,20,.18); max-height:220px; overflow:auto; font-size:.82rem; white-space:pre-wrap; color:#cffff0}
      .hw-cpu-panel{margin-top:14px; display:none; border:1px solid rgba(255,239,0,.28); border-radius:20px; padding:14px; background:linear-gradient(135deg,rgba(255,239,0,.09),rgba(255,43,214,.08))}
      .hw-cpu-panel.is-live{display:block}
      .hw-cpu-title{margin:0 0 10px; font-size:1.1rem; text-transform:uppercase; letter-spacing:.08em}
      .hw-cpu-grid{display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px}
      .hw-hand{border:1px solid rgba(255,255,255,.14); background:rgba(0,0,0,.28); border-radius:16px; padding:12px}
      .hw-hand strong{display:block; color:#39ff14; text-transform:uppercase; letter-spacing:.08em; margin-bottom:6px}
      .hw-cards{font-size:1.05rem; font-weight:900; color:#fff}
      .hw-cpu-actions{display:flex; flex-wrap:wrap; gap:10px}
      .hw-result-line{margin-top:10px; font-weight:1000; color:#ffef00; text-transform:uppercase}
      .hw-casino-toast{position:fixed; left:50%; bottom:22px; transform:translateX(-50%) translateY(20px); opacity:0; pointer-events:none; z-index:9999; max-width:min(92vw,620px); padding:13px 16px; border-radius:999px; background:#061108; color:white; border:1px solid rgba(57,255,20,.5); box-shadow:0 16px 40px rgba(0,0,0,.45); font-weight:900; transition:.22s ease}
      .hw-casino-toast.is-visible{opacity:1; transform:translateX(-50%) translateY(0)}
      .hw-casino-toast[data-type="error"]{border-color:#ff2b2b}
      .hw-casino-toast[data-type="success"]{border-color:#39ff14}
      @media(max-width:820px){.hw-field,.hw-field.hw-wide,.hw-actions{grid-column:1/-1}.hw-actions .hw-casino-btn{flex:1 1 160px}.hw-user-pill{white-space:normal}.hw-cpu-grid{grid-template-columns:1fr}}
    `;
    document.head.append(el("style", { id: "hwCasinoBridgeStyles", text: css }));
  }

  function getMountPoint() {
    return $("#hyphsworldCasinoTables") || $("#casinoTables") || $("main") || $(".casino") || document.body;
  }

  function renderDock() {
    injectStyles();
    if ($("#hyphsworldCasinoTables")) return;

    const dock = el("section", { id: "hyphsworldCasinoTables", class: "hw-table-dock", "aria-label": "HYPHSWORLD hosted game tables" });
    dock.innerHTML = `
      <div class="hw-dock-head">
        <div>
          <div class="hw-dock-kicker">Hosted by HYPHSWORLD</div>
          <h2 class="hw-dock-title">Casino Game Tables</h2>
          <p class="hw-dock-copy">No setup for users. The site remembers the last table, and CPU Blackjack is live so nobody gets stuck waiting.</p>
        </div>
        <div id="hwUserPill" class="hw-user-pill">Checking login…</div>
      </div>

      <div class="hw-table-grid">
        <div class="hw-field">
          <label for="hwGameType">Game</label>
          <select id="hwGameType">
            <option value="blackjack">Blackjack</option>
            <option value="dice">Dice</option>
            <option value="poker">Poker</option>
            <option value="dominos">Dominos</option>
          </select>
        </div>

        <div class="hw-field hw-wide">
          <label for="hwCustomCode">Custom room code optional</label>
          <input id="hwCustomCode" maxlength="10" autocomplete="off" placeholder="Leave blank for auto code" />
        </div>

        <div class="hw-field hw-wide">
          <label for="hwJoinCode">Join room code</label>
          <input id="hwJoinCode" maxlength="10" autocomplete="off" placeholder="Saved table appears here" />
        </div>

        <div class="hw-actions">
          <button id="hwCreateTable" class="hw-casino-btn" type="button">Create Table</button>
          <button id="hwJoinTable" class="hw-casino-btn secondary" type="button">Join Table</button>
          <button id="hwResumeTable" class="hw-casino-btn dark" type="button">Resume Last</button>
          <button id="hwPlayCpu" class="hw-casino-btn cpu" type="button">Play CPU</button>
          <button id="hwRefreshRoom" class="hw-casino-btn dark" type="button">Refresh</button>
        </div>
      </div>

      <div id="hwRoomCard" class="hw-room-card">
        <div class="hw-room-row">
          <div>
            <div class="hw-dock-kicker">Room Code</div>
            <div id="hwRoomCode" class="hw-room-code">—</div>
          </div>
          <button id="hwCopyRoom" class="hw-casino-btn dark" type="button">Copy Code</button>
        </div>
        <div class="hw-room-meta">
          <span id="hwRoomGame" class="hw-chip">Game: —</span>
          <span id="hwRoomStatus" class="hw-chip">Status: —</span>
          <span id="hwRoomPlayers" class="hw-chip">Players: —</span>
          <span id="hwRoomUpdated" class="hw-chip">Updated: —</span>
        </div>

        <div id="hwCpuPanel" class="hw-cpu-panel">
          <h3 class="hw-cpu-title">CPU Blackjack</h3>
          <div class="hw-cpu-grid">
            <div class="hw-hand">
              <strong>You</strong>
              <div id="hwPlayerHand" class="hw-cards">—</div>
              <div id="hwPlayerTotal" class="hw-chip">Total: —</div>
            </div>
            <div class="hw-hand">
              <strong>CPU / Duck Dealer</strong>
              <div id="hwDealerHand" class="hw-cards">—</div>
              <div id="hwDealerTotal" class="hw-chip">Total: —</div>
            </div>
          </div>
          <div class="hw-cpu-actions">
            <button id="hwCpuDeal" class="hw-casino-btn" type="button">Deal</button>
            <button id="hwCpuHit" class="hw-casino-btn secondary" type="button">Hit</button>
            <button id="hwCpuStand" class="hw-casino-btn dark" type="button">Stand</button>
          </div>
          <div id="hwCpuResult" class="hw-result-line">Start a CPU game.</div>
        </div>

        <pre id="hwStateBox" class="hw-state-box">Waiting for table state…</pre>
      </div>
    `;

    const mount = getMountPoint();
    if (mount === document.body) document.body.prepend(dock);
    else mount.prepend(dock);

    bindDock();
    hydrateSavedRoomCode();
  }

  function setBusy(isBusy) {
    STATE.busy = Boolean(isBusy);
    ["#hwCreateTable", "#hwJoinTable", "#hwResumeTable", "#hwPlayCpu", "#hwRefreshRoom", "#hwCpuDeal", "#hwCpuHit", "#hwCpuStand"].forEach((id) => {
      const node = $(id);
      if (node) node.disabled = STATE.busy;
    });
  }

  function cleanCode(value) {
    return String(value || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase();
  }

  function getSavedRoom() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      return null;
    }
  }

  function saveRoom(room, extra = {}) {
    if (!room?.room_code) return;
    const payload = {
      id: room.id,
      room_code: room.room_code,
      game_type: room.game_type,
      status: room.status,
      saved_at: new Date().toISOString(),
      ...extra,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    hydrateSavedRoomCode();
  }

  function hydrateSavedRoomCode() {
    const saved = getSavedRoom();
    const input = $("#hwJoinCode");
    const resume = $("#hwResumeTable");
    if (input && saved?.room_code && !input.value) input.value = saved.room_code;
    if (resume) resume.textContent = saved?.room_code ? `Resume ${saved.room_code}` : "Resume Last";
  }

  async function requireLogin() {
    const user = await getUser();
    if (!user) {
      updateUserPill();
      throw new Error("LOGIN_REQUIRED");
    }
    return user;
  }

  function updateUserPill() {
    const pill = $("#hwUserPill");
    if (!pill) return;
    if (STATE.user) {
      const name = STATE.user.email || STATE.user.id.slice(0, 8);
      pill.textContent = `Logged in: ${name}`;
    } else {
      pill.textContent = "Login required to create/join";
    }
  }

  function getRoomId(room) {
    return room?.id || room?.room?.id || room?.room_id || null;
  }

  function normalizeRoomPayload(payload) {
    if (!payload) return null;
    if (payload.room) return payload.room;
    return payload;
  }

  async function createTable(gameOverride = null, extraState = null) {
    setBusy(true);
    try {
      await requireLogin();
      const supabase = ensureSupabaseClient();
      const gameType = gameOverride || $("#hwGameType")?.value || "blackjack";
      const customCode = cleanCode($("#hwCustomCode")?.value || "");

      const { data, error } = await supabase.rpc("create_table_game_room", {
        requested_code: customCode || null,
        requested_game_type: gameType,
      });

      if (error) throw error;

      const room = normalizeRoomPayload(data);
      STATE.room = room;
      STATE.gameState = data?.state || null;
      saveRoom(room, extraState?.mode ? { mode: extraState.mode } : {});
      renderRoom(room, STATE.gameState);
      await subscribeRoom(getRoomId(room));

      if (extraState) {
        await updateHostedGameState(extraState);
      }

      toast(`Table live: ${room.room_code}`, "success");
      return room;
    } catch (error) {
      toast(normalizeError(error), "error");
      console.error("Create table failed:", error);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function joinTable(roomCodeArg = null) {
    setBusy(true);
    try {
      await requireLogin();
      const supabase = ensureSupabaseClient();
      const roomCode = cleanCode(roomCodeArg || $("#hwJoinCode")?.value || "");
      if (!roomCode) throw new Error("Enter a room code first.");

      const { data, error } = await supabase.rpc("join_game_room", {
        p_room_code: roomCode,
      });

      if (error) throw error;

      STATE.room = normalizeRoomPayload(data);
      saveRoom(STATE.room);
      await loadRoomState(getRoomId(STATE.room));
      await subscribeRoom(getRoomId(STATE.room));
      toast(`Joined table: ${STATE.room.room_code}`, "success");
      return STATE.room;
    } catch (error) {
      toast(normalizeError(error), "error");
      console.error("Join table failed:", error);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function resumeLastTable() {
    const saved = getSavedRoom();
    if (!saved?.room_code) {
      toast("No saved table yet. Create or join a table first.", "error");
      return;
    }
    await joinTable(saved.room_code);
  }

  async function loadRoomState(roomId = getRoomId(STATE.room)) {
    if (!roomId) return;
    const supabase = ensureSupabaseClient();

    const { data, error } = await supabase
      .from("game_state")
      .select("room_id,state,version,updated_by,updated_at")
      .eq("room_id", roomId)
      .single();

    if (error) {
      console.warn("Game state load failed:", error.message);
      renderRoom(STATE.room, STATE.gameState);
      return;
    }

    STATE.gameState = data;
    renderRoom(STATE.room, data);
  }

  async function updateHostedGameState(nextState) {
    if (!STATE.room?.id) throw new Error("No active room.");
    const supabase = ensureSupabaseClient();

    const { data, error } = await supabase.rpc("update_game_state", {
      p_room_id: STATE.room.id,
      p_state: nextState,
    });

    if (error) throw error;
    STATE.gameState = data;
    renderRoom(STATE.room, data);
    return data;
  }

  async function subscribeRoom(roomId) {
    if (!roomId) return;
    const supabase = ensureSupabaseClient();

    if (STATE.channel) {
      await supabase.removeChannel(STATE.channel);
      STATE.channel = null;
    }

    STATE.channel = supabase
      .channel(`hyphsworld-room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_state", filter: `room_id=eq.${roomId}` },
        (payload) => {
          STATE.gameState = payload.new || STATE.gameState;
          renderRoom(STATE.room, STATE.gameState);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_players", filter: `room_id=eq.${roomId}` },
        () => loadRoomState(roomId)
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") toast("Live table connected.", "success");
      });
  }

  function deck() {
    const suits = ["♠", "♥", "♦", "♣"];
    const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const cards = [];
    suits.forEach((suit) => ranks.forEach((rank) => cards.push({ rank, suit })));
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }

  function cardText(card) {
    return card ? `${card.rank}${card.suit}` : "?";
  }

  function handValue(hand = []) {
    let total = 0;
    let aces = 0;
    hand.forEach((card) => {
      if (card.rank === "A") {
        total += 11;
        aces += 1;
      } else if (["K", "Q", "J"].includes(card.rank)) {
        total += 10;
      } else {
        total += Number(card.rank);
      }
    });
    while (total > 21 && aces > 0) {
      total -= 10;
      aces -= 1;
    }
    return total;
  }

  function getCpuState() {
    const raw = STATE.gameState?.state || STATE.gameState || {};
    if (raw?.mode === "cpu_blackjack") return raw;
    return null;
  }

  function newCpuBlackjackState() {
    const d = deck();
    const player = [d.pop(), d.pop()];
    const dealer = [d.pop(), d.pop()];
    return resolveCpuState({
      mode: "cpu_blackjack",
      game: "blackjack",
      status: "playing",
      deck: d,
      player,
      dealer,
      phase: "player_turn",
      result: "Your move. Hit or stand.",
      updatedAt: new Date().toISOString(),
    });
  }

  function resolveCpuState(state) {
    const playerTotal = handValue(state.player);
    const dealerTotal = handValue(state.dealer);

    if (state.phase === "player_turn" && playerTotal > 21) {
      return {
        ...state,
        phase: "finished",
        status: "finished",
        result: "Bust. Duck Dealer wins this one.",
        playerTotal,
        dealerTotal,
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      ...state,
      playerTotal,
      dealerTotal,
      updatedAt: new Date().toISOString(),
    };
  }

  async function playCpuBlackjack() {
    const cpuState = newCpuBlackjackState();
    const room = await createTable("blackjack", cpuState);
    if (room) toast("CPU Blackjack live. No waiting on nobody.", "success");
  }

  async function cpuDeal() {
    try {
      setBusy(true);
      if (!STATE.room?.id) {
        await playCpuBlackjack();
        return;
      }
      await updateHostedGameState(newCpuBlackjackState());
      toast("New CPU hand dealt.", "success");
    } catch (error) {
      toast(normalizeError(error), "error");
    } finally {
      setBusy(false);
    }
  }

  async function cpuHit() {
    try {
      setBusy(true);
      let state = getCpuState();
      if (!state) throw new Error("Start CPU Blackjack first.");
      if (state.phase !== "player_turn") throw new Error("Hand is over. Deal again.");
      const d = [...state.deck];
      const player = [...state.player, d.pop()];
      state = resolveCpuState({ ...state, deck: d, player, result: "You hit. Your move." });
      await updateHostedGameState(state);
    } catch (error) {
      toast(normalizeError(error), "error");
    } finally {
      setBusy(false);
    }
  }

  async function cpuStand() {
    try {
      setBusy(true);
      let state = getCpuState();
      if (!state) throw new Error("Start CPU Blackjack first.");
      if (state.phase !== "player_turn") throw new Error("Hand is over. Deal again.");

      const d = [...state.deck];
      const dealer = [...state.dealer];
      while (handValue(dealer) < 17 && d.length) dealer.push(d.pop());

      const playerTotal = handValue(state.player);
      const dealerTotal = handValue(dealer);
      let result = "Push. Nobody wins.";
      if (dealerTotal > 21) result = "Duck Dealer busts. You win.";
      else if (playerTotal > dealerTotal) result = "You win. Buck approves.";
      else if (playerTotal < dealerTotal) result = "Duck Dealer wins. Run it back.";

      await updateHostedGameState({
        ...state,
        deck: d,
        dealer,
        playerTotal,
        dealerTotal,
        phase: "finished",
        status: "finished",
        result,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      toast(normalizeError(error), "error");
    } finally {
      setBusy(false);
    }
  }

  function renderCpuPanel(rawState) {
    const panel = $("#hwCpuPanel");
    if (!panel) return;

    const state = rawState?.mode === "cpu_blackjack" ? rawState : null;
    if (!state) {
      panel.classList.remove("is-live");
      return;
    }

    panel.classList.add("is-live");
    $("#hwPlayerHand").textContent = (state.player || []).map(cardText).join("  ") || "—";
    $("#hwDealerHand").textContent = (state.dealer || []).map(cardText).join("  ") || "—";
    $("#hwPlayerTotal").textContent = `Total: ${handValue(state.player)}`;
    $("#hwDealerTotal").textContent = `Total: ${handValue(state.dealer)}`;
    $("#hwCpuResult").textContent = state.result || "CPU Blackjack live.";
  }

  function renderRoom(room, gameState) {
    const card = $("#hwRoomCard");
    if (!card || !room) return;

    card.classList.add("is-live");
    $("#hwRoomCode").textContent = room.room_code || "—";
    $("#hwRoomGame").textContent = `Game: ${GAME_LABELS[room.game_type] || room.game_type || "—"}`;
    $("#hwRoomStatus").textContent = `Status: ${room.status || "—"}`;
    $("#hwRoomPlayers").textContent = `Max Players: ${room.max_players || "—"}`;

    const updated = gameState?.updated_at || room.updated_at || room.created_at;
    $("#hwRoomUpdated").textContent = `Updated: ${updated ? new Date(updated).toLocaleTimeString() : "—"}`;

    const state = gameState?.state || gameState || {};
    renderCpuPanel(state);
    $("#hwStateBox").textContent = JSON.stringify(state, null, 2);
  }

  async function copyRoomCode() {
    const code = $("#hwRoomCode")?.textContent?.trim();
    if (!code || code === "—") return toast("No room code yet.", "error");
    try {
      await navigator.clipboard.writeText(code);
      toast(`Copied room code: ${code}`, "success");
    } catch {
      toast(`Room code: ${code}`, "info");
    }
  }

  function bindDock() {
    $("#hwCreateTable")?.addEventListener("click", () => createTable());
    $("#hwJoinTable")?.addEventListener("click", () => joinTable());
    $("#hwResumeTable")?.addEventListener("click", resumeLastTable);
    $("#hwPlayCpu")?.addEventListener("click", playCpuBlackjack);
    $("#hwRefreshRoom")?.addEventListener("click", () => loadRoomState());
    $("#hwCopyRoom")?.addEventListener("click", copyRoomCode);
    $("#hwCpuDeal")?.addEventListener("click", cpuDeal);
    $("#hwCpuHit")?.addEventListener("click", cpuHit);
    $("#hwCpuStand")?.addEventListener("click", cpuStand);

    $("#hwCustomCode")?.addEventListener("input", (event) => {
      event.target.value = cleanCode(event.target.value);
    });
    $("#hwJoinCode")?.addEventListener("input", (event) => {
      event.target.value = cleanCode(event.target.value);
    });
  }

  async function boot() {
    try {
      ensureSupabaseClient();
      renderDock();
      await getUser();
      updateUserPill();

      ensureSupabaseClient().auth.onAuthStateChange((_event, session) => {
        STATE.user = session?.user || null;
        updateUserPill();
      });
    } catch (error) {
      console.error("HYPHSWORLD casino boot failed:", error);
      toast(normalizeError(error), "error");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.HYPHSWORLD_CASINO = {
    createTable,
    joinTable,
    resumeLastTable,
    playCpuBlackjack,
    cpuDeal,
    cpuHit,
    cpuStand,
    loadRoomState,
    get state() {
      return { ...STATE };
    },
  };
})();
