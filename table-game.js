(function () {
  "use strict";

  const REFRESH_MS = 5000;
  const GAME_CONFIG = {
    dice: { title: "Craps Table", intro: "Regular Pass Line craps from a premium HYPHSWORLD player-seat table.", scoreKey: "01_dice", winPoints: 75, maxPlayers: 4 },
    blackjack: { title: "Blackjack Table", intro: "Player-seat blackjack with a clean felt view and simple hit / stand controls.", scoreKey: "01_blackjack", winPoints: 100, maxPlayers: 4 },
    poker: { title: "Poker Table", intro: "First-person poker table with your hand at the rail and community cards in the center.", scoreKey: "01_poker_beta", winPoints: 125, maxPlayers: 4 },
    spades: { title: "Spades Table", intro: "Four-seat Spades table with your hand in front, table action in the center, and one shared room code.", scoreKey: "01_spades_beta", winPoints: 125, maxPlayers: 4 }
  };

  let currentUser = null;
  let activeRoom = null;
  let activeState = null;
  let refreshTimer = null;
  let gameType = "dice";
  let localScore = 0;
  let scoreSubmissionId = null;
  let roomViewToken = 0;
  let roomListTimer = null;
  let pageHidden = false;
  let actionPending = false;
  let selectedSpadesCard = null;
  let spadesBidValue = 3;
  const rules = window.HWTableRules;

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

  async function getClient() {
    if (!window.HWAuth || typeof window.HWAuth.getClient !== "function") {
      throw new Error("HYPHSWORLD account service unavailable.");
    }
    const client = await window.HWAuth.getClient();
    if (!client || typeof client.from !== "function" || typeof client.rpc !== "function") {
      throw new Error("Supabase client unavailable.");
    }
    return client;
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
  function setGuestControls(enabled) {
    document.querySelectorAll("#tableCreateForm input, #tableCreateForm select, #tableCreateForm button, #tableJoinForm input, #tableJoinForm button").forEach((control) => {
      control.disabled = !enabled;
    });
    const submit = $("tableSubmitScoreBtn");
    const reset = $("tableResetRoundBtn");
    const leave = $("tableLeaveBtn");
    if (submit && !activeRoom) submit.disabled = true;
    if (reset && !activeRoom) reset.disabled = true;
    if (leave && !activeRoom) leave.disabled = true;
  }
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
    if (!currentUser) {
      list.innerHTML = '<div class="hw-leaderboard-empty">Login to view and join live tables.</div>';
      return;
    }
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
    if (actionPending) return setStatus("Wait for the current move to finish saving.");
    const requestToken = roomViewToken;
    try {
      await requireUser(); const sb = await getClient(); const code = roomCode();
      setStatus(`Creating ${gameType} table...`);
      const { data, error } = await sb.rpc("create_table_game_room", { requested_code: code, requested_game_type: gameType });
      if (error || !data || data.ok === false) throw error || new Error(safeText(data?.error, "Room create failed."));
      if (requestToken !== roomViewToken || !currentUser) return;
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
    if (actionPending) return setStatus("Wait for the current move to finish saving.");
    const input = $("tableRoomCodeInput"); const code = safeText(input?.value, "").replace(/\s+/g, "").toUpperCase();
    if (!code) return setStatus("Enter a room code first.");
    try {
      const sb = await getClient(); const { data, error } = await sb.from("game_rooms").select("id").eq("room_code", code).eq("game_type", gameType).maybeSingle();
      if (error || !data) throw new Error("Room code not found.");
      await joinRoomById(data.id); if (input) input.value = "";
    } catch (error) { setStatus(safeText(error?.message,"Room code not found.")); }
  }
  async function joinRoomById(roomId) {
    if (actionPending) return setStatus("Wait for the current move to finish saving.");
    const requestToken = roomViewToken;
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
      if (requestToken !== roomViewToken || !currentUser || currentUser.userId !== user.userId) return;
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
    if (!activeRoom || actionPending) return;
    const roomId = activeRoom.id;
    const requestToken = roomViewToken;
    try {
      const sb = await getClient();
      const { data } = await sb.from("game_state").select("state").eq("room_id", roomId).maybeSingle();
      if (actionPending || requestToken !== roomViewToken || !activeRoom || activeRoom.id !== roomId) return;
      if (data?.state) { activeState = data.state; renderState(); }
    } catch (_) {}
  }
  function stopRoomRefresh() {
    roomViewToken += 1;
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = null;
  }
  function startRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(refreshActiveRoom, REFRESH_MS);
  }

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
    if (activeState.blackjack?.result === "playing") return setStatus("Finish this hand with Hit or Stand first.");
    const deck = makeCardDeck(), player=[deck.shift(),deck.shift()], dealer=[deck.shift(),deck.shift()]; localScore=handTotal(player);
    const p = handTotal(player), d = handTotal(dealer);
    const result = p === 21 || d === 21 ? (p === d ? "push" : p === 21 ? "win" : "loss") : "playing";
    activeState={...activeState,blackjack:{deck,player,dealer,stood:false,result,ownerUserId:currentUser.userId},lastScore:result === "win" ? 210 : result === "playing" ? 0 : p,updatedAt:new Date().toISOString()}; await saveState(activeRoom,activeState);renderState();
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
    if (!rules.pokerActions(activeState.poker).deal) return setStatus("Finish the current hand before dealing again.");
    localScore = 0;
    activeState={...activeState,poker:{...rules.pokerStart(),ownerUserId:currentUser.userId},lastScore:0,updatedAt:new Date().toISOString()};await saveState(activeRoom,activeState);renderState();
  }
  async function spadesRound() {
    if (!activeRoom || !activeState) return setStatus("Create or join a Spades table first.");
    if (activeState.spades?.version === 2 && activeState.spades.phase !== "done") return setStatus("Finish bidding and playing this hand first.");
    selectedSpadesCard = null; localScore = 0;
    activeState={...activeState,spades:{...rules.spadesStart(),ownerUserId:currentUser.userId},lastScore:0,updatedAt:new Date().toISOString()};await saveState(activeRoom,activeState);renderState();
  }

  function controlsOwned(state) { return !state?.ownerUserId || state.ownerUserId === currentUser?.userId; }
  function actionButton(action, label, enabled, primary) {
    return `<button class="games-btn${primary ? " primary" : ""}" type="button" data-action="${action}"${enabled && !actionPending ? "" : " disabled"}>${label}</button>`;
  }
  function actionBar() {
    const ready = Boolean(activeRoom && currentUser && activeState);
    if (gameType === "poker") {
      const poker = activeState?.poker, legal = rules.pokerActions(poker), own = controlsOwned(poker);
      return actionButton("poker-round", "Deal / New Hand", ready && legal.deal, true) +
        actionButton("poker-check", "Check / Hold", ready && own && legal.check) +
        actionButton("poker-call", `Call${poker?.toCall ? " " + poker.toCall : ""}`, ready && own && legal.call, true) +
        actionButton("poker-bet", "Bet 20", ready && own && legal.bet) +
        actionButton("poker-raise", "Raise +20", ready && own && legal.raise) +
        actionButton("poker-fold", "Fold", ready && own && legal.fold);
    }
    if (gameType === "spades") {
      const state = activeState?.spades, live = state?.version === 2 && state.phase !== "done", own = controlsOwned(state);
      const bidding = ready && own && state?.phase === "bid" && !actionPending;
      return actionButton("spades-round", "Deal / New Hand", ready && !live, true) +
        `<label class="table-bid-label" for="tableSpadesBid">Bid (0 = Nil)<select id="tableSpadesBid"${bidding ? "" : " disabled"}>${Array.from({length:14},(_,i)=>`<option value="${i}"${i===spadesBidValue ? " selected" : ""}>${i === 0 ? "0 - Nil" : i}</option>`).join("")}</select></label>` +
        actionButton("spades-bid", "Confirm Bid", bidding) +
        actionButton("spades-play", "Play Card", ready && own && state?.phase === "play" && rules.legalCards(state,0).includes(selectedSpadesCard), true);
    }
    if (gameType === "blackjack") {
      const bj = activeState?.blackjack, live = bj?.result === "playing", own = controlsOwned(bj);
      return actionButton("blackjack-deal", "Deal / New Hand", ready && !live, true) + actionButton("blackjack-hit", "Hit", ready && own && live) + actionButton("blackjack-stand", "Stand / Hold", ready && own && live);
    }
    return actionButton("dice-roll", "Roll Dice", ready, true);
  }
  async function dispatchAction(action) {
    if (actionPending || !activeRoom || !activeState || !currentUser) return;
    const hand = activeState[gameType];
    if (!/^(poker-round|spades-round|blackjack-deal|dice-roll)$/.test(action) && !controlsOwned(hand)) return setStatus("The seat that dealt this shared practice hand controls its moves.");
    const snapshot = JSON.parse(JSON.stringify(activeState)), room = activeRoom, token = roomViewToken;
    const card = selectedSpadesCard, bid = Number($("tableSpadesBid")?.value);
    actionPending = true;
    $("tableControls")?.querySelectorAll("button, select").forEach(button => { button.disabled = true; });
    try {
      if(action === "dice-roll") await diceRound();
      else if(action === "blackjack-deal") await blackjackDeal();
      else if(action === "blackjack-hit") await blackjackHit();
      else if(action === "blackjack-stand") await blackjackStand();
      else if(action === "poker-round") await pokerRound();
      else if(action === "spades-round") await spadesRound();
      else if(action.startsWith("poker-")) {
        const poker = rules.pokerMove(activeState.poker, action.slice(6));
        localScore = poker.phase === "done" ? poker.stack : 0;
        await saveState(room,{...activeState,poker,lastScore:localScore});
      } else if(action === "spades-bid" || action === "spades-play") {
        const spades = action === "spades-bid" ? rules.spadesBid(activeState.spades,bid) : rules.spadesPlay(activeState.spades,card);
        selectedSpadesCard = null; localScore = spades.phase === "done" ? Math.max(0,spades.scores[0]) : 0;
        await saveState(room,{...activeState,spades,lastScore:localScore});
      }
    } catch(error) {
      if (token === roomViewToken && activeRoom?.id === room.id) { activeState = snapshot; setStatus(`Move not saved: ${safeText(error?.message,"Please retry.")}`); }
    } finally {
      actionPending = false;
      if(token === roomViewToken && activeRoom?.id === room.id) renderState();
    }
  }

  async function submitScore() {
    if (actionPending) return setStatus("Wait for the current move to finish saving.");
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
        : data?.points_delta ? `Score saved: ${score}. +${awarded} Cool Points.` : `Practice score saved: ${score}. Player-reported results earn no Cool Points.`);
      window.dispatchEvent(new CustomEvent("hyph:points:changed", { detail: { balance: Number(data?.balance || 0) } }));
    } catch (error) {
      setStatus(`Score save failed: ${safeText(error?.message, "Please retry.")}`);
    }
  }

  function renderState() {
    const stage=$("tableStage"),controls=$("tableControls"),log=$("tableLog"); if(!stage||!controls||!log)return;
    stage.dataset.game=gameType;
    if(!activeRoom||!activeState||!currentUser){resetTableHud();return;}
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
      const bj=activeState.blackjack||{player:[],dealer:[],result:"waiting"};
      const hidden = bj.result === "playing";
      const dealerCards = hidden ? `<div class="hw-card-row">${cardHtml(bj.dealer[0])}<span class="hw-card card-back" aria-label="Dealer hole card hidden">?</span></div>` : cardRow(bj.dealer);
      stage.innerHTML=`<div class="card-zone blackjack-zone"><div class="table-center-zone"><strong>Dealer • ${hidden ? "Hole card hidden" : handTotal(bj.dealer||[])}</strong>${dealerCards}</div><div class="player-rail-zone"><strong>Your Hand • ${handTotal(bj.player||[])}</strong>${cardRow(bj.player||[])}</div><div class="card-table-score">${safeText(bj.result,"waiting").toUpperCase()} • ${activeState.lastScore||0}</div></div>`;
      controls.innerHTML=`<button class="games-btn primary" type="button" data-action="blackjack-deal">Deal</button><button class="games-btn" type="button" data-action="blackjack-hit">Hit</button><button class="games-btn ghost" type="button" data-action="blackjack-stand">Stand</button>`;
    }else if(gameType==="poker"){
      const poker=activeState.poker?.version === 2 ? activeState.poker : null;
      setText("tableTurnBanner", `POKER • ${poker?.phase?.toUpperCase() || "READY TO DEAL"}`);
      stage.innerHTML=`<div class="card-zone poker-zone"><div class="table-center-zone"><strong>Community Cards</strong>${cardRow(poker?.community||[])}<span>CPU ${poker?.phase === "done" ? cardRow(poker.cpu) : "• cards hidden"}</span></div><div class="player-rail-zone"><strong>Practice Hand</strong>${cardRow(poker?.hand||[])}</div><div class="card-table-score">${safeText(poker?.message,"Deal to start Hold'em practice against CPU.")}<br>Practice chips: ${poker?.stack ?? 1000} • CPU: ${poker?.cpuStack ?? 1000} • Pot: ${poker?.pot ?? 0}<br>Shared room practice: the dealing seat controls this hand. No real money or Cool Points wagered.</div></div>`;
    }else{
      const spades=activeState.spades?.version === 2 ? activeState.spades : null;
      setText("tableTurnBanner",`SPADES • ${spades?.phase === "bid" ? "CHOOSE YOUR BID" : spades?.phase === "play" ? "SELECT A CARD" : "READY TO DEAL"}`);
      const legal = spades?.phase === "play" && controlsOwned(spades) ? rules.legalCards(spades,0) : [];
      const hand = (spades?.hands[0]||[]).map((card,i)=>`<button type="button" class="table-card-choice${selectedSpadesCard===i ? " is-selected" : ""}" data-spades-card="${i}" aria-label="${rankLabel(card.rank)} ${card.suit}" aria-pressed="${selectedSpadesCard===i}"${legal.includes(i) && !actionPending ? "" : " disabled"}>${cardHtml(card)}</button>`).join("");
      const trick = spades?.trick.length ? spades.trick : spades?.lastTrick || [];
      stage.innerHTML=`<div class="card-zone spades-zone"><div class="table-center-zone"><strong>${spades?.trick.length ? "Current Trick" : "Last Trick"}</strong>${cardRow(trick.map(p=>p.card))}</div><div class="player-rail-zone"><strong>Practice Hand • tap a legal card, then Play Card</strong><div class="hw-card-row">${hand}</div></div><div class="card-table-score">${safeText(spades?.message,"Deal, confirm a bid, then follow suit. You + CPU 2 versus CPU 1 + CPU 3.")}<br>Bids: ${(spades?.bids||[]).map(b=>b===null ? "?" : b).join(" / ")} • Tricks: ${(spades?.tricks||[]).join(" / ")}<br>Shared room CPU practice: the dealing seat controls the hand.</div></div>`;
      stage.querySelectorAll("[data-spades-card]").forEach(button=>button.addEventListener("click",()=>{
        if (actionPending) return;
        selectedSpadesCard=Number(button.dataset.spadesCard);renderState();
        stage.querySelector(`[data-spades-card="${selectedSpadesCard}"]`)?.focus({preventScroll:true});
      }));
    }
    controls.innerHTML = actionBar();
    $("tableSpadesBid")?.addEventListener("change",event=>{ spadesBidValue=Number(event.target.value); });
    const liveHand = gameType === "blackjack" ? activeState.blackjack?.result === "playing" : ["poker","spades"].includes(gameType) && activeState[gameType]?.version === 2 && activeState[gameType].phase !== "done";
    $("tableResetRoundBtn").disabled = actionPending || liveHand;
    $("tableSubmitScoreBtn").disabled = actionPending || liveHand || !activeState.lastScore || !controlsOwned(activeState[gameType]);
    $("tableLeaveBtn").disabled = actionPending;
    controls.querySelectorAll("[data-action]").forEach(button=>button.addEventListener("click",()=>dispatchAction(button.dataset.action)));
    log.innerHTML=(activeState.log||[]).slice().reverse().map((line)=>`<p>${safeText(line,"Table updated.")}</p>`).join("")||`<p>Duck Sauce: “Quiet table. Suspicious.”</p>`;
  }
  function resetTableHud() {
    document.body.classList.remove("table-game-active");
    setText("tableActiveRoomCode", "None");
    setText("tableTurnBanner", "CREATE OR JOIN A TABLE");
    setText("tableSelfSeatName", currentUser?.displayName || "YOUR SEAT");
    const stage = $("tableStage");
    const controls = $("tableControls");
    const log = $("tableLog");
    if (stage) {
      stage.dataset.game = gameType;
      stage.innerHTML = '<div class="table-empty-state"><b>TAKE YOUR SEAT</b><span>Start a table or enter a room code.</span></div>';
    }
    if (controls) controls.innerHTML = actionBar();
    if (log) log.innerHTML = '<p>Duck Sauce: “Pick a table. I’m watching the points.”</p>';
    document.querySelectorAll(".card-seat").forEach((seat) => seat.classList.remove("is-active", "is-playing", "is-ready"));
    applySeatCapacity(requestedPlayerCount());
    setGuestControls(Boolean(currentUser));
  }

  function leaveView(options) {
    const signedOut = Boolean(options?.signedOut);
    stopRoomRefresh();
    activeRoom = null;
    activeState = null;
    localScore = 0;
    scoreSubmissionId = null;
    resetTableHud();
    setStatus(signedOut ? "Login required to create, join, and save scores." : "Left table view. Open tables are still listed.");
  }

  async function boot() {
    const year = $("year");
    if (year) year.textContent = new Date().getFullYear();
    gameType = getGameType();
    applyGameCopy();
    applySeatCapacity(requestedPlayerCount());
    try {
      await requireUser();
      setGuestControls(true);
      setStatus(`Logged in. Create or join a ${gameType} table.`);
    } catch (_) {
      currentUser = null;
      resetTableHud();
      setGuestControls(false);
      setStatus("Login required to create, join, and save scores.");
    }
    resetTableHud();
    $("tableCreateForm")?.addEventListener("submit", createRoom);
    $("tablePlayerCount")?.addEventListener("change", () => applySeatCapacity(requestedPlayerCount()));
    $("tableJoinForm")?.addEventListener("submit", joinRoomByCode);
    $("tableRefreshRooms")?.addEventListener("click", listRooms);
    $("tableSubmitScoreBtn")?.addEventListener("click", submitScore);
    $("tableLeaveBtn")?.addEventListener("click", () => leaveView());
    $("tableResetRoundBtn")?.addEventListener("click", () => dispatchAction(({dice:"dice-roll",blackjack:"blackjack-deal",poker:"poker-round",spades:"spades-round"})[gameType]));

    document.addEventListener("hyph:auth-state-changed", async (event) => {
      if (event?.detail?.event === "SIGNED_OUT") {
        currentUser = null;
        leaveView({ signedOut: true });
        setGuestControls(false);
        const authLink = $("tableAuthLink");
        if (authLink) { authLink.textContent = "Create ID"; authLink.href = "auth.html"; }
        await listRooms();
        return;
      }
      try {
        await requireUser();
        setGuestControls(true);
        await listRooms();
      } catch (_) {}
    });

    window.addEventListener("pagehide", () => {
      pageHidden = true;
      stopRoomRefresh();
      if (roomListTimer) clearInterval(roomListTimer);
      roomListTimer = null;
    });
    window.addEventListener("pageshow", async (event) => {
      pageHidden = false;
      if (!event.persisted) return;
      const requestToken = roomViewToken;
      const previousUserId = currentUser?.userId;
      let user = null;
      try { user = await window.HWAuth?.getCurrentUser(); } catch (_) {}
      if (pageHidden || requestToken !== roomViewToken) return;
      if (!user?.userId || (previousUserId && previousUserId !== user.userId)) {
        currentUser = user?.userId ? user : null;
        leaveView({ signedOut: !currentUser });
      } else {
        currentUser = user;
        setGuestControls(true);
        if (activeRoom) { startRefresh(); await refreshActiveRoom(); }
      }
      if (pageHidden) return;
      if (!roomListTimer) roomListTimer = setInterval(listRooms, 30000);
      await listRooms();
    });
    await listRooms();
    if (!pageHidden && !roomListTimer) roomListTimer = setInterval(listRooms, 30000);
  }
  document.addEventListener("DOMContentLoaded",boot);
})();
