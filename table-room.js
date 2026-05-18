(function () {
  "use strict";

  const POKER_PREVIEWS = [
    { label: "Two Pair", board: ["A♠", "Q♠", "9♦", "A♦", "10♦"], player: ["4♥", "3♠"], cpu: [["K♣", "K♦"], ["7♠", "7♥"], ["J♣", "8♦"], ["5♣", "5♥"], ["2♦", "2♣"]] },
    { label: "Flush Draw", board: ["K♠", "Q♠", "10♠", "8♣", "5♠"], player: ["A♠", "3♠"], cpu: [["9♥", "9♣"], ["6♦", "6♣"], ["J♥", "4♦"], ["Q♦", "2♣"], ["7♣", "7♦"]] },
    { label: "Pair", board: ["9♣", "9♦", "7♥", "4♠", "2♣"], player: ["A♥", "K♦"], cpu: [["3♣", "3♦"], ["8♠", "8♥"], ["10♣", "6♦"], ["Q♥", "5♣"], ["J♦", "2♠"]] },
    { label: "High Card", board: ["A♥", "J♣", "8♦", "6♠", "3♥"], player: ["K♠", "Q♦"], cpu: [["4♥", "4♣"], ["5♠", "5♦"], ["10♥", "2♦"], ["9♠", "7♦"], ["6♣", "3♣"]] }
  ];

  const HIT_CARDS = ["2♥", "5♦", "8♠", "J♣", "Q♥", "3♦", "7♣"];
  const DOMINO_SETS = [["6|6", "6|4", "5|5", "3|2", "0|6"], ["5|4", "4|4", "6|1", "2|2", "0|3"], ["3|6", "1|1", "5|0", "4|2", "6|2"], ["0|0", "2|5", "3|3", "1|6", "4|5"]];

  let mode = "poker";
  let roomId = "";
  let roomCode = "Preview";
  let previewIndex = 0;
  let expandedSeats = false;
  let currentHand = null;
  let currentPlayerCards = [];
  let cpuCards = [];
  let cpuBet = "READY";
  let hasAutoDealt = false;
  let player = { name: "Player Seat", avatar: "🧢", points: 0 };

  function $(id) { return document.getElementById(id); }
  function toast(text, bad) { const el = $("tableToast"); if (!el) return; el.textContent = text; el.style.display = "block"; el.style.background = bad ? "linear-gradient(135deg,#ff6b6b,#ffd166)" : "linear-gradient(135deg,#75ff75,#dfff75)"; clearTimeout(window.__tableToastTimer); window.__tableToastTimer = setTimeout(() => { el.style.display = "none"; }, 2600); }
  function setText(id, value) { const el = $(id); if (el) el.textContent = String(value); }
  function roomParam() { const params = new URLSearchParams(window.location.search); return params.get("room") || params.get("roomId") || ""; }

  async function getSupabaseClient() { if (!window.HWAuth || typeof window.HWAuth.getClient !== "function") return null; const maybeClient = window.HWAuth.getClient(); const client = maybeClient && typeof maybeClient.then === "function" ? await maybeClient : maybeClient; return client && typeof client.from === "function" ? client : null; }
  async function getCurrentUser() { if (!window.HWAuth || typeof window.HWAuth.getCurrentUser !== "function") return null; try { return await window.HWAuth.getCurrentUser(); } catch (error) { return null; } }
  async function refreshBalance() { try { if (window.HWPoints && typeof window.HWPoints.refresh === "function") await window.HWPoints.refresh(); if (window.HWPoints && typeof window.HWPoints.get === "function") { player.points = window.HWPoints.get(); setText("tableBalance", player.points); } } catch (error) {} }

  async function rpc(name, args) { const client = await getSupabaseClient(); if (!client || typeof client.rpc !== "function") return null; const { data, error } = await client.rpc(name, args || {}); if (error) throw error; return data || null; }
  async function rewardPreview(action) { try { const data = await rpc("preview_hand_reward", { p_room_id: roomId || null, p_action: action }); if (data && typeof data.balance === "number") { player.points = data.balance; setText("tableBalance", data.balance); } if (window.HWPoints && typeof window.HWPoints.refresh === "function") await window.HWPoints.refresh(); return data; } catch (error) { toast(error.message || "Preview reward missed.", true); return null; } }
  async function cpuReact(action) { try { return await rpc("cpu_hand_action", { p_room_id: roomId || null, p_player_action: action }); } catch (error) { toast(error.message || "CPU missed its turn.", true); return null; } }

  function normalizeMode(value) { const text = String(value || "poker").toLowerCase(); if (text === "dominos" || text === "dominoes" || text === "domino") return "dominoes"; return "poker"; }
  function modeLabel() { return mode === "dominoes" ? "Dominoes" : "Poker"; }
  function cardHtml(card) { return '<span class="play-card">' + card + '</span>'; }
  function miniCards(cards) { return '<div class="seat-cards">' + cards.map((card) => '<span class="seat-mini-card">' + card + '</span>').join("") + '</div>'; }
  function seatHtml(cls, avatar, name, points, bet, cards) { return '<article class="table-seat ' + cls + '"><div class="seat-head"><span class="seat-avatar">' + avatar + '</span><div><div class="seat-name">' + name + '</div><div class="seat-points">' + points + ' CP</div></div></div><span class="seat-bet">● ' + bet + '</span>' + miniCards(cards || ["▢", "▢"]) + '</article>'; }

  function simplifyActions() {
    const preview = $("previewDealBtn");
    const hold = $("holdBtn");
    const reset = $("resetTableBtn");
    const hit = $("hitBtn");
    const stay = $("stayBtn");
    if (preview) { preview.textContent = "New Hand"; preview.classList.add("secondary", "is-secondary-action"); }
    if (hold) hold.classList.add("is-secondary-action");
    if (reset) reset.classList.add("is-secondary-action");
    if (hit) { hit.classList.remove("secondary"); hit.textContent = "Hit"; }
    if (stay) { stay.classList.remove("secondary"); stay.textContent = "Stay"; }
  }

  function addToggleButton() { const actions = document.querySelector(".table-actions"); if (!actions || $("toggleSeatsBtn")) return; const btn = document.createElement("button"); btn.className = "table-btn secondary is-secondary-action"; btn.type = "button"; btn.id = "toggleSeatsBtn"; btn.textContent = "Add CPUs"; btn.addEventListener("click", function () { expandedSeats = !expandedSeats; btn.textContent = expandedSeats ? "1 CPU" : "Add CPUs"; if (mode === "poker" && currentHand) renderPokerTable(true); }); actions.insertBefore(btn, actions.children[3] || null); }
  function renderHeader(room) { const label = modeLabel(); setText("tableTitle", label + " Table"); setText("roomMode", "Auto Deal"); setText("roomCode", room?.room_code || room?.roomCode || roomCode || roomId || "Preview"); setText("previewPot", "0 CP"); setText("tableIntro", label + " opens with cards already on the felt. Hit or Stay to play. Cool Points are preview rewards only."); setText("tableStatus", label + " loading. First hand will auto-deal."); setText("cpuStatus", "CPU 01 is seated."); setText("playerStatus", "You are seated."); }
  async function renderPlayer() { const user = await getCurrentUser(); if (user) { player.name = user.displayName || user.username || "Player Seat"; player.avatar = user.avatarIcon || "🧢"; setText("playerName", player.name); setText("playerAvatar", player.avatar); } await refreshBalance(); }

  function renderPokerTable(keepToast) { const hand = currentHand || POKER_PREVIEWS[0]; const zone = $("playZone"); if (!zone) return; const mainCpuCards = cpuCards.length ? cpuCards : hand.cpu[0]; const extraSeats = expandedSeats ? seatHtml('seat-left-top', '🛸', 'CPU 02', 200, 'D 200', hand.cpu[1]) + seatHtml('seat-right-top', '😎', 'CPU 03', 99999, 'D 200', hand.cpu[2]) + seatHtml('seat-left-bottom', '👾', 'CPU 04', 200, 'D 200', hand.cpu[3]) + seatHtml('seat-right-bottom', '🧪', 'CPU 05', 200, 'D 200', hand.cpu[4]) : '<div class="empty-seat empty-left">+ CPU</div><div class="empty-seat empty-right">+ CPU</div>'; zone.innerHTML = '<div class="poker-table-shell ' + (expandedSeats ? 'is-expanded' : 'is-simple') + '"><div class="table-felt-logo">HW</div>' + seatHtml('seat-top', '🤖', 'CPU 01', 200, cpuBet, mainCpuCards) + extraSeats + seatHtml('seat-player', player.avatar, player.name, player.points, 'Your Turn', currentPlayerCards) + '<div class="community-zone"><div class="hand-badge">' + hand.label + '</div><div class="community-cards">' + hand.board.map(cardHtml).join("") + '</div><div class="pot-badge">Preview Rewards Active</div></div></div>'; if (!keepToast) toast("Hand dealt. Hit or Stay.", false); }
  async function renderPokerPreview(keepIndex, silent) { currentHand = POKER_PREVIEWS[previewIndex % POKER_PREVIEWS.length]; currentPlayerCards = currentHand.player.slice(); cpuCards = currentHand.cpu[0].slice(); cpuBet = "READY"; renderPokerTable(!!silent); setText("tableStatus", "Hand is live. Choose Hit or Stay."); setText("cpuStatus", "CPU 01 is watching your move."); setText("playerStatus", "Your turn. Hit or Stay."); await rewardPreview("start_hand"); if (!keepIndex) previewIndex += 1; }
  function renderDominoPreview() { const tiles = DOMINO_SETS[previewIndex % DOMINO_SETS.length]; const zone = $("playZone"); if (!zone) return; zone.innerHTML = '<div class="domino-table-shell"><div class="domino-board"><div class="domino-label">CPU Tray</div><div class="domino-rack"><span class="domino-tile">▦</span><span class="domino-tile">▦</span><span class="domino-tile">▦</span></div><div class="domino-label">Center Chain</div><div class="domino-chain">' + tiles.map((tile) => '<span class="domino-tile">' + tile + '</span>').join("") + '</div><div class="domino-label">' + player.name + ' Tray</div><div class="domino-rack"><span class="domino-tile">6|6</span><span class="domino-tile">5|4</span><span class="domino-tile">3|2</span></div></div></div>'; setText("tableStatus", "Domino preview staged. Domino controls come next."); setText("cpuStatus", "CPU stacks tiles and waits."); setText("playerStatus", "Preview tray loaded."); toast("Domino preview staged.", false); previewIndex += 1; }

  async function applyCpuReaction(action) { const cpu = await cpuReact(action); if (!cpu || !currentHand) return; if (cpu.cpuAction === "hit" && cpu.cpuCard) cpuCards.push(cpu.cpuCard); cpuBet = String(cpu.cpuAction || "wait").toUpperCase(); renderPokerTable(true); setText("cpuStatus", cpu.cpuMood || "CPU 01 reacted."); toast((cpu.cpuMood || "CPU 01 reacted.") + (cpu.cpuCard ? " Card: " + cpu.cpuCard : ""), false); }
  async function handleGameAction(action) { if (mode === "dominoes") { toast("Domino controls come next.", true); return; } if (!currentHand) await renderPokerPreview(true, true); if (action === "hit") { const card = HIT_CARDS[(currentPlayerCards.length + previewIndex) % HIT_CARDS.length]; currentPlayerCards.push(card); renderPokerTable(true); setText("tableStatus", "Hit: drew " + card + ". CPU 01 is thinking..."); setText("playerStatus", "Hit accepted. Now choose Stay or Hit again."); await rewardPreview("hit"); await applyCpuReaction("hit"); return; } if (action === "hold") { setText("tableStatus", "Hold saved. CPU 01 is thinking..."); setText("playerStatus", "Holding current hand."); await rewardPreview("hold"); await applyCpuReaction("hold"); return; } if (action === "stay") { setText("tableStatus", "Stay: hand locked. CPU 01 is deciding..."); setText("playerStatus", "Stayed. Preview turn complete."); await rewardPreview("stay"); await applyCpuReaction("stay"); } }

  function resetPreview() { currentHand = null; currentPlayerCards = []; cpuCards = []; cpuBet = "READY"; const zone = $("playZone"); if (zone) zone.innerHTML = "<p>Dealing new hand...</p>"; setText("tableStatus", "New hand loading..."); window.setTimeout(function () { startPreview(true); }, 250); }
  function startPreview(silent) { if (mode === "dominoes") renderDominoPreview(); else renderPokerPreview(false, !!silent); }
  async function autoDeal() { if (hasAutoDealt) return; hasAutoDealt = true; window.setTimeout(function () { startPreview(true); }, 450); }
  async function loadRoom() { roomId = roomParam(); const client = await getSupabaseClient(); if (!roomId || !client) { mode = "poker"; renderHeader(null); await renderPlayer(); await autoDeal(); return; } try { const { data, error } = await client.from("game_rooms").select("id,room_code,game_type,status,created_at").eq("id", roomId).maybeSingle(); if (error) throw error; mode = normalizeMode(data?.game_type); roomCode = data?.room_code || roomId; renderHeader(data); await renderPlayer(); await autoDeal(); } catch (error) { mode = "poker"; renderHeader(null); await renderPlayer(); setText("tableStatus", "Safe auto-deal loaded. Room lookup missed, but gameplay stays on."); toast("Safe auto-deal loaded.", true); await autoDeal(); } }
  function bind() { const year = $("year"); if (year) year.textContent = new Date().getFullYear(); const preview = $("previewDealBtn"); const reset = $("resetTableBtn"); const hold = $("holdBtn"); const hit = $("hitBtn"); const stay = $("stayBtn"); simplifyActions(); if (preview) preview.addEventListener("click", function () { startPreview(false); }); if (reset) reset.addEventListener("click", resetPreview); if (hold) hold.addEventListener("click", function () { handleGameAction("hold"); }); if (hit) hit.addEventListener("click", function () { handleGameAction("hit"); }); if (stay) stay.addEventListener("click", function () { handleGameAction("stay"); }); addToggleButton(); }
  async function boot() { bind(); await loadRoom(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
