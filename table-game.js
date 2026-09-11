(function () {
  "use strict";

  const CONFIG_FILE = "supabase-config.js";
  const CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  const REFRESH_MS = 5000;
  const GAME_CONFIG = {
    dice: { title: "Craps Table", intro: "Regular Pass Line craps from a premium HYPHSWORLD player-seat table.", scoreKey: "01_dice", winPoints: 75, maxPlayers: 4 },
    blackjack: { title: "Blackjack Table", intro: "Player-seat blackjack with a clean felt view and simple hit / stand controls.", scoreKey: "01_blackjack", winPoints: 100, maxPlayers: 4 },
    poker: { title: "Poker Table", intro: "First-person poker table with your hand at the rail and community cards in the center.", scoreKey: "01_poker_beta", winPoints: 125, maxPlayers: 4 },
    spades: { title: "Spades Table", intro: "Four-seat Spades table with your hand in front, table action in the center, and one shared room code.", scoreKey: "01_spades_beta", winPoints: 125, maxPlayers: 4 }
  };

  let sbPromise = null;
  let currentUser = null;
  let activeRoom = null;
  let activeState = null;
  let refreshTimer = null;
  let gameType = "dice";
  let localScore = 0;
  let scoreSubmissionId = null;

  function $(id) { return document.getElementById(id); }
  function setText(id, value) { const el = $(id); if (el) el.textContent = value; }
  function safeText(value, fallback) { return String(value || fallback || "").replace(/[<>]/g, "").trim(); }
  function rand(max) { return Math.floor(Math.random() * max); }
  function roomCode() { return Math.random().toString(36).replace(/[^a-z0-9]/gi, "").slice(2, 8).toUpperCase(); }
  function submissionId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (token) => {
      const value = Math.floor(Math.random() * 16);
      return (token === "x" ? value : (value & 3) | 8).toString(16);
    });
  }
  function cardValue(card) { return Math.min(card.rank, 10); }
  function rankLabel(rank) { return ({ 1: "A", 11: "J", 12: "Q", 13: "K" })[rank] || String(rank); }
  function cardLabel(card) { return `${rankLabel(card.rank)}${card.suit}`; }
  function cardHtml(card) {
    if (!card) return "";
    const red = card.suit === "♥" || card.suit === "♦";
    return `<span class="hw-card${red ? " is-red" : ""}"><b>${rankLabel(card.rank)}</b><i>${card.suit}</i></span>`;
  }
  function cardRow(cards) { return `<div class="hw-card-row">${(cards || []).map(cardHtml).join("")}</div>`; }
  function dieFace(value) { return ["?", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][Number(value)] || "?"; }
  function handTotal(cards) {
    let total = 0, aces = 0;
    (cards || []).forEach((card) => { if (card.rank === 1) { aces += 1; total += 11; } else total += cardValue(card); });
    while (total > 21 && aces > 0) { total -= 10; aces -= 1; }
    return total;
  }
  function makeCardDeck() {
    const suits = ["♠", "♥", "♦", "♣"];
    const deck = [];
    suits.forEach((suit) => { for (let rank = 1; rank <= 13; rank += 1) deck.push({ rank, suit }); });
    for (let i = deck.length - 1; i > 0; i -= 1) { const j = rand(i + 1); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    return deck;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts).find((script) => script.src && script.src.includes(src));
      if (existing) { setTimeout(resolve, 80); return; }
      const script = document.createElement("script");
      script.src = src; script.async = false; script.onload = resolve;
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
      if (!window.supabase?.createClient) await loadScript(CDN);
      if (!window.supabase?.createClient) throw new Error("Supabase client unavailable.");
      return window.supabase.createClient(config.url, config.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    })();
    return sbPromise;
  }
  async function requireUser() {
    if (!window.HWAuth) throw new Error("Auth unavailable.");
    const user = await window.HWAuth.getCurrentUser();
    if (!user?.userId) throw new Error("Login required to play.");
    currentUser = user;
    setText("tableSelfSeatName", user.displayName || "YOUR SEAT");
    const authLink = $("tableAuthLink");
    if (authLink) { authLink.textContent = "Manage ID"; authLink.href = "account.html"; }
    return user;
  }
  function setStatus(message) { setText("tableStatus", message); }
  function requestedPlayerCount() {
    const value = Number($("tablePlayerCount")?.value || 2);
    return Math.min(4, Math.max(1, Number.isInteger(value) ? value : 2));
  }
  function getGameType() {
    const requested = String(new URLSearchParams(window.location.search).get("game") || "dice").toLowerCase();
    return GAME_CONFIG[requested] ? requested : "dice";
  }
  function applyGameCopy() {
    const cfg = GAME_CONFIG[gameType];
    document.title = `${cfg.title} | HYPHSWORLD`;
    setText("tableGameTitle", cfg.title); setText("tableGameIntro", cfg.intro);
    setText("tableSideTitle", `${cfg.title} Tables`); setText("tableBoardTitle", cfg.title);
    setText("tableModeLabel", gameType.toUpperCase()); setText("tickerGameName", cfg.title.toUpperCase()); setText("tickerGameName2", cfg.title.toUpperCase());
    setText("tableActionLabel", gameType === "dice" ? "Pass Line Action" : `${cfg.title.replace(" Table", "")} Action`);
    setText("cardPovSign", `${cfg.title.toUpperCase()} // 01`);
    document.body.dataset.tableGame = gameType;
    const room = document.querySelector(".card-pov-room");
    if (room) room.setAttribute("aria-label", `${cfg.title} first-person player seat`);
    const playerSelect = $("tablePlayerCount");
    if (playerSelect && gameType === "spades") {
      playerSelect.value = "4";
      playerSelect.hidden = true;
      setText("tablePlayerCountLabel", "Classic Partners");
      setText("tableCreateHint", "4 players • 2 teams • room code made automatically.");
      setText("tableCreateButton", "Start Classic Table");
      const steps = $("tableQuickSteps");
      if (steps) steps.innerHTML = "<span>1. Start</span><span>2. Share</span><span>3. Play</span>";
    }
  }

  function applySeatCapacity(playerCount) {
    const count = Math.min(4, Math.max(1, Number(playerCount || 2)));
    document.querySelector(".card-seat-top")?.toggleAttribute("hidden", count < 2);
    document.querySelector(".card-seat-left")?.toggleAttribute("hidden", count < 3);
    document.querySelector(".card-seat-right")?.toggleAttribute("hidden", count < 4);
  }

  async function listRooms() {
    const list = $("tableRoomList"); if (!list) return;
    try {
      const sb = await getClient();
      const { data, error } = await sb.from("game_rooms").select("id,room_code,game_type,status,max_players,created_at").eq("game_type", gameType).in("status", ["waiting", "playing"]).order("created_at", { ascending: false }).limit(10);
      if (error) throw error;
      if (!data?.length) { list.innerHTML = `<div class="hw-leaderboard-empty">No open ${safeText(gameType)} tables yet. Create one.</div>`; return; }
      list.innerHTML = data.map((room) => `<article class="room-row"><div><strong>${safeText(room.room_code,"ROOM")}</strong><span>${safeText(room.status,"waiting")} • ${safeText(room.max_players,2)} seats</span></div><button class="games-btn" type="button" data-join-room="${room.id}">Join</button></article>`).join("");
      list.querySelectorAll("[data-join-room]").forEach((button) => button.addEventListener("click", () => joinRoomById(button.getAttribute("data-join-room"))));
    } catch (error) { list.innerHTML = `<div class="hw-leaderboard-empty">Could not load tables.</div>`; }
  }

  async function createRoom(event) {
    event.preventDefault();
    try {
      await requireUser(); const sb = await getClient(); const code = roomCode();
      setStatus(`Creating ${gameType} table...`);
      const { data, error } = await sb.rpc("create_table_game_room", { requested_code: code, requested_game_type: gameType });
      if (error || !data || data.ok === false) throw error || new Error(safeText(data?.error, "Room create failed."));
      activeRoom = data.room; activeState = data.state;
      const playerCount = gameType === "spades" ? 4 : requestedPlayerCount();
      if (Number(activeRoom.max_players) !== playerCount) {
        const { data: resizedRoom, error: resizeError } = await sb.from("game_rooms").update({ max_players: playerCount, updated_at: new Date().toISOString() }).eq("id", activeRoom.id).eq("host_id", currentUser.userId).select("*").maybeSingle();
        if (!resizeError && resizedRoom) activeRoom = resizedRoom;
      }
      setStatus(`Table ${activeRoom.room_code} ready for ${playerCount} player${playerCount === 1 ? "" : "s"}. Share the code.`);
      renderState(); startRefresh(); await listRooms();
    } catch (error) {
      const message = safeText(error?.message, "Please try again.");
      setStatus(message.includes("UNSUPPORTED_GAME_TYPE") ? "Spades tables are temporarily unavailable. Please refresh and retry." : `Table did not create: ${message}`);
    }
  }
  async function joinRoomByCode(event) {
    event.preventDefault();
    const input = $("tableRoomCodeInput"); const code = safeText(input?.value, "").replace(/\s+/g, "").toUpperCase();
    if (!code) return setStatus("Enter a room code first.");
    try {
      const sb = await getClient(); const { data, error } = await sb.from("game_rooms").select("id").eq("room_code", code).eq("game_type", gameType).maybeSingle();
      if (error || !data) throw new Error("Room code not found.");
      await joinRoomById(data.id); if (input) input.value = "";
    } catch (error) { setStatus(safeText(error?.message,"Room code not found.")); }
  }
  async function joinRoomById(roomId) {
    try {
      const user = await requireUser(); const sb = await getClient(); setStatus("Joining table...");
      const { data: room, error: roomError } = await sb.from("game_rooms").select("*").eq("id", roomId).maybeSingle();
      if (roomError || !room) throw new Error("Table not found.");
      const { data: players } = await sb.from("game_players").select("user_id,seat_number").eq("room_id", room.id).order("seat_number", { ascending: true });
      const already = (players || []).find((p) => p.user_id === user.userId);
      if (!already) {
        if ((players || []).length >= (room.max_players || GAME_CONFIG[gameType].maxPlayers)) throw new Error("That table is full.");
        const { error: joinError } = await sb.from("game_players").insert({ room_id: room.id, user_id: user.userId, seat_number: (players || []).length + 1, status: "ready", score: 0, bet: 0 });
        if (joinError) throw joinError;
      }
      const { data: stateRow } = await sb.from("game_state").select("state").eq("room_id", room.id).maybeSingle();
      const nextState = { ...(stateRow?.state || {}), status: "playing", updatedAt: new Date().toISOString(), log: [...(stateRow?.state?.log || []), `${currentUser.displayName || "Player"}: joined the table.`].slice(-16) };
      activeRoom = room; activeState = nextState; await saveState(room, nextState);
      setStatus("Joined table. You’re in your seat."); renderState(); startRefresh(); await listRooms();
    } catch (error) { setStatus(`Join failed: ${safeText(error?.message,"Please try again.")}`); }
  }
  async function saveState(room, nextState) {
    if (!room || !currentUser) return;
    const sb = await getClient(); scoreSubmissionId = null; activeState = nextState;
    const { error } = await sb.from("game_state").upsert({ room_id: room.id, state: nextState, updated_by: currentUser.userId }, { onConflict: "room_id" });
    if (error) throw error;
    await sb.from("game_rooms").update({ status: nextState.status || "playing", current_turn_user_id: currentUser.userId, updated_at: new Date().toISOString() }).eq("id", room.id);
  }
  async function refreshActiveRoom() {
    if (!activeRoom) return;
    try { const sb = await getClient(); const { data } = await sb.from("game_state").select("state").eq("room_id", activeRoom.id).maybeSingle(); if (data?.state) { activeState = data.state; renderState(); } } catch (_) {}
  }
  function startRefresh() { if (refreshTimer) clearInterval(refreshTimer); refreshTimer = setInterval(refreshActiveRoom, REFRESH_MS); }

  async function diceRound() {
    if (!activeRoom || !activeState) return setStatus("Create or join a Craps table first.");
    const previous = activeState.craps || { point: null, rollCount: 0 };
    const dice = [rand(6) + 1, rand(6) + 1];
    const total = dice[0] + dice[1];
    const pointBeforeRoll = Number(previous.point) || null;
    let point = pointBeforeRoll;
    let result = "rolling";
    let message = `Rolled ${total}. Roll again.`;

    if (!pointBeforeRoll) {
      if (total === 7 || total === 11) {
        result = "natural"; message = `${total} on the come-out — Pass Line wins.`; localScore = 100;
      } else if (total === 2 || total === 3 || total === 12) {
        result = "craps"; message = `${total} on the come-out — craps.`; localScore = 0;
      } else {
        point = total; result = "point"; message = `Point is ${total}. Roll ${total} again before a 7.`; localScore = total * 5;
      }
    } else if (total === pointBeforeRoll) {
      result = "made-point"; message = `${total} — point made. Pass Line wins.`; localScore = 150; point = null;
    } else if (total === 7) {
      result = "seven-out"; message = "Seven out. New come-out roll is next."; localScore = 0; point = null;
    } else {
      localScore = Math.max(Number(activeState.lastScore) || 0, total * 5);
    }

    activeState = { ...activeState, craps: { dice, point, pointBeforeRoll, total, result, message, rollCount: Number(previous.rollCount || 0) + 1 }, rolls: { ...(activeState.rolls || {}), [currentUser.userId]: dice }, lastResult: result, lastScore: localScore, log: [...(activeState.log||[]), `${currentUser.displayName||"Player"}: ${message}`].slice(-16), updatedAt:new Date().toISOString() };
    await saveState(activeRoom, activeState); renderState();
  }
  async function blackjackDeal() {
    if (!activeRoom || !activeState) return setStatus("Create or join a Blackjack table first.");
    const deck = makeCardDeck(), player=[deck.shift(),deck.shift()], dealer=[deck.shift(),deck.shift()]; localScore=handTotal(player);
    activeState={...activeState,blackjack:{deck,player,dealer,stood:false,result:"playing"},lastScore:localScore,updatedAt:new Date().toISOString()}; await saveState(activeRoom,activeState);renderState();
  }
  async function blackjackHit() {
    const bj=activeState?.blackjack;if(!bj||bj.result!=="playing")return setStatus("Deal a blackjack hand first.");
    const deck=[...bj.deck],player=[...bj.player,deck.shift()],total=handTotal(player),result=total>21?"bust":"playing";localScore=total>21?0:total*5;
    activeState={...activeState,blackjack:{...bj,deck,player,result},lastScore:localScore,updatedAt:new Date().toISOString()};await saveState(activeRoom,activeState);renderState();
  }
  async function blackjackStand() {
    const bj=activeState?.blackjack;if(!bj||bj.result!=="playing")return setStatus("Deal a blackjack hand first.");
    let deck=[...bj.deck],dealer=[...bj.dealer];while(handTotal(dealer)<17)dealer.push(deck.shift());
    const p=handTotal(bj.player),d=handTotal(dealer);let result="loss";if(d>21||p>d)result="win";else if(p===d)result="push";localScore=result==="win"?p*10:result==="push"?p*4:Math.max(1,p);
    activeState={...activeState,blackjack:{...bj,deck,dealer,stood:true,result},lastScore:localScore,updatedAt:new Date().toISOString()};await saveState(activeRoom,activeState);renderState();
  }
  async function pokerRound() {
    if (!activeRoom || !activeState) return setStatus("Create or join a Poker table first.");
    const deck=makeCardDeck(),hand=[deck.shift(),deck.shift()],community=[deck.shift(),deck.shift(),deck.shift(),deck.shift(),deck.shift()];
    localScore=hand.reduce((sum,c)=>sum+cardValue(c),0)*10+community.reduce((sum,c)=>sum+cardValue(c),0);
    activeState={...activeState,poker:{hand,community},lastScore:localScore,updatedAt:new Date().toISOString()};await saveState(activeRoom,activeState);renderState();
  }
  async function spadesRound() {
    if (!activeRoom || !activeState) return setStatus("Create or join a Spades table first.");
    const deck=makeCardDeck(); const hand=deck.splice(0,13).sort((a,b)=>a.suit.localeCompare(b.suit)||a.rank-b.rank); const lead=deck.shift();
    const spades=hand.filter((c)=>c.suit==="♠").length; const high=hand.filter((c)=>c.rank>=11).length; localScore=spades*20+high*10;
    activeState={...activeState,spades:{hand,lead},lastScore:localScore,updatedAt:new Date().toISOString()};await saveState(activeRoom,activeState);renderState();
  }

  async function submitScore() {
    if (!activeRoom || !activeState || !currentUser) return setStatus("Create or join a table first.");
    const score = Math.max(1, Number(activeState.lastScore || localScore || 1));
    const cfg = GAME_CONFIG[gameType];
    if (!scoreSubmissionId) {
      scoreSubmissionId = submissionId();
    }
    try {
      const sb = await getClient();
      const { data, error } = await sb.rpc("submit_game_run", {
        p_game_key: cfg.scoreKey,
        p_score: score,
        p_points_delta: 0,
        p_metadata: {
          room_code: activeRoom.room_code,
          source: "table_game",
          game_type: gameType,
          submission_id: scoreSubmissionId
        }
      });
      if (error) throw error;
      const awarded = Math.max(0, Number(data?.points_delta || 0));
      setStatus(data?.duplicate
        ? `Score already saved. No duplicate Cool Points added.`
        : `Score saved: ${score}. +${awarded} Cool Points.`);
      window.dispatchEvent(new CustomEvent("hyph:points:changed", { detail: { balance: Number(data?.balance || 0) } }));
    } catch (error) {
      setStatus(`Score save failed: ${safeText(error?.message, "Please retry.")}`);
    }
  }

  function renderState() {
    const stage=$("tableStage"),controls=$("tableControls"),log=$("tableLog"); if(!stage||!controls||!log)return;
    stage.dataset.game=gameType;
    if(!activeRoom||!activeState||!currentUser){document.body.classList.remove("table-game-active");setText("tableTurnBanner","CREATE OR JOIN A TABLE");stage.innerHTML=`<div class="table-empty-state"><b>TAKE YOUR SEAT</b><span>Start a table or enter a room code.</span></div>`;controls.innerHTML="";applySeatCapacity(requestedPlayerCount());return;}
    document.body.classList.add("table-game-active");
    applySeatCapacity(activeRoom.max_players || requestedPlayerCount());
    setText("tableActiveRoomCode",activeRoom.room_code||"ROOM");setText("tableModeLabel",GAME_CONFIG[gameType].title.replace(" Table", "").toUpperCase());
    if(gameType==="dice"){
      setText("tableTurnBanner","YOUR ROLL • PASS LINE");
      const craps=activeState.craps||{dice:[],point:null,total:null,result:"come-out",message:"Come-out roll: 7 or 11 wins; 2, 3, or 12 craps."};
      const activePoint=Number(craps.point)||null;
      const pointNumbers=[4,5,6,8,9,10];
      stage.innerHTML=`<div class="craps-table" aria-label="Standard Pass Line craps layout"><div class="craps-number-row">${pointNumbers.map((number)=>`<span class="craps-number${activePoint===number?" is-point":""}">${number}${activePoint===number?'<b>ON</b>':''}</span>`).join("")}</div><div class="craps-bet-row"><span>COME</span><span>FIELD<br><small>2 3 4 9 10 11 12</small></span></div><div class="craps-bet-row dont-pass"><span>DON’T PASS BAR 12</span></div><div class="craps-pass-line">PASS LINE</div><div class="craps-dice" aria-label="Last roll"><span>${dieFace(craps.dice?.[0])}</span><span>${dieFace(craps.dice?.[1])}</span></div><div class="craps-puck ${craps.point?'is-on':'is-off'}">${craps.point?`ON ${craps.point}`:"OFF"}</div><div class="craps-result"><strong>${craps.total?`ROLL ${craps.total}`:"COME-OUT"}</strong><small>${safeText(craps.message,"Roll the dice to start.")}</small></div></div>`;
      controls.innerHTML=`<button class="games-btn primary craps-roll-btn" type="button" data-action="dice-roll">Roll Dice</button>`;
    }else if(gameType==="blackjack"){
      setText("tableTurnBanner","BLACKJACK • MAKE YOUR MOVE");
      const bj=activeState.blackjack||{player:[],dealer:[],result:"waiting"};stage.innerHTML=`<div class="card-zone blackjack-zone"><div class="table-center-zone"><strong>Dealer • ${handTotal(bj.dealer||[])}</strong>${cardRow(bj.dealer||[])}</div><div class="player-rail-zone"><strong>Your Hand • ${handTotal(bj.player||[])}</strong>${cardRow(bj.player||[])}</div><div class="card-table-score">${safeText(bj.result,"waiting").toUpperCase()} • ${activeState.lastScore||0}</div></div>`;
      controls.innerHTML=`<button class="games-btn primary" type="button" data-action="blackjack-deal">Deal</button><button class="games-btn" type="button" data-action="blackjack-hit">Hit</button><button class="games-btn ghost" type="button" data-action="blackjack-stand">Stand</button>`;
    }else if(gameType==="poker"){
      setText("tableTurnBanner","POKER • CARDS IN THE CENTER");
      const poker=activeState.poker||{hand:[],community:[]};stage.innerHTML=`<div class="card-zone poker-zone"><div class="table-center-zone"><strong>Community Cards</strong>${cardRow(poker.community||[])}</div><div class="player-rail-zone"><strong>Your Hole Cards</strong>${cardRow(poker.hand||[])}</div><div class="card-table-score">Table Score ${activeState.lastScore||0}</div></div>`;controls.innerHTML=`<button class="games-btn primary" type="button" data-action="poker-round">Deal Poker Hand</button>`;
    }else{
      setText("tableTurnBanner","SPADES • FOLLOW SUIT");
      const spades=activeState.spades||{hand:[],lead:null};stage.innerHTML=`<div class="card-zone spades-zone"><div class="table-center-zone"><strong>Center Trick</strong>${cardRow(spades.lead?[spades.lead]:[])}</div><div class="player-rail-zone"><strong>Your Hand</strong>${cardRow(spades.hand||[])}</div><div class="card-table-score">Round Score ${activeState.lastScore||0}</div></div>`;controls.innerHTML=`<button class="games-btn primary" type="button" data-action="spades-round">Deal Spades Hand</button>`;
    }
    controls.querySelectorAll("[data-action]").forEach((button)=>button.addEventListener("click",async()=>{button.disabled=true;try{const action=button.getAttribute("data-action");if(action==="dice-roll")await diceRound();if(action==="blackjack-deal")await blackjackDeal();if(action==="blackjack-hit")await blackjackHit();if(action==="blackjack-stand")await blackjackStand();if(action==="poker-round")await pokerRound();if(action==="spades-round")await spadesRound();}finally{button.disabled=false;}}));
    log.innerHTML=(activeState.log||[]).slice().reverse().map((line)=>`<p>${safeText(line,"Table updated.")}</p>`).join("")||`<p>Duck Sauce: “Quiet table. Suspicious.”</p>`;
  }
  function leaveView(){activeRoom=null;activeState=null;if(refreshTimer)clearInterval(refreshTimer);document.body.classList.remove("table-game-active");setText("tableActiveRoomCode","None");renderState();setStatus("Left table view.");}
  async function boot(){const year=$("year");if(year)year.textContent=new Date().getFullYear();gameType=getGameType();applyGameCopy();applySeatCapacity(requestedPlayerCount());try{await requireUser();setStatus(`Logged in. Create or join a ${gameType} table.`);}catch(_){setStatus("Login required to create, join, and save scores.");}$("tableCreateForm")?.addEventListener("submit",createRoom);$("tablePlayerCount")?.addEventListener("change",()=>applySeatCapacity(requestedPlayerCount()));$("tableJoinForm")?.addEventListener("submit",joinRoomByCode);$("tableRefreshRooms")?.addEventListener("click",listRooms);$("tableSubmitScoreBtn")?.addEventListener("click",submitScore);$("tableLeaveBtn")?.addEventListener("click",leaveView);$("tableResetRoundBtn")?.addEventListener("click",async()=>{if(gameType==="dice")await diceRound();else if(gameType==="blackjack")await blackjackDeal();else if(gameType==="poker")await pokerRound();else await spadesRound();});await listRooms();setInterval(listRooms,30000);}
  document.addEventListener("DOMContentLoaded",boot);
})();
