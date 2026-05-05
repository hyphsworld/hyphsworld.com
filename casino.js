/* HYPHSWORLD Casino — hosted tables, saved room resume, and CPU Blackjack. */
(() => {
  "use strict";

  const SUPABASE_URL = "https://yuhxtdkhsltaqiagrtys.supabase.co";
  const SUPABASE_KEY = "sb_publishable_oYdN-75W3b7k3m1zLukI-A_BKWVDD5e";
  const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  const STORAGE_KEY = "hyphsworld:lastCasinoTable:v1";

  const state = { client: null, user: null, room: null, gameState: null, channel: null, busy: false };
  const labels = { blackjack: "Blackjack", dice: "Dice", poker: "Poker", dominos: "Dominos" };
  const $ = (q, root = document) => root.querySelector(q);

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        if (window.supabase) resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Supabase CDN failed to load."));
      document.head.appendChild(script);
    });
  }

  async function ensureSupabase() {
    if (!window.supabase?.createClient) await loadScript(SUPABASE_CDN);
    if (!window.supabase?.createClient) throw new Error("Supabase library unavailable.");
    if (!state.client) {
      state.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        realtime: { params: { eventsPerSecond: 5 } },
      });
    }
    return state.client;
  }

  function addStyles() {
    if ($("#hwCasinoStyles")) return;
    const css = `
      .hw-table-dock{position:relative;z-index:5;margin:22px auto;max-width:1120px;border:2px solid rgba(57,255,20,.72);border-radius:28px;padding:18px;background:radial-gradient(circle at 10% 0%,rgba(255,0,128,.2),transparent 28%),radial-gradient(circle at 90% 15%,rgba(0,245,255,.18),transparent 31%),linear-gradient(135deg,rgba(2,8,6,.97),rgba(8,16,10,.93));box-shadow:0 0 28px rgba(57,255,20,.24),inset 0 0 22px rgba(255,255,255,.05);color:#f5fff7;font-family:inherit}.hw-table-dock *{box-sizing:border-box}.hw-dock-head{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start;justify-content:space-between;margin-bottom:16px}.hw-kicker{font-weight:1000;letter-spacing:.16em;color:#39ff14;text-transform:uppercase;font-size:.78rem}.hw-title{margin:3px 0 2px;font-size:clamp(1.45rem,3vw,2.35rem);line-height:1;text-transform:uppercase}.hw-copy{margin:0;color:rgba(245,255,247,.78);max-width:780px}.hw-user-pill,.hw-chip{border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.35);border-radius:999px;padding:9px 12px;font-weight:900}.hw-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:12px;align-items:end}.hw-field{grid-column:span 3}.hw-field.hw-wide{grid-column:span 4}.hw-field label{display:block;margin:0 0 7px;font-size:.78rem;color:#baffb5;font-weight:1000;text-transform:uppercase;letter-spacing:.08em}.hw-field input,.hw-field select{width:100%;border:1px solid rgba(255,255,255,.2);background:#061108;color:white;border-radius:16px;min-height:46px;padding:0 13px;font-weight:900;outline:none}.hw-actions{grid-column:span 5;display:flex;gap:10px;flex-wrap:wrap}.hw-btn{border:0;cursor:pointer;border-radius:999px;min-height:46px;padding:0 17px;font-weight:1000;text-transform:uppercase;letter-spacing:.04em;color:#041006;background:linear-gradient(135deg,#39ff14,#ffef00,#00f5ff);box-shadow:0 10px 22px rgba(0,0,0,.35)}.hw-btn.secondary{background:linear-gradient(135deg,#ff2bd6,#39ff14);color:white}.hw-btn.dark{background:#101810;color:#eaffea;border:1px solid rgba(255,255,255,.15)}.hw-btn.cpu{background:linear-gradient(135deg,#ff2bd6,#ffef00,#39ff14);color:#050705}.hw-btn:disabled{opacity:.55;cursor:not-allowed;filter:grayscale(.7)}.hw-room{margin-top:15px;display:none;border:1px solid rgba(255,255,255,.15);border-radius:22px;padding:14px;background:rgba(0,0,0,.32)}.hw-room.live,.hw-cpu.live{display:block}.hw-room-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}.hw-room-code{font-size:clamp(1.4rem,4vw,2.6rem);font-weight:1000;letter-spacing:.12em;color:#ffef00;text-shadow:0 0 16px rgba(255,239,0,.4)}.hw-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.hw-state{margin-top:12px;border-radius:16px;padding:12px;background:#030704;border:1px solid rgba(57,255,20,.18);max-height:220px;overflow:auto;font-size:.82rem;white-space:pre-wrap;color:#cffff0}.hw-cpu{margin-top:14px;display:none;border:1px solid rgba(255,239,0,.28);border-radius:20px;padding:14px;background:linear-gradient(135deg,rgba(255,239,0,.09),rgba(255,43,214,.08))}.hw-cpu-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}.hw-hand{border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.28);border-radius:16px;padding:12px}.hw-hand strong{display:block;color:#39ff14;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}.hw-cards{font-size:1.05rem;font-weight:900}.hw-cpu-actions{display:flex;flex-wrap:wrap;gap:10px}.hw-result{margin-top:10px;font-weight:1000;color:#ffef00;text-transform:uppercase}.hw-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%) translateY(20px);opacity:0;pointer-events:none;z-index:9999;max-width:min(92vw,620px);padding:13px 16px;border-radius:999px;background:#061108;color:white;border:1px solid rgba(57,255,20,.5);box-shadow:0 16px 40px rgba(0,0,0,.45);font-weight:900;transition:.22s ease}.hw-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}.hw-toast[data-type=error]{border-color:#ff2b2b}.hw-toast[data-type=success]{border-color:#39ff14}@media(max-width:820px){.hw-field,.hw-field.hw-wide,.hw-actions{grid-column:1/-1}.hw-actions .hw-btn{flex:1 1 160px}.hw-cpu-grid{grid-template-columns:1fr}}
    `;
    const style = document.createElement("style");
    style.id = "hwCasinoStyles";
    style.textContent = css;
    document.head.append(style);
  }

  function toast(message, type = "info") {
    let box = $("#hwToast");
    if (!box) {
      box = document.createElement("div");
      box.id = "hwToast";
      box.className = "hw-toast";
      document.body.append(box);
    }
    box.textContent = message;
    box.dataset.type = type;
    box.classList.add("show");
    clearTimeout(box._timer);
    box._timer = setTimeout(() => box.classList.remove("show"), 3800);
  }

  function cleanCode(v) { return String(v || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase(); }
  function roomId(room = state.room) { return room?.id || room?.room_id || room?.room?.id || null; }
  function normalizeRoom(payload) { return payload?.room || payload || null; }
  function savedRoom() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; } }
  function saveRoom(room, extra = {}) {
    if (!room?.room_code) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: room.id, room_code: room.room_code, game_type: room.game_type, status: room.status, saved_at: new Date().toISOString(), ...extra }));
    hydrateSaved();
  }
  function humanError(error) {
    const msg = error?.message || String(error || "Unknown error");
    return ({ not_authenticated: "Log in first, P.", LOGIN_REQUIRED: "Log in first, P.", room_not_found: "That room code is not active.", room_full: "That table is full.", game_state_rate_limited: "Game is updating too fast. Try again in a second.", not_room_player: "Join the table before changing the game.", ROOM_CREATION_RATE_LIMITED: "Slow down P — too many tables opened too fast.", room_creation_rate_limited: "Slow down P — too many tables opened too fast." }[msg]) || msg;
  }

  async function getUser() {
    const client = await ensureSupabase();
    const { data, error } = await client.auth.getUser();
    state.user = error ? null : data?.user || null;
    updateUserPill();
    return state.user;
  }
  async function requireLogin() { const user = await getUser(); if (!user) throw new Error("LOGIN_REQUIRED"); return user; }

  function mount() { return $("#hyphsworldCasinoTables") || $("#casinoTables") || $("main") || $(".casino") || document.body; }

  function renderDock() {
    addStyles();
    if ($("#hyphsworldCasinoTables")) return;
    const dock = document.createElement("section");
    dock.id = "hyphsworldCasinoTables";
    dock.className = "hw-table-dock";
    dock.innerHTML = `
      <div class="hw-dock-head"><div><div class="hw-kicker">Hosted by HYPHSWORLD</div><h2 class="hw-title">Casino Game Tables</h2><p class="hw-copy">No setup for users. Resume the last table automatically, or play CPU Blackjack instantly so nobody gets stuck waiting.</p></div><div id="hwUserPill" class="hw-user-pill">Checking login…</div></div>
      <div class="hw-grid">
        <div class="hw-field"><label for="hwGameType">Game</label><select id="hwGameType"><option value="blackjack">Blackjack</option><option value="dice">Dice</option><option value="poker">Poker</option><option value="dominos">Dominos</option></select></div>
        <div class="hw-field hw-wide"><label for="hwCustomCode">Custom room code optional</label><input id="hwCustomCode" maxlength="10" autocomplete="off" placeholder="Leave blank for auto code"></div>
        <div class="hw-field hw-wide"><label for="hwJoinCode">Join room code</label><input id="hwJoinCode" maxlength="10" autocomplete="off" placeholder="Saved table appears here"></div>
        <div class="hw-actions"><button id="hwCreate" class="hw-btn">Create Table</button><button id="hwJoin" class="hw-btn secondary">Join Table</button><button id="hwResume" class="hw-btn dark">Resume Last</button><button id="hwCpu" class="hw-btn cpu">Play CPU</button><button id="hwRefresh" class="hw-btn dark">Refresh</button></div>
      </div>
      <div id="hwRoom" class="hw-room"><div class="hw-room-row"><div><div class="hw-kicker">Room Code</div><div id="hwRoomCode" class="hw-room-code">—</div></div><button id="hwCopy" class="hw-btn dark">Copy Code</button></div><div class="hw-meta"><span id="hwRoomGame" class="hw-chip">Game: —</span><span id="hwRoomStatus" class="hw-chip">Status: —</span><span id="hwRoomPlayers" class="hw-chip">Players: —</span><span id="hwRoomUpdated" class="hw-chip">Updated: —</span></div><div id="hwCpuPanel" class="hw-cpu"><h3>CPU Blackjack</h3><div class="hw-cpu-grid"><div class="hw-hand"><strong>You</strong><div id="hwPlayerHand" class="hw-cards">—</div><div id="hwPlayerTotal" class="hw-chip">Total: —</div></div><div class="hw-hand"><strong>CPU / Duck Dealer</strong><div id="hwDealerHand" class="hw-cards">—</div><div id="hwDealerTotal" class="hw-chip">Total: —</div></div></div><div class="hw-cpu-actions"><button id="hwDeal" class="hw-btn">Deal</button><button id="hwHit" class="hw-btn secondary">Hit</button><button id="hwStand" class="hw-btn dark">Stand</button></div><div id="hwCpuResult" class="hw-result">Start a CPU game.</div></div><pre id="hwState" class="hw-state">Waiting for table state…</pre></div>
    `;
    const target = mount();
    target === document.body ? document.body.prepend(dock) : target.prepend(dock);
    bind(); hydrateSaved();
  }

  function updateUserPill() { const pill = $("#hwUserPill"); if (pill) pill.textContent = state.user ? `Logged in: ${state.user.email || state.user.id.slice(0, 8)}` : "Login required"; }
  function hydrateSaved() { const saved = savedRoom(); if ($("#hwJoinCode") && saved?.room_code && !$("#hwJoinCode").value) $("#hwJoinCode").value = saved.room_code; if ($("#hwResume")) $("#hwResume").textContent = saved?.room_code ? `Resume ${saved.room_code}` : "Resume Last"; }
  function setBusy(v) { state.busy = !!v; ["#hwCreate", "#hwJoin", "#hwResume", "#hwCpu", "#hwRefresh", "#hwDeal", "#hwHit", "#hwStand"].forEach(id => { const b = $(id); if (b) b.disabled = state.busy; }); }

  async function createTable(gameOverride = null, initialGameState = null) {
    setBusy(true);
    try {
      await requireLogin();
      const client = await ensureSupabase();
      const gameType = gameOverride || $("#hwGameType")?.value || "blackjack";
      const customCode = cleanCode($("#hwCustomCode")?.value || "");
      const { data, error } = await client.rpc("create_table_game_room", { requested_code: customCode || null, requested_game_type: gameType });
      if (error) throw error;
      state.room = normalizeRoom(data); state.gameState = data?.state || null; saveRoom(state.room, initialGameState?.mode ? { mode: initialGameState.mode } : {}); renderRoom(); await subscribeRoom(roomId());
      if (initialGameState) await updateHostedState(initialGameState);
      toast(`Table live: ${state.room.room_code}`, "success");
      return state.room;
    } catch (e) { toast(humanError(e), "error"); console.error(e); return null; } finally { setBusy(false); }
  }

  async function joinTable(codeArg = null) {
    setBusy(true);
    try {
      await requireLogin();
      const client = await ensureSupabase();
      const code = cleanCode(codeArg || $("#hwJoinCode")?.value || "");
      if (!code) throw new Error("Enter a room code first.");
      const { data, error } = await client.rpc("join_game_room", { p_room_code: code });
      if (error) throw error;
      state.room = normalizeRoom(data); saveRoom(state.room); await loadRoomState(); await subscribeRoom(roomId()); toast(`Joined table: ${state.room.room_code}`, "success");
      return state.room;
    } catch (e) { toast(humanError(e), "error"); console.error(e); return null; } finally { setBusy(false); }
  }

  async function resumeLast() { const saved = savedRoom(); if (!saved?.room_code) return toast("No saved table yet. Create or join one first.", "error"); await joinTable(saved.room_code); }

  async function loadRoomState(id = roomId()) {
    if (!id) return;
    const client = await ensureSupabase();
    const { data, error } = await client.from("game_state").select("room_id,state,version,updated_by,updated_at").eq("room_id", id).single();
    if (!error) state.gameState = data;
    renderRoom();
  }

  async function updateHostedState(nextState) {
    if (!state.room?.id) throw new Error("No active room.");
    const client = await ensureSupabase();
    const { data, error } = await client.rpc("update_game_state", { p_room_id: state.room.id, p_state: nextState });
    if (error) throw error;
    state.gameState = data; renderRoom(); return data;
  }

  async function subscribeRoom(id) {
    if (!id) return;
    const client = await ensureSupabase();
    if (state.channel) await client.removeChannel(state.channel);
    state.channel = client.channel(`hyphsworld-room-${id}`).on("postgres_changes", { event: "*", schema: "public", table: "game_state", filter: `room_id=eq.${id}` }, p => { state.gameState = p.new || state.gameState; renderRoom(); }).on("postgres_changes", { event: "*", schema: "public", table: "game_players", filter: `room_id=eq.${id}` }, () => loadRoomState(id)).subscribe(s => { if (s === "SUBSCRIBED") toast("Live table connected.", "success"); });
  }

  function makeDeck() { const suits = ["♠", "♥", "♦", "♣"], ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"], d = []; suits.forEach(s => ranks.forEach(r => d.push({ rank: r, suit: s }))); for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; }
  function cardText(c) { return c ? `${c.rank}${c.suit}` : "?"; }
  function handValue(hand = []) { let total = 0, aces = 0; hand.forEach(c => { if (c.rank === "A") { total += 11; aces++; } else total += ["K", "Q", "J"].includes(c.rank) ? 10 : Number(c.rank); }); while (total > 21 && aces) { total -= 10; aces--; } return total; }
  function cpuState() { const raw = state.gameState?.state || state.gameState || {}; return raw?.mode === "cpu_blackjack" ? raw : null; }
  function resolveCpu(s) { const playerTotal = handValue(s.player), dealerTotal = handValue(s.dealer); if (s.phase === "player_turn" && playerTotal > 21) return { ...s, phase: "finished", status: "finished", playerTotal, dealerTotal, result: "Bust. Duck Dealer wins this one.", updatedAt: new Date().toISOString() }; return { ...s, playerTotal, dealerTotal, updatedAt: new Date().toISOString() }; }
  function newCpuState() { const d = makeDeck(), player = [d.pop(), d.pop()], dealer = [d.pop(), d.pop()]; return resolveCpu({ mode: "cpu_blackjack", game: "blackjack", status: "playing", deck: d, player, dealer, phase: "player_turn", result: "Your move. Hit or stand.", updatedAt: new Date().toISOString() }); }
  async function playCpu() { const room = await createTable("blackjack", newCpuState()); if (room) toast("CPU Blackjack live. No waiting on nobody.", "success"); }
  async function deal() { try { setBusy(true); if (!state.room?.id) return await playCpu(); await updateHostedState(newCpuState()); toast("New CPU hand dealt.", "success"); } catch (e) { toast(humanError(e), "error"); } finally { setBusy(false); } }
  async function hit() { try { setBusy(true); let s = cpuState(); if (!s) throw new Error("Start CPU Blackjack first."); if (s.phase !== "player_turn") throw new Error("Hand is over. Deal again."); const d = [...s.deck], player = [...s.player, d.pop()]; await updateHostedState(resolveCpu({ ...s, deck: d, player, result: "You hit. Your move." })); } catch (e) { toast(humanError(e), "error"); } finally { setBusy(false); } }
  async function stand() { try { setBusy(true); const s = cpuState(); if (!s) throw new Error("Start CPU Blackjack first."); if (s.phase !== "player_turn") throw new Error("Hand is over. Deal again."); const d = [...s.deck], dealer = [...s.dealer]; while (handValue(dealer) < 17 && d.length) dealer.push(d.pop()); const pt = handValue(s.player), dt = handValue(dealer); let result = "Push. Nobody wins."; if (dt > 21) result = "Duck Dealer busts. You win."; else if (pt > dt) result = "You win. Buck approves."; else if (pt < dt) result = "Duck Dealer wins. Run it back."; await updateHostedState({ ...s, deck: d, dealer, playerTotal: pt, dealerTotal: dt, phase: "finished", status: "finished", result, updatedAt: new Date().toISOString() }); } catch (e) { toast(humanError(e), "error"); } finally { setBusy(false); } }

  function renderCpu(raw) {
    const panel = $("#hwCpuPanel"); if (!panel) return;
    const s = raw?.mode === "cpu_blackjack" ? raw : null;
    panel.classList.toggle("live", !!s);
    if (!s) return;
    $("#hwPlayerHand").textContent = (s.player || []).map(cardText).join("  ") || "—";
    $("#hwDealerHand").textContent = (s.dealer || []).map(cardText).join("  ") || "—";
    $("#hwPlayerTotal").textContent = `Total: ${handValue(s.player)}`;
    $("#hwDealerTotal").textContent = `Total: ${handValue(s.dealer)}`;
    $("#hwCpuResult").textContent = s.result || "CPU Blackjack live.";
  }

  function renderRoom() {
    if (!state.room || !$("#hwRoom")) return;
    $("#hwRoom").classList.add("live");
    $("#hwRoomCode").textContent = state.room.room_code || "—";
    $("#hwRoomGame").textContent = `Game: ${labels[state.room.game_type] || state.room.game_type || "—"}`;
    $("#hwRoomStatus").textContent = `Status: ${state.room.status || "—"}`;
    $("#hwRoomPlayers").textContent = `Max Players: ${state.room.max_players || "—"}`;
    const updated = state.gameState?.updated_at || state.room.updated_at || state.room.created_at;
    $("#hwRoomUpdated").textContent = `Updated: ${updated ? new Date(updated).toLocaleTimeString() : "—"}`;
    const raw = state.gameState?.state || state.gameState || {};
    renderCpu(raw);
    $("#hwState").textContent = JSON.stringify(raw, null, 2);
  }

  async function copyCode() { const code = $("#hwRoomCode")?.textContent?.trim(); if (!code || code === "—") return toast("No room code yet.", "error"); try { await navigator.clipboard.writeText(code); toast(`Copied room code: ${code}`, "success"); } catch { toast(`Room code: ${code}`); } }
  function bind() {
    $("#hwCreate")?.addEventListener("click", () => createTable()); $("#hwJoin")?.addEventListener("click", () => joinTable()); $("#hwResume")?.addEventListener("click", resumeLast); $("#hwCpu")?.addEventListener("click", playCpu); $("#hwRefresh")?.addEventListener("click", () => loadRoomState()); $("#hwCopy")?.addEventListener("click", copyCode); $("#hwDeal")?.addEventListener("click", deal); $("#hwHit")?.addEventListener("click", hit); $("#hwStand")?.addEventListener("click", stand);
    ["#hwCustomCode", "#hwJoinCode"].forEach(id => $(id)?.addEventListener("input", e => { e.target.value = cleanCode(e.target.value); }));
  }

  async function boot() {
    try {
      await ensureSupabase(); renderDock(); await getUser();
      state.client.auth.onAuthStateChange((_event, session) => { state.user = session?.user || null; updateUserPill(); });
      hydrateSaved();
    } catch (e) { console.error("HYPHSWORLD casino boot failed:", e); toast(humanError(e), "error"); }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  window.HYPHSWORLD_CASINO = { createTable, joinTable, resumeLast, playCpu, deal, hit, stand, loadRoomState, get state() { return { ...state }; } };
})();
