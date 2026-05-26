/* HYPHSWORLD Casino — Consumer-first single UI engine
   Enhances the existing casino.html layout.
   Adds earned-only casino logic, expanded rewards, regular reward visibility, and futuristic animated 3-D reward chart.
*/
(() => {
  "use strict";

  const SUPABASE_URL = "https://yuhxtdkhsltaqiagrtys.supabase.co";
  const SUPABASE_KEY = "sb_publishable_oYdN-75W3b7k3m1zLukI-A_BKWVDD5e";
  const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  const SAVE_KEY = "hyphsworld:casino:consumer:v3";
  const REWARD_REMINDER_KEY = "hyphsworld:reward:reminder:last";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const SLOT_SYMBOLS = [
    { key: "ramp", short: "RMP", label: "RAMP", weight: 10 },
    { key: "mic", short: "MIC", label: "MIC", weight: 10 },
    { key: "slap", short: "SLP", label: "SLAP", weight: 10 },
    { key: "key", short: "KEY", label: "CODE", weight: 7 },
    { key: "track", short: "TRK", label: "TRACK", weight: 7 },
    { key: "hyph", short: "HYP", label: "HYPOWER", weight: 8 },
    { key: "duck", short: "DS", label: "DUCK", weight: 6 },
    { key: "buck", short: "BCK", label: "BUCK", weight: 6 },
    { key: "diamond", short: "ICE", label: "ICE", weight: 8 },
    { key: "crown", short: "CRN", label: "CROWN", weight: 5 }
  ];

  const WHEEL_PRIZES = [
    { label: "+25", points: 25, message: "Wheel hit +25 reward progress." },
    { label: "DUCK", points: 8, message: "Duck Sauce bonus. +8 reward progress." },
    { label: "+100", points: 100, message: "Major wheel hit +100 reward progress." },
    { label: "CLUE", points: 50, message: "Vault clue hit. +50 reward progress." },
    { label: "MISS", points: 2, message: "Miss, but the system logged +2 progress." },
    { label: "+50", points: 50, message: "Wheel hit +50 reward progress." }
  ];

  const REWARDS = [
    { key: "slots_25", game: "slots", threshold: 25, tier: "Bronze", title: "Duck Slot Spark", detail: "Slots progress hit 25. First machine clue unlocked." },
    { key: "slots_50", game: "slots", threshold: 50, tier: "Silver", title: "Hidden Track Clue", detail: "Slots progress hit 50. Hidden track preview unlocked plus a shirt giveaway hint drops in your reward feed." },
    { key: "slots_100", game: "slots", threshold: 100, tier: "Gold", title: "Slot Vault Token", detail: "Slots progress hit 100. You unlock an exclusive song snippet and a vault token clue." },
    { key: "blackjack_25", game: "blackjack", threshold: 25, tier: "Bronze", title: "Dealer Read", detail: "Blackjack progress hit 25. Dealer pattern clue unlocked." },
    { key: "blackjack_50", game: "blackjack", threshold: 50, tier: "Silver", title: "Blackjack Backroom Code", detail: "Blackjack progress hit 50. Backroom code clue unlocked plus access to limited shirt drop windows." },
    { key: "blackjack_100", game: "blackjack", threshold: 100, tier: "Gold", title: "Backroom Invite", detail: "Blackjack progress hit 100. Backroom invite plus full exclusive song unlock progress activated." },
    { key: "wheel_25", game: "wheel", threshold: 25, tier: "Bronze", title: "Wheel Signal", detail: "Wheel progress hit 25. Bonus signal unlocked." },
    { key: "wheel_50", game: "wheel", threshold: 50, tier: "Silver", title: "Vault Wheel Bonus", detail: "Wheel progress hit 50. Bonus clue unlocked and rare shirt raffle eligibility enabled." },
    { key: "wheel_100", game: "wheel", threshold: 100, tier: "Gold", title: "Portal Spin Key", detail: "Wheel progress hit 100. Portal key clue unlocked with premium song unlock priority." },
    { key: "casino_100", game: "total", threshold: 100, tier: "Gold", title: "Secret Drop Trigger", detail: "Casino total progress hit 100. Secret drop trigger unlocked." },
    { key: "casino_250", game: "total", threshold: 250, tier: "Platinum", title: "Underground Pass", detail: "Total casino bank hit 250. Underground pass unlocked with merch cabinet access for shirt claims." },
    { key: "casino_500", game: "total", threshold: 500, tier: "Diamond", title: "Duck Sauce VIP Signal", detail: "Total casino bank hit 500. VIP signal unlocked with full exclusive song vault + shirt winner fast lane." }
  ];

  const casino = {
    client: null,
    user: null,
    game: "blackjack",
    balance: 500,
    bet: 25,
    streak: 0,
    deck: [],
    player: [],
    dealer: [],
    phase: "idle",
    progress: { blackjack: 0, slots: 0, wheel: 0 },
    rewards: {},
    lastWin: 0,
    lastPointAwardAt: 0
  };

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || localStorage.getItem("hyphsworld:casino:consumer:v2") || "null");
      if (!saved) return;
      casino.balance = Number.isFinite(saved.balance) ? saved.balance : casino.balance;
      casino.bet = Number.isFinite(saved.bet) ? saved.bet : casino.bet;
      casino.streak = Number.isFinite(saved.streak) ? saved.streak : casino.streak;
      casino.progress = { ...casino.progress, ...(saved.progress || {}) };
      casino.rewards = saved.rewards || {};
    } catch {}
  }

  function saveState() {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ balance: casino.balance, bet: casino.bet, streak: casino.streak, progress: casino.progress, rewards: casino.rewards, savedAt: new Date().toISOString() }));
  }

  function injectStyles() {
    if ($("#casinoConsumerStyles")) return;
    const style = document.createElement("style");
    style.id = "casinoConsumerStyles";
    style.textContent = `
      .consumer-reward-hud{margin:18px 0;padding:18px;border:2px solid rgba(57,255,20,.55);border-radius:28px;background:radial-gradient(circle at 8% 8%,rgba(255,43,214,.23),transparent 30%),radial-gradient(circle at 82% 18%,rgba(0,229,255,.18),transparent 34%),linear-gradient(135deg,rgba(0,0,0,.72),rgba(57,255,20,.08));box-shadow:0 22px 48px rgba(0,0,0,.42),0 0 32px rgba(57,255,20,.13);perspective:1200px;overflow:hidden;position:relative}.consumer-reward-hud:before{content:"";position:absolute;inset:-40%;background:conic-gradient(from 180deg,transparent,rgba(57,255,20,.18),rgba(255,43,214,.16),rgba(0,229,255,.16),transparent);animation:rewardOrbit 7s linear infinite;opacity:.45}.consumer-reward-hud>*{position:relative;z-index:1}.consumer-reward-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}.consumer-reward-kicker{color:var(--green,#39ff14);font-size:12px;font-weight:1000;letter-spacing:.16em;text-transform:uppercase}.consumer-reward-title{margin:2px 0 0;font-size:clamp(22px,4vw,38px);line-height:.92;text-transform:uppercase;text-shadow:3px 3px 0 rgba(255,43,214,.78),0 0 18px rgba(57,255,20,.22)}.consumer-login-pill{border-radius:999px;padding:10px 14px;color:#050505;background:linear-gradient(135deg,#ffe600,#39ff14,#00e5ff);font-weight:1000;font-size:12px;box-shadow:0 0 20px rgba(57,255,20,.22)}.consumer-progress-wrap{display:grid;gap:9px}.consumer-progress-line{height:15px;border-radius:999px;background:rgba(0,0,0,.48);border:1px solid rgba(255,255,255,.18);overflow:hidden}.consumer-progress-fill{height:100%;width:0%;border-radius:999px;background:linear-gradient(90deg,#39ff14,#ffe600,#ff2bd6,#00e5ff);box-shadow:0 0 20px rgba(57,255,20,.42);transition:width .35s ease}.reward-3d-chart{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:14px;transform-style:preserve-3d}.reward-orb-card{min-height:138px;border:1px solid rgba(255,255,255,.17);background:linear-gradient(155deg,rgba(255,255,255,.13),rgba(0,0,0,.44));border-radius:22px;padding:12px;position:relative;overflow:hidden;transform:rotateX(7deg) rotateY(-4deg);transition:.22s ease;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 18px 30px rgba(0,0,0,.28)}.reward-orb-card:hover{transform:rotateX(0deg) rotateY(0deg) translateY(-4px);border-color:rgba(57,255,20,.7)}.reward-orb-card.unlocked{border-color:rgba(57,255,20,.78);box-shadow:0 0 26px rgba(57,255,20,.17),0 20px 34px rgba(0,0,0,.32)}.reward-orb-card:before{content:"";position:absolute;right:-28px;top:-28px;width:82px;height:82px;border-radius:50%;background:radial-gradient(circle,#fff,#39ff14 28%,#00e5ff 58%,transparent 70%);filter:blur(.2px);opacity:.35}.reward-orb-card.unlocked:before{animation:orbPulse 1.9s ease-in-out infinite alternate;opacity:.9}.reward-tier{display:inline-flex;border-radius:999px;padding:5px 8px;background:linear-gradient(135deg,#39ff14,#ffe600,#ff2bd6);color:#050505;font:1000 10px/1 Arial;text-transform:uppercase;letter-spacing:.08em}.reward-orb-card strong{display:block;margin-top:9px;color:#fff;text-transform:uppercase;font-size:clamp(13px,2.2vw,18px);line-height:1.02}.reward-orb-card small{display:block;color:rgba(255,255,255,.72);font-family:system-ui,sans-serif;font-weight:800;margin-top:6px;line-height:1.25}.reward-orb-card .status{display:inline-block;margin-top:10px;border-radius:999px;padding:6px 9px;color:#050505;background:#ffe600;font-size:11px;font-weight:1000}.reward-orb-card.unlocked .status{background:#39ff14}.consumer-toast{position:fixed;left:50%;bottom:28px;z-index:12000;transform:translateX(-50%) translateY(18px);opacity:0;pointer-events:none;max-width:min(92vw,680px);border:2px solid rgba(57,255,20,.65);border-radius:999px;padding:13px 18px;color:#fff;background:linear-gradient(135deg,#071108,#17001f);box-shadow:0 18px 40px rgba(0,0,0,.48);font-weight:1000;transition:.22s ease}.consumer-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}.slot-reel.consumer-pop{animation:consumerPop .26s cubic-bezier(.2,1.35,.45,1) both}.reward-flash{animation:rewardFlash .7s ease both}@keyframes consumerPop{0%{transform:scale(.8) rotate(-2deg);opacity:.5}100%{transform:scale(1) rotate(0);opacity:1}}@keyframes rewardFlash{0%,100%{filter:none}45%{filter:drop-shadow(0 0 24px #ffe600) brightness(1.28)}}@keyframes rewardOrbit{to{transform:rotate(360deg)}}@keyframes orbPulse{from{transform:scale(.94);filter:blur(.6px)}to{transform:scale(1.12);filter:blur(0)}}@media(max-width:900px){.reward-3d-chart{grid-template-columns:repeat(2,1fr)}}@media(max-width:560px){.reward-3d-chart{grid-template-columns:1fr}.consumer-login-pill{width:100%;text-align:center}.reward-orb-card{min-height:120px}}
    `;
    document.head.append(style);
  }

  function loadScript(src) { return new Promise((resolve, reject) => { if (window.supabase?.createClient) return resolve(); const script = document.createElement("script"); script.src = src; script.async = true; script.onload = resolve; script.onerror = () => reject(new Error("Supabase library failed to load.")); document.head.append(script); }); }
  async function initSupabase() { try { if (!window.supabase?.createClient) await loadScript(SUPABASE_CDN); casino.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }); const { data } = await casino.client.auth.getUser(); casino.user = data?.user || null; casino.client.auth.onAuthStateChange((_event, session) => { casino.user = session?.user || null; renderRewardHud(); }); } catch (error) { console.warn("Casino auth check skipped:", error.message); } }
  function toast(message) { let box = $("#consumerToast"); if (!box) { box = document.createElement("div"); box.id = "consumerToast"; box.className = "consumer-toast"; document.body.append(box); } box.textContent = message; box.classList.add("show"); clearTimeout(box._timer); box._timer = setTimeout(() => box.classList.remove("show"), 3900); }
  function totalProgress() { return casino.progress.blackjack + casino.progress.slots + casino.progress.wheel; }
  function currentProgress() { return casino.game === "blackjack" ? casino.progress.blackjack : casino.game === "slots" ? casino.progress.slots : casino.progress.wheel; }
  function nextThreshold() { const progress = currentProgress(); if (progress < 25) return 25; if (progress < 50) return 50; if (progress < 100) return 100; return Math.ceil((progress + 1) / 100) * 100; }
  function injectRewardHud() { if ($("#consumerRewardHud")) return; const stats = $(".casino-bankroll") || $(".casino-stats") || $(".casino-title") || document.body.firstElementChild; if (!stats) return; const hud = document.createElement("section"); hud.id = "consumerRewardHud"; hud.className = "consumer-reward-hud"; stats.insertAdjacentElement("afterend", hud); }
  function renderRewardHud() { injectRewardHud(); const hud = $("#consumerRewardHud"); if (!hud) return; const progress = currentProgress(); const threshold = nextThreshold(); const pct = Math.max(0, Math.min(100, progress / threshold * 100)); const loginText = casino.user ? "Rewards saving to account" : "Free play — sign in to save rewards"; const gameTitle = casino.game === "blackjack" ? "Blackjack" : casino.game === "slots" ? "Duck Slots" : "Spin Wheel"; const visibleRewards = REWARDS.sort((a,b)=>(casino.rewards[b.key]?1:0)-(casino.rewards[a.key]?1:0) || a.threshold-b.threshold).slice(0,12); hud.innerHTML = `<div class="consumer-reward-top"><div><div class="consumer-reward-kicker">Reward Progress</div><h3 class="consumer-reward-title">${gameTitle}: ${progress} / ${threshold}</h3></div><div class="consumer-login-pill">${loginText}</div></div><div class="consumer-progress-wrap"><div class="consumer-progress-line"><div class="consumer-progress-fill" style="width:${pct}%"></div></div><div class="consumer-reward-kicker">Total Casino Bank: ${totalProgress()} • unlocks clues, codes, hidden tracks, shirt drops, exclusive songs, passes, VIP signals</div></div><div class="reward-3d-chart">${visibleRewards.map(reward => { const unlocked = Boolean(casino.rewards[reward.key]); return `<div class="reward-orb-card ${unlocked ? "unlocked" : "locked"}"><span class="reward-tier">${reward.tier}</span><strong>${reward.title}</strong><small>${reward.detail}</small><span class="status">${unlocked ? "Unlocked" : "Locked"}</span></div>`; }).join("")}</div>`; }
  function showRewardReminder(force=false) { const now = Date.now(); const last = Number(localStorage.getItem(REWARD_REMINDER_KEY) || 0); if (!force && now - last < 90000) return; localStorage.setItem(REWARD_REMINDER_KEY, String(now)); toast(`Rewards live: ${Object.keys(casino.rewards).length}/${REWARDS.length} unlocked • Casino bank ${totalProgress()}`); }
  function updateStats() { if ($("#balance")) $("#balance").textContent = casino.balance.toLocaleString(); if ($("#bet")) $("#bet").textContent = casino.bet.toLocaleString(); if ($("#streak")) $("#streak").textContent = casino.streak.toLocaleString(); renderRewardHud(); saveState(); }
  function setMessage(text) { const message = casino.game === "blackjack" ? $("#message") : casino.game === "slots" ? $("#slotsMessage") : $("#wheelMessage"); if (message) message.textContent = text; const announcer = $("#casinoAnnouncer"); if (announcer) announcer.textContent = `Duck Sauce: “${text}”`; }
  function unlockEligibleRewards() { let unlockedSomething = false; REWARDS.forEach(reward => { const progress = reward.game === "total" ? totalProgress() : casino.progress[reward.game]; if (progress >= reward.threshold && !casino.rewards[reward.key]) { casino.rewards[reward.key] = new Date().toISOString(); unlockedSomething = true; toast(`Unlocked: ${reward.title}`); } }); if (unlockedSomething) { $("#consumerRewardHud")?.classList.add("reward-flash"); setTimeout(() => $("#consumerRewardHud")?.classList.remove("reward-flash"), 800); } }
  async function maybeAwardAccountPoints(amount) { if (!casino.client || !casino.user || amount <= 0) return; const now = Date.now(); if (now - casino.lastPointAwardAt < 65000) return; casino.lastPointAwardAt = now; try { await casino.client.rpc("award_points", { p_amount: Math.max(1, Math.min(10, Math.floor(amount))), p_reason: "casino_play", p_metadata: { game: casino.game, source: "consumer_casino" } }); } catch (error) { console.warn("Account point award skipped:", error.message); } }
  function addProgress(game, points) { const safe = Math.max(0, Math.floor(points || 0)); if (!safe) return; casino.progress[game] = (casino.progress[game] || 0) + safe; unlockEligibleRewards(); renderRewardHud(); showRewardReminder(); maybeAwardAccountPoints(Math.min(10, safe)); }
  function switchGame(game) { casino.game = game; $$(".game-tab").forEach(tab => { const active = tab.dataset.game === game; tab.classList.toggle("active", active); tab.setAttribute("aria-selected", active ? "true" : "false"); }); $$(".game-view").forEach(view => view.classList.toggle("active", view.dataset.gameView === game)); const titleMap = { blackjack: "Blackjack Table", slots: "Duck Sauce Custom Slots", wheel: "Spin Wheel" }; const subMap = { blackjack: "Beat the dealer without going over 21.", slots: "Line up custom HYPHSWORLD symbols to trigger hidden rewards.", wheel: "Spin for bonus points, clues, and reward jumps." }; if ($("#activeGameTitle")) $("#activeGameTitle").textContent = titleMap[game] || "Casino"; if ($("#activeGameSubtext")) $("#activeGameSubtext").textContent = subMap[game] || "Play for rewards."; renderRewardHud(); showRewardReminder(); }
  function makeDeck() { const suits = ["♠", "♥", "♦", "♣"]; const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]; const deck = []; suits.forEach(suit => ranks.forEach(rank => deck.push({ suit, rank }))); for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; } return deck; }
  function cardValue(card) { if (card.rank === "A") return 11; if (["K", "Q", "J"].includes(card.rank)) return 10; return Number(card.rank); }
  function handScore(hand) { let score = hand.reduce((sum, card) => sum + cardValue(card), 0); let aces = hand.filter(card => card.rank === "A").length; while (score > 21 && aces > 0) { score -= 10; aces -= 1; } return score; }
  function renderCard(card, hidden = false) { const node = document.createElement("div"); node.className = hidden ? "card back deal-pop" : "card deal-pop"; if (hidden) { node.innerHTML = "<strong>?</strong><span>?</span>"; return node; } const red = ["♥", "♦"].includes(card.suit); if (red) node.classList.add("red-card"); node.innerHTML = `<strong>${card.rank}</strong><span>${card.suit}</span>`; return node; }
  function renderBlackjack(hideDealer = false) { const dealerCards = $("#dealerCards"); const playerCards = $("#playerCards"); if (dealerCards) { dealerCards.innerHTML = ""; casino.dealer.forEach((card, index) => dealerCards.append(renderCard(card, hideDealer && index === 1))); } if (playerCards) { playerCards.innerHTML = ""; casino.player.forEach(card => playerCards.append(renderCard(card))); } if ($("#dealerScore")) $("#dealerScore").textContent = casino.dealer.length ? (hideDealer ? handScore([casino.dealer[0]]) : handScore(casino.dealer)) : 0; if ($("#playerScore")) $("#playerScore").textContent = casino.player.length ? handScore(casino.player) : 0; if ($("#hitBtn")) $("#hitBtn").disabled = casino.phase !== "player"; if ($("#standBtn")) $("#standBtn").disabled = casino.phase !== "player"; }
  function ensureBet() { if (casino.balance < casino.bet) { casino.bet = Math.max(5, Math.min(25, casino.balance)); if (casino.balance <= 0) casino.balance = 500; } }
  function dealBlackjack() { switchGame("blackjack"); ensureBet(); casino.deck = makeDeck(); casino.player = [casino.deck.pop(), casino.deck.pop()]; casino.dealer = [casino.deck.pop(), casino.deck.pop()]; casino.phase = "player"; renderBlackjack(true); setMessage("Hand live. Hit or stand."); updateStats(); }
  function hitBlackjack() { if (casino.phase !== "player") return; casino.player.push(casino.deck.pop()); const score = handScore(casino.player); if (score > 21) finishBlackjack("dealer", "Bust. Dealer wins this one."); else { renderBlackjack(true); setMessage("You hit. Choose smart — hit again or stand."); } }
  function standBlackjack() { if (casino.phase !== "player") return; while (handScore(casino.dealer) < 17) casino.dealer.push(casino.deck.pop()); const playerScore = handScore(casino.player); const dealerScore = handScore(casino.dealer); if (dealerScore > 21 || playerScore > dealerScore) finishBlackjack("player", "You beat the dealer. Reward progress added."); else if (dealerScore === playerScore) finishBlackjack("push", "Push. Nobody wins, but progress still moves."); else finishBlackjack("dealer", "Dealer wins. Run it back."); }
  function finishBlackjack(result, message) { casino.phase = "finished"; renderBlackjack(false); if (result === "player") { casino.balance += casino.bet; casino.streak += 1; casino.lastWin = casino.bet * 2; addProgress("blackjack", Math.max(10, casino.bet)); } else if (result === "dealer") { casino.balance = Math.max(0, casino.balance - casino.bet); casino.streak = 0; casino.lastWin = 0; addProgress("blackjack", 5); } else { casino.lastWin = 0; addProgress("blackjack", 3); } setMessage(message); updateStats(); }
  function iconMarkup(symbol) { return `<div class="casino-icon icon-${symbol.key}"><span class="icon-core">${symbol.short}</span></div><small>${symbol.label}</small>`; }
  function ensureFiveReels() { const reels = $("#slotReels"); if (!reels) return; reels.classList.add("five-reels"); const defaultSymbols = [SLOT_SYMBOLS[6], SLOT_SYMBOLS[8], SLOT_SYMBOLS[3], SLOT_SYMBOLS[0], SLOT_SYMBOLS[4]]; reels.innerHTML = defaultSymbols.map(symbol => `<div class="slot-reel">${iconMarkup(symbol)}</div>`).join(""); }
  function weightedSymbol() { const total = SLOT_SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0); let roll = Math.random() * total; for (const symbol of SLOT_SYMBOLS) { roll -= symbol.weight; if (roll <= 0) return symbol; } return SLOT_SYMBOLS[0]; }
  function spinSlots() { switchGame("slots"); ensureBet(); const reels = $("#slotReels"); if (!reels) return; if (!reels.children.length) ensureFiveReels(); reels.classList.add("spinning"); setMessage("Slots spinning. Watch for codes, tracks, and Duck symbols."); setTimeout(() => { const result = Array.from({ length: 5 }, weightedSymbol); reels.innerHTML = result.map(symbol => `<div class="slot-reel consumer-pop">${iconMarkup(symbol)}</div>`).join(""); reels.classList.remove("spinning"); const counts = result.reduce((map, symbol) => { map[symbol.label] = (map[symbol.label] || 0) + 1; return map; }, {}); const best = Math.max(...Object.values(counts)); let reward = 0; if (best >= 5) reward = casino.bet * 12; else if (best >= 4) reward = casino.bet * 6; else if (best >= 3) reward = casino.bet * 3; else if (result.some(symbol => symbol.label === "TRACK" || symbol.label === "CODE")) reward = 10; if (reward > 0) { casino.balance += reward; casino.lastWin = reward; casino.streak += 1; addProgress("slots", Math.min(120, reward)); setMessage(`Slots hit ${reward}. Reward chart updated.`); } else { casino.balance = Math.max(0, casino.balance - casino.bet); casino.lastWin = 0; casino.streak = 0; addProgress("slots", 3); setMessage("No match. Progress still moved a little."); } updateStats(); }, 620); }
  function spinWheel() { switchGame("wheel"); const wheel = $("#vaultWheel"); const prizeIndex = Math.floor(Math.random() * WHEEL_PRIZES.length); const prize = WHEEL_PRIZES[prizeIndex]; const spin = 720 + prizeIndex * 60 + Math.floor(Math.random() * 35); if (wheel) wheel.style.transform = `rotate(${spin}deg)`; setTimeout(() => { if (prize.points > 0) { casino.balance += prize.points; casino.lastWin = prize.points; casino.streak += 1; addProgress("wheel", prize.points); } else { casino.lastWin = 0; casino.streak = 0; addProgress("wheel", 2); } setMessage(prize.message); updateStats(); }, 900); }
  function resetCasino() { casino.balance = 500; casino.bet = 25; casino.streak = 0; casino.lastWin = 0; casino.phase = "idle"; casino.player = []; casino.dealer = []; renderBlackjack(false); setMessage("Casino points reset. Reward unlock history stays saved."); updateStats(); }
  function bindEvents() { $$(".game-tab").forEach(tab => tab.addEventListener("click", () => switchGame(tab.dataset.game))); $$(".chip").forEach(chip => chip.addEventListener("click", () => { casino.bet = Number(chip.dataset.bet || 25); updateStats(); toast(`Bet set to ${casino.bet}`); })); $("#dealBtn")?.addEventListener("click", dealBlackjack); $("#hitBtn")?.addEventListener("click", hitBlackjack); $("#standBtn")?.addEventListener("click", standBlackjack); $("#resetBtn")?.addEventListener("click", resetCasino); $("#spinSlotsBtn")?.addEventListener("click", spinSlots); $("#spinWheelBtn")?.addEventListener("click", spinWheel); $("#consumerRewardHud")?.addEventListener("click", () => showRewardReminder(true)); }
  async function boot() { injectStyles(); loadState(); ensureFiveReels(); bindEvents(); renderBlackjack(false); updateStats(); switchGame("blackjack"); setMessage("Casino floor live. Rewards chart is active."); await initSupabase(); renderRewardHud(); setTimeout(() => showRewardReminder(true), 1200); setInterval(() => showRewardReminder(false), 120000); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
