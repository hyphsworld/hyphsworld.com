/* HYPHSWORLD Casino — visual hosted tables + CPU Blackjack */
(() => {
  "use strict";

  const SUPABASE_URL = "https://yuhxtdkhsltaqiagrtys.supabase.co";
  const SUPABASE_KEY = "sb_publishable_oYdN-75W3b7k3m1zLukI-A_BKWVDD5e";
  const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  const STORAGE_KEY = "hyphsworld:lastCasinoTable:v2";

  const app = { client: null, user: null, room: null, gameState: null, channel: null, busy: false };
  const $ = (q, root = document) => root.querySelector(q);

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (window.supabase?.createClient) return resolve();
      const old = document.querySelector(`script[src="${src}"]`);
      if (old) {
        old.addEventListener("load", resolve, { once: true });
        old.addEventListener("error", reject, { once: true });
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error("Supabase library failed to load."));
      document.head.appendChild(s);
    });
  }

  async function supa() {
    if (!window.supabase?.createClient) await loadScript(SUPABASE_CDN);
    if (!app.client) {
      app.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        realtime: { params: { eventsPerSecond: 5 } },
      });
    }
    return app.client;
  }

  function css() {
    if ($("#hwCasinoVisualStyles")) return;
    const style = document.createElement("style");
    style.id = "hwCasinoVisualStyles";
    style.textContent = `
      .hw-casino-shell{position:relative;z-index:5;max-width:1160px;margin:24px auto;padding:18px;border-radius:30px;color:#fff;background:radial-gradient(circle at top left,rgba(255,43,214,.25),transparent 28%),radial-gradient(circle at top right,rgba(57,255,20,.18),transparent 28%),linear-gradient(135deg,#180018,#060b08 62%,#14001f);border:2px solid rgba(57,255,20,.7);box-shadow:0 0 35px rgba(57,255,20,.22),inset 0 0 28px rgba(255,255,255,.05);font-family:inherit}.hw-casino-shell *{box-sizing:border-box}.hw-casino-top{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;margin-bottom:14px}.hw-kicker{color:#39ff14;font-size:.78rem;text-transform:uppercase;letter-spacing:.16em;font-weight:1000}.hw-title{margin:2px 0;font-size:clamp(1.55rem,3.3vw,2.7rem);line-height:.95;text-transform:uppercase;text-shadow:0 3px 0 #000}.hw-copy{margin:0;max-width:780px;color:rgba(255,255,255,.78);font-weight:700}.hw-pill{border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.38);border-radius:999px;padding:9px 12px;font-weight:900}.hw-lobby-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:12px;margin-bottom:16px}.hw-field{grid-column:span 3}.hw-field.wide{grid-column:span 4}.hw-field label{display:block;margin:0 0 7px;color:#baffb5;font-size:.78rem;font-weight:1000;text-transform:uppercase;letter-spacing:.08em}.hw-field input,.hw-field select{width:100%;min-height:46px;border-radius:16px;border:1px solid rgba(255,255,255,.22);background:#060b08;color:#fff;padding:0 13px;font-weight:900;outline:none}.hw-actions{grid-column:span 5;display:flex;gap:10px;flex-wrap:wrap;align-items:end}.hw-btn{border:0;min-height:46px;border-radius:999px;padding:0 17px;cursor:pointer;font-weight:1000;text-transform:uppercase;letter-spacing:.04em;color:#061008;background:linear-gradient(135deg,#39ff14,#ffef00,#00f5ff);box-shadow:0 10px 24px rgba(0,0,0,.38)}.hw-btn.pink{background:linear-gradient(135deg,#ff2bd6,#39ff14);color:#fff}.hw-btn.dark{background:#101810;color:#eaffea;border:1px solid rgba(255,255,255,.18)}.hw-btn.gold{background:linear-gradient(135deg,#ff2bd6,#ffef00,#39ff14);color:#080707}.hw-btn:disabled{opacity:.55;filter:grayscale(.7);cursor:not-allowed}.hw-room-bar{display:none;margin:0 0 14px;padding:12px;border:1px solid rgba(255,255,255,.15);border-radius:20px;background:rgba(0,0,0,.28)}.hw-room-bar.live{display:block}.hw-room-row{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center}.hw-room-code{font-size:clamp(1.25rem,3vw,2.25rem);font-weight:1000;letter-spacing:.12em;color:#ffef00;text-shadow:0 0 15px rgba(255,239,0,.42)}.hw-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.hw-chip{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.07);border-radius:999px;padding:8px 10px;font-size:.82rem;font-weight:900}.hw-table-stage{position:relative;min-height:520px;border-radius:28px;overflow:hidden;background:radial-gradient(circle at 50% 42%,rgba(88,0,116,.95),#240034 58%,#120016);border:1px solid rgba(255,255,255,.14);box-shadow:inset 0 0 38px rgba(0,0,0,.58)}.hw-neon-sign{position:absolute;top:18px;left:24px;z-index:2}.hw-neon-sign .crown{font-size:2.2rem;filter:drop-shadow(0 0 8px #ffef00)}.hw-neon-sign h3{margin:0;font-size:clamp(1.4rem,4vw,3rem);line-height:.85;text-transform:uppercase;text-shadow:0 4px 0 #000,0 0 18px rgba(255,239,0,.35)}.hw-visual-table{position:absolute;left:50%;bottom:30px;transform:translateX(-50%);width:min(88%,820px);height:390px;border-radius:44% 44% 38% 38%;background:radial-gradient(circle at 50% 35%,#21b56a,#08783d 62%,#043b24);border:14px solid #6c3b14;box-shadow:0 22px 50px rgba(0,0,0,.58),inset 0 0 28px rgba(255,255,255,.2)}.hw-table-rail{position:absolute;inset:18px;border-radius:44% 44% 38% 38%;border:3px solid rgba(255,239,0,.38);pointer-events:none}.hw-table-logo{position:absolute;left:50%;top:49%;transform:translate(-50%,-50%);text-align:center;opacity:.22;font-weight:1000;font-size:clamp(2.6rem,7vw,5.5rem);line-height:.8;text-transform:uppercase;color:#fff;text-shadow:0 4px 0 #000}.hw-seat{position:absolute;z-index:3;text-align:center}.hw-seat.dealer{left:50%;top:36px;transform:translateX(-50%)}.hw-seat.player{left:50%;bottom:30px;transform:translateX(-50%)}.hw-avatar{width:60px;height:60px;border-radius:50%;display:grid;place-items:center;margin:0 auto 6px;background:linear-gradient(135deg,#ffef00,#ff2bd6);border:3px solid #fff;box-shadow:0 0 18px rgba(255,239,0,.35);font-size:1.9rem}.hw-seat-name{font-size:.78rem;font-weight:1000;letter-spacing:.08em;text-transform:uppercase;background:rgba(0,0,0,.45);border-radius:999px;padding:5px 9px}.hw-cards{display:flex;justify-content:center;gap:8px;min-height:76px;margin-top:8px}.hw-card{width:52px;height:72px;border-radius:9px;background:#fff;color:#111;display:flex;flex-direction:column;justify-content:space-between;padding:6px;font-weight:1000;box-shadow:0 8px 18px rgba(0,0,0,.35);border:1px solid rgba(0,0,0,.2)}.hw-card.red{color:#d9102f}.hw-card.back{background:repeating-linear-gradient(45deg,#1d1b6b,#1d1b6b 7px,#ff2bd6 7px,#ff2bd6 14px);color:transparent}.hw-card .rank{font-size:1rem}.hw-card .suit{align-self:flex-end;font-size:1.15rem}.hw-total{display:inline-block;margin-top:7px;border-radius:999px;padding:6px 10px;background:#061108;border:1px solid rgba(57,255,20,.45);font-weight:1000}.hw-chip-stack{position:absolute;right:70px;bottom:90px;display:flex;flex-direction:column;gap:5px}.hw-casino-chip{width:46px;height:46px;border-radius:50%;border:5px dashed #fff;background:#ff2bd6;box-shadow:0 8px 18px rgba(0,0,0,.4)}.hw-casino-chip:nth-child(2){background:#ffef00}.hw-casino-chip:nth-child(3){background:#00f5ff}.hw-cpu-controls{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);z-index:5;display:flex;gap:10px;flex-wrap:wrap;justify-content:center;width:92%}.hw-result{position:absolute;left:50%;top:132px;transform:translateX(-50%);z-index:4;text-align:center;max-width:80%;padding:9px 13px;border-radius:999px;background:rgba(0,0,0,.55);border:1px solid rgba(255,239,0,.45);font-weight:1000;color:#ffef00;text-transform:uppercase}.hw-side-games{position:absolute;right:18px;top:20px;z-index:3;display:grid;gap:10px}.hw-mini-game{width:92px;min-height:86px;border-radius:14px;padding:10px;background:linear-gradient(160deg,#1b1142,#070b12);border:1px solid rgba(255,255,255,.16);box-shadow:0 12px 22px rgba(0,0,0,.35);text-align:center;font-weight:1000}.hw-mini-game span{display:block;font-size:1.7rem}.hw-state-debug{margin-top:12px;display:none;border-radius:16px;padding:12px;background:#030704;border:1px solid rgba(57,255,20,.18);max-height:190px;overflow:auto;color:#cffff0;font-size:.82rem;white-space:pre-wrap}.hw-state-debug.open{display:block}.hw-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%) translateY(20px);opacity:0;pointer-events:none;z-index:9999;max-width:min(92vw,620px);padding:13px 16px;border-radius:999px;background:#061108;color:white;border:1px solid rgba(57,255,20,.5);box-shadow:0 16px 40px rgba(0,0,0,.45);font-weight:900;transition:.22s ease}.hw-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}.hw-toast[data-type=error]{border-color:#ff2b2b}.hw-toast[data-type=success]{border-color:#39ff14}@media(max-width:850px){.hw-field,.hw-field.wide,.hw-actions{grid-column:1/-1}.hw-table-stage{min-height:560px}.hw-visual-table{width:96%;height:390px;bottom:54px}.hw-side-games{display:none}.hw-chip-stack{right:28px;bottom:130px}.hw-card{width:45px;height:64px}.hw-cpu-controls{bottom:8px}.hw-seat.dealer{top:46px}.hw-seat.player{bottom:48px}}
    `;
    document.head.append(style);
  }

  function toast(msg, type = "info") {
    let box = $("#hwToast");
    if (!box) {
      box = document.createElement("div");
      box.id = "hwToast";
      box.className = "hw-toast";
      document.body.append(box);
    }
    box.textContent = msg;
    box.dataset.type = type;
    box.classList.add("show");
    clearTimeout(box._t);
    box._t = setTimeout(() => box.classList.remove("show"), 3500);
  }

  function cleanCode(v) { return String(v || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase(); }
  function roomId() { return app.room?.id || app.room?.room_id || app.room?.room?.id || null; }
  function normalizeRoom(p) { return p?.room || p || null; }
  function errorText(e) {
    const m = e?.message || String(e || "Unknown error");
    return ({ LOGIN_REQUIRED: "Log in first, P.", not_authenticated: "Log in first, P.", room_not_found: "That room code is not active.", room_full: "That table is full.", game_state_rate_limited: "Game updating too fast. Wait one second.", not_room_player: "Join the table before changing the game.", ROOM_CREATION_RATE_LIMITED: "Slow down P — too many tables opened too fast.", room_creation_rate_limited: "Slow down P — too many tables opened too fast." }[m]) || m;
  }

  function saveRoom(extra = {}) {
    if (!app.room?.room_code) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: app.room.id, room_code: app.room.room_code, game_type: app.room.game_type, saved_at: new Date().toISOString(), ...extra }));
    hydrateSaved();
  }
  function savedRoom() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; } }
  function hydrateSaved() {
    const s = savedRoom();
    if ($("#hwJoinCode") && s?.room_code && !$("#hwJoinCode").value) $("#hwJoinCode").value = s.room_code;
    if ($("#hwResume")) $("#hwResume").textContent = s?.room_code ? `Resume ${s.room_code}` : "Resume Last";
  }

  async function getUser() {
    const c = await supa();
    const { data, error } = await c.auth.getUser();
    app.user = error ? null : data?.user || null;
    updateUser();
    return app.user;
  }
  async function requireLogin() { const u = await getUser(); if (!u) throw new Error("LOGIN_REQUIRED"); return u; }
  function updateUser() { if ($("#hwUserPill")) $("#hwUserPill").textContent = app.user ? `Logged in: ${app.user.email || app.user.id.slice(0, 8)}` : "Login required"; }
  function setBusy(v) { app.busy = !!v; ["#hwCreate", "#hwJoin", "#hwResume", "#hwCpu", "#hwRefresh", "#hwDeal", "#hwHit", "#hwStand"].forEach(id => { const b = $(id); if (b) b.disabled = app.busy; }); }

  function mount() { return $("#hyphsworldCasinoTables") || $("#casinoTables") || $("main") || $(".casino") || document.body; }

  function renderShell() {
    css();
    if ($("#hyphsworldCasinoTables")) return;
    const shell = document.createElement("section");
    shell.id = "hyphsworldCasinoTables";
    shell.className = "hw-casino-shell";
    shell.innerHTML = `
      <div class="hw-casino-top"><div><div class="hw-kicker">Hosted by HYPHSWORLD</div><h2 class="hw-title">Black Jack Casino</h2><p class="hw-copy">Real table look, hosted rooms, saved table resume, and CPU Blackjack so users can play immediately.</p></div><div id="hwUserPill" class="hw-pill">Checking login…</div></div>
      <div class="hw-lobby-grid">
        <div class="hw-field"><label for="hwGameType">Game</label><select id="hwGameType"><option value="blackjack">Blackjack</option><option value="dice">Dice</option><option value="poker">Poker</option><option value="dominos">Dominos</option></select></div>
        <div class="hw-field wide"><label for="hwCustomCode">Custom room code optional</label><input id="hwCustomCode" maxlength="10" placeholder="Leave blank for auto code"></div>
        <div class="hw-field wide"><label for="hwJoinCode">Join room code</label><input id="hwJoinCode" maxlength="10" placeholder="Saved table appears here"></div>
        <div class="hw-actions"><button id="hwCreate" class="hw-btn">Create Table</button><button id="hwJoin" class="hw-btn pink">Join Table</button><button id="hwResume" class="hw-btn dark">Resume Last</button><button id="hwCpu" class="hw-btn gold">Play CPU</button><button id="hwRefresh" class="hw-btn dark">Refresh</button></div>
      </div>
      <div id="hwRoomBar" class="hw-room-bar"><div class="hw-room-row"><div><div class="hw-kicker">Room Code</div><div id="hwRoomCode" class="hw-room-code">—</div></div><button id="hwCopy" class="hw-btn dark">Copy Code</button></div><div class="hw-meta"><span id="hwGameChip" class="hw-chip">Game: Blackjack</span><span id="hwStatusChip" class="hw-chip">Status: Lobby</span><span id="hwPlayersChip" class="hw-chip">Mode: Hosted</span><span id="hwUpdatedChip" class="hw-chip">Updated: —</span></div></div>
      <div class="hw-table-stage">
        <div class="hw-neon-sign"><div class="crown">♛</div><h3>Black<br>Jack</h3><div class="hw-kicker">01 Casino Floor</div></div>
        <div class="hw-side-games"><div class="hw-mini-game"><span>🎲</span>Dice</div><div class="hw-mini-game"><span>🂡</span>Poker</div><div class="hw-mini-game"><span>🁬</span>Dominos</div></div>
        <div class="hw-result" id="hwResult">Press Play CPU to sit at the table.</div>
        <div class="hw-visual-table">
          <div class="hw-table-rail"></div><div class="hw-table-logo">HYPHS<br>WORLD</div>
          <div class="hw-seat dealer"><div class="hw-avatar">🦆</div><div class="hw-seat-name">Duck Dealer</div><div id="hwDealerCards" class="hw-cards"></div><div id="hwDealerTotal" class="hw-total">Total: —</div></div>
          <div class="hw-seat player"><div class="hw-avatar">🧢</div><div class="hw-seat-name">You</div><div id="hwPlayerCards" class="hw-cards"></div><div id="hwPlayerTotal" class="hw-total">Total: —</div></div>
          <div class="hw-chip-stack"><div class="hw-casino-chip"></div><div class="hw-casino-chip"></div><div class="hw-casino-chip"></div></div>
        </div>
        <div class="hw-cpu-controls"><button id="hwDeal" class="hw-btn">Deal</button><button id="hwHit" class="hw-btn pink">Hit</button><button id="hwStand" class="hw-btn dark">Stand</button><button id="hwDebugToggle" class="hw-btn dark">State</button></div>
      </div>
      <pre id="hwStateDebug" class="hw-state-debug">Waiting for game state…</pre>
    `;
    const target = mount();
    target === document.body ? document.body.prepend(shell) : target.prepend(shell);
    bind(); hydrateSaved(); renderCards(null);
  }

  function makeDeck() { const suits = ["♠", "♥", "♦", "♣"], ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"], d = []; suits.forEach(s => ranks.forEach(r => d.push({ rank: r, suit: s }))); for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; }
  function handValue(hand = []) { let total = 0, aces = 0; hand.forEach(c => { if (c.rank === "A") { total += 11; aces++; } else total += ["K", "Q", "J"].includes(c.rank) ? 10 : Number(c.rank); }); while (total > 21 && aces) { total -= 10; aces--; } return total; }
  function cardHtml(card, hidden = false) { if (!card || hidden) return `<div class="hw-card back"><span>?</span></div>`; const red = ["♥", "♦"].includes(card.suit) ? " red" : ""; return `<div class="hw-card${red}"><span class="rank">${card.rank}</span><span class="suit">${card.suit}</span></div>`; }
  function currentCpuState() { const raw = app.gameState?.state || app.gameState || {}; return raw?.mode === "cpu_blackjack" ? raw : null; }
  function resolveCpu(s) { const pt = handValue(s.player), dt = handValue(s.dealer); if (s.phase === "player_turn" && pt > 21) return { ...s, playerTotal: pt, dealerTotal: dt, phase: "finished", status: "finished", result: "Bust. Duck Dealer wins this one.", updatedAt: new Date().toISOString() }; return { ...s, playerTotal: pt, dealerTotal: dt, updatedAt: new Date().toISOString() }; }
  function newCpuState() { const d = makeDeck(), player = [d.pop(), d.pop()], dealer = [d.pop(), d.pop()]; return resolveCpu({ mode: "cpu_blackjack", game: "blackjack", status: "playing", phase: "player_turn", deck: d, player, dealer, result: "Your move. Hit or stand.", updatedAt: new Date().toISOString() }); }

  function renderCards(s) {
    const player = s?.player || [];
    const dealer = s?.dealer || [];
    const hideDealer = s?.phase === "player_turn" && dealer.length > 1;
    if ($("#hwPlayerCards")) $("#hwPlayerCards").innerHTML = player.length ? player.map(c => cardHtml(c)).join("") : `${cardHtml(null, true)}${cardHtml(null, true)}`;
    if ($("#hwDealerCards")) $("#hwDealerCards").innerHTML = dealer.length ? dealer.map((c, i) => cardHtml(c, hideDealer && i === 1)).join("") : `${cardHtml(null, true)}${cardHtml(null, true)}`;
    if ($("#hwPlayerTotal")) $("#hwPlayerTotal").textContent = `Total: ${player.length ? handValue(player) : "—"}`;
    if ($("#hwDealerTotal")) $("#hwDealerTotal").textContent = hideDealer ? `Showing: ${handValue([dealer[0]])}` : `Total: ${dealer.length ? handValue(dealer) : "—"}`;
    if ($("#hwResult")) $("#hwResult").textContent = s?.result || "Press Play CPU to sit at the table.";
  }

  async function createTable(gameOverride = null, initialState = null) {
    setBusy(true);
    try {
      await requireLogin();
      const c = await supa();
      const game = gameOverride || $("#hwGameType")?.value || "blackjack";
      const custom = cleanCode($("#hwCustomCode")?.value || "");
      const { data, error } = await c.rpc("create_table_game_room", { requested_code: custom || null, requested_game_type: game });
      if (error) throw error;
      app.room = normalizeRoom(data); app.gameState = data?.state || null; saveRoom(initialState?.mode ? { mode: initialState.mode } : {}); renderRoom(); await subscribeRoom(roomId());
      if (initialState) await updateHostedState(initialState);
      toast(`Table live: ${app.room.room_code}`, "success");
      return app.room;
    } catch (e) { toast(errorText(e), "error"); console.error(e); return null; } finally { setBusy(false); }
  }

  async function joinTable(codeArg = null) {
    setBusy(true);
    try {
      await requireLogin();
      const c = await supa();
      const code = cleanCode(codeArg || $("#hwJoinCode")?.value || "");
      if (!code) throw new Error("Enter a room code first.");
      const { data, error } = await c.rpc("join_game_room", { p_room_code: code });
      if (error) throw error;
      app.room = normalizeRoom(data); saveRoom(); await loadRoomState(); await subscribeRoom(roomId()); toast(`Joined table: ${app.room.room_code}`, "success");
      return app.room;
    } catch (e) { toast(errorText(e), "error"); console.error(e); return null; } finally { setBusy(false); }
  }

  async function resumeLast() { const s = savedRoom(); if (!s?.room_code) return toast("No saved table yet. Create or join one first.", "error"); await joinTable(s.room_code); }

  async function loadRoomState(id = roomId()) {
    if (!id) return;
    const c = await supa();
    const { data, error } = await c.from("game_state").select("room_id,state,version,updated_by,updated_at").eq("room_id", id).single();
    if (!error) app.gameState = data;
    renderRoom();
  }

  async function updateHostedState(next) {
    if (!app.room?.id) throw new Error("No active room.");
    const c = await supa();
    const { data, error } = await c.rpc("update_game_state", { p_room_id: app.room.id, p_state: next });
    if (error) throw error;
    app.gameState = data; renderRoom(); return data;
  }

  async function subscribeRoom(id) {
    if (!id) return;
    const c = await supa();
    if (app.channel) await c.removeChannel(app.channel);
    app.channel = c.channel(`hyphsworld-room-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_state", filter: `room_id=eq.${id}` }, payload => { app.gameState = payload.new || app.gameState; renderRoom(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "game_players", filter: `room_id=eq.${id}` }, () => loadRoomState(id))
      .subscribe(status => { if (status === "SUBSCRIBED") toast("Live table connected.", "success"); });
  }

  async function playCpu() { const room = await createTable("blackjack", newCpuState()); if (room) toast("CPU Blackjack live. You can see the table now.", "success"); }
  async function deal() { try { setBusy(true); if (!app.room?.id) return await playCpu(); await updateHostedState(newCpuState()); toast("New hand dealt.", "success"); } catch (e) { toast(errorText(e), "error"); } finally { setBusy(false); } }
  async function hit() { try { setBusy(true); let s = currentCpuState(); if (!s) throw new Error("Press Play CPU first."); if (s.phase !== "player_turn") throw new Error("Hand over. Deal again."); const d = [...s.deck], player = [...s.player, d.pop()]; await updateHostedState(resolveCpu({ ...s, deck: d, player, result: "You hit. Your move." })); } catch (e) { toast(errorText(e), "error"); } finally { setBusy(false); } }
  async function stand() { try { setBusy(true); const s = currentCpuState(); if (!s) throw new Error("Press Play CPU first."); if (s.phase !== "player_turn") throw new Error("Hand over. Deal again."); const d = [...s.deck], dealer = [...s.dealer]; while (handValue(dealer) < 17 && d.length) dealer.push(d.pop()); const pt = handValue(s.player), dt = handValue(dealer); let result = "Push. Nobody wins."; if (dt > 21) result = "Duck Dealer busts. You win."; else if (pt > dt) result = "You win. Buck approves."; else if (pt < dt) result = "Duck Dealer wins. Run it back."; await updateHostedState({ ...s, deck: d, dealer, playerTotal: pt, dealerTotal: dt, phase: "finished", status: "finished", result, updatedAt: new Date().toISOString() }); } catch (e) { toast(errorText(e), "error"); } finally { setBusy(false); } }

  function renderRoom() {
    if (app.room && $("#hwRoomBar")) {
      $("#hwRoomBar").classList.add("live");
      $("#hwRoomCode").textContent = app.room.room_code || "—";
      $("#hwGameChip").textContent = `Game: ${app.room.game_type || "blackjack"}`;
      $("#hwStatusChip").textContent = `Status: ${app.room.status || "live"}`;
      $("#hwPlayersChip").textContent = currentCpuState() ? "Mode: CPU" : "Mode: Hosted";
      const updated = app.gameState?.updated_at || app.room.updated_at || app.room.created_at;
      $("#hwUpdatedChip").textContent = `Updated: ${updated ? new Date(updated).toLocaleTimeString() : "—"}`;
    }
    const raw = app.gameState?.state || app.gameState || null;
    renderCards(raw?.mode === "cpu_blackjack" ? raw : null);
    if ($("#hwStateDebug")) $("#hwStateDebug").textContent = JSON.stringify(raw || {}, null, 2);
  }

  async function copyCode() { const code = $("#hwRoomCode")?.textContent?.trim(); if (!code || code === "—") return toast("No room code yet.", "error"); try { await navigator.clipboard.writeText(code); toast(`Copied room code: ${code}`, "success"); } catch { toast(`Room code: ${code}`); } }

  function bind() {
    $("#hwCreate")?.addEventListener("click", () => createTable());
    $("#hwJoin")?.addEventListener("click", () => joinTable());
    $("#hwResume")?.addEventListener("click", resumeLast);
    $("#hwCpu")?.addEventListener("click", playCpu);
    $("#hwRefresh")?.addEventListener("click", () => loadRoomState());
    $("#hwCopy")?.addEventListener("click", copyCode);
    $("#hwDeal")?.addEventListener("click", deal);
    $("#hwHit")?.addEventListener("click", hit);
    $("#hwStand")?.addEventListener("click", stand);
    $("#hwDebugToggle")?.addEventListener("click", () => $("#hwStateDebug")?.classList.toggle("open"));
    ["#hwCustomCode", "#hwJoinCode"].forEach(id => $(id)?.addEventListener("input", e => { e.target.value = cleanCode(e.target.value); }));
  }

  async function boot() {
    try {
      await supa(); renderShell(); await getUser(); app.client.auth.onAuthStateChange((_e, session) => { app.user = session?.user || null; updateUser(); }); hydrateSaved();
    } catch (e) { console.error("HYPHSWORLD casino boot failed:", e); toast(errorText(e), "error"); }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  window.HYPHSWORLD_CASINO = { createTable, joinTable, resumeLast, playCpu, deal, hit, stand, loadRoomState, get state() { return { ...app }; } };
})();
