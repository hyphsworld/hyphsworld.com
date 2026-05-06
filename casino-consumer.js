/* HYPHSWORLD Casino — Consumer-first single UI engine
   Enhances the existing casino.html layout.
   No duplicate casino shell injection.
   Features: blackjack, 5-reel slots, wheel, local reward progress, login-aware point awarding.
*/
(() => {
  "use strict";

  const SUPABASE_URL = "https://yuhxtdkhsltaqiagrtys.supabase.co";
  const SUPABASE_KEY = "sb_publishable_oYdN-75W3b7k3m1zLukI-A_BKWVDD5e";
  const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  const SAVE_KEY = "hyphsworld:casino:consumer:v1";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const SLOT_SYMBOLS = [
    { icon: "🛹", label: "RAMP", weight: 10 },
    { icon: "🎤", label: "MIC", weight: 10 },
    { icon: "🔊", label: "SLAP", weight: 10 },
    { icon: "🔑", label: "CODE", weight: 7 },
    { icon: "🎧", label: "TRACK", weight: 7 },
    { icon: "🧢", label: "HYPOWER", weight: 8 },
    { icon: "🦆", label: "DUCK", weight: 6 },
    { icon: "🛡️", label: "BUCK", weight: 6 },
    { icon: "💎", label: "ICE", weight: 8 },
    { icon: "👑", label: "CROWN", weight: 5 },
  ];

  const WHEEL_PRIZES = [
    { label: "+25", points: 25, message: "Wheel hit +25 reward progress." },
    { label: "ROAST", points: 5, message: "Duck Sauce roasted you but still gave +5." },
    { label: "+100", points: 100, message: "Major wheel hit +100 reward progress." },
    { label: "CLUE", points: 50, message: "Vault clue hit. +50 reward progress." },
    { label: "MISS", points: 0, message: "Miss. Duck said spin better." },
    { label: "+50", points: 50, message: "Wheel hit +50 reward progress." },
  ];

  const REWARDS = [
    { key: "slots_50", game: "slots", threshold: 50, title: "Hidden Track Clue", detail: "Slots progress hit 50. Hidden track clue unlocked." },
    { key: "blackjack_50", game: "blackjack", threshold: 50, title: "Blackjack Backroom Code", detail: "Blackjack progress hit 50. Backroom code clue unlocked." },
    { key: "wheel_50", game: "wheel", threshold: 50, title: "Vault Wheel Bonus", detail: "Wheel progress hit 50. Bonus clue unlocked." },
    { key: "casino_100", game: "total", threshold: 100, title: "Secret Drop Trigger", detail: "Casino total progress hit 100. Secret drop trigger unlocked." },
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
    lastPointAwardAt: 0,
  };

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (!saved) return;
      casino.balance = Number.isFinite(saved.balance) ? saved.balance : casino.balance;
      casino.bet = Number.isFinite(saved.bet) ? saved.bet : casino.bet;
      casino.streak = Number.isFinite(saved.streak) ? saved.streak : casino.streak;
      casino.progress = { ...casino.progress, ...(saved.progress || {}) };
      casino.rewards = saved.rewards || {};
    } catch {
      // Bad local save should never break the casino.
    }
  }

  function saveState() {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      balance: casino.balance,
      bet: casino.bet,
      streak: casino.streak,
      progress: casino.progress,
      rewards: casino.rewards,
      savedAt: new Date().toISOString(),
    }));
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (window.supabase?.createClient) return resolve();
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Supabase library failed to load."));
      document.head.append(script);
    });
  }

  async function initSupabase() {
    try {
      if (!window.supabase?.createClient) await loadScript(SUPABASE_CDN);
      casino.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      });
      const { data } = await casino.client.auth.getUser();
      casino.user = data?.user || null;
      casino.client.auth.onAuthStateChange((_event, session) => {
        casino.user = session?.user || null;
        renderRewardHud();
      });
    } catch (error) {
      console.warn("Casino auth check skipped:", error.message);
    }
  }

  function injectStyles() {
    if ($("#casinoConsumerStyles")) return;
    const style = document.createElement("style");
    style.id = "casinoConsumerStyles";
    style.textContent = `
      .consumer-reward-hud{margin:16px 0;padding:15px;border:2px dashed rgba(57,255,20,.48);border-radius:22px;background:radial-gradient(circle at 8% 8%,rgba(255,43,214,.20),transparent 30%),linear-gradient(135deg,rgba(0,0,0,.58),rgba(57,255,20,.08));box-shadow:0 16px 34px rgba(0,0,0,.32)}
      .consumer-reward-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:11px}.consumer-reward-kicker{color:var(--green,#39ff14);font-size:12px;font-weight:1000;letter-spacing:.15em;text-transform:uppercase}.consumer-reward-title{margin:2px 0 0;font-size:clamp(18px,3vw,28px);line-height:1;text-transform:uppercase;text-shadow:2px 2px 0 rgba(255,43,214,.8)}.consumer-login-pill{border-radius:999px;padding:8px 11px;color:#050505;background:linear-gradient(135deg,var(--yellow,#ffe600),var(--green,#39ff14),var(--cyan,#00e5ff));font-weight:1000;font-size:12px}.consumer-progress-wrap{display:grid;gap:8px}.consumer-progress-line{height:13px;border-radius:999px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.16);overflow:hidden}.consumer-progress-fill{height:100%;width:0%;border-radius:999px;background:linear-gradient(90deg,var(--green,#39ff14),var(--yellow,#ffe600),var(--pink,#ff2bd6),var(--cyan,#00e5ff));box-shadow:0 0 18px rgba(57,255,20,.34);transition:width .25s ease}.consumer-reward-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px}.consumer-reward-card{border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.32);border-radius:16px;padding:10px;position:relative;overflow:hidden}.consumer-reward-card.unlocked{border-color:rgba(57,255,20,.58);box-shadow:0 0 22px rgba(57,255,20,.12)}.consumer-reward-card strong{display:block;color:#fff;text-transform:uppercase}.consumer-reward-card small{display:block;color:rgba(255,255,255,.7);font-family:system-ui,sans-serif;font-weight:800;margin-top:3px}.consumer-reward-card .status{display:inline-block;margin-top:8px;border-radius:999px;padding:5px 8px;color:#050505;background:var(--yellow,#ffe600);font-size:11px;font-weight:1000}.consumer-reward-card.unlocked .status{background:var(--green,#39ff14)}.consumer-toast{position:fixed;left:50%;bottom:28px;z-index:12000;transform:translateX(-50%) translateY(18px);opacity:0;pointer-events:none;max-width:min(92vw,620px);border:2px solid rgba(57,255,20,.65);border-radius:999px;padding:12px 16px;color:#fff;background:linear-gradient(135deg,#071108,#17001f);box-shadow:0 18px 40px rgba(0,0,0,.48);font-weight:1000;transition:.22s ease}.consumer-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}.slot-reels{grid-template-columns:repeat(5,1fr)}.slot-reel.consumer-pop{animation:consumerPop .26s cubic-bezier(.2,1.35,.45,1) both}@keyframes consumerPop{0%{transform:scale(.8) rotate(-2deg);opacity:.5}100%{transform:scale(1) rotate(0);opacity:1}}.reward-flash{animation:rewardFlash .55s ease both}@keyframes rewardFlash{0%,100%{filter:none}45%{filter:drop-shadow(0 0 24px var(--yellow,#ffe600)) brightness(1.28)}}@media(max-width:760px){.consumer-reward-grid{grid-template-columns:1fr}.consumer-login-pill{width:100%;text-align:center}.slot-reels{grid-template-columns:repeat(3,1fr)}}
    `;
    document.head.append(style);
  }

  function toast(message) {
    let box = $("#consumerToast");
    if (!box) {
      box = document.createElement("div");
      box.id = "consumerToast";
      box.className = "consumer-toast";
      document.body.append(box);
    }
    box.textContent = message;
    box.classList.add("show");
    clearTimeout(box._timer);
    box._timer = setTimeout(() => box.classList.remove("show"), 3600);
  }

  function totalProgress() {
    return casino.progress.blackjack + casino.progress.slots + casino.progress.wheel;
  }

  function currentProgress() {
    return casino.game === "blackjack" ? casino.progress.blackjack : casino.game === "slots" ? casino.progress.slots : casino.progress.wheel;
  }

  function nextThreshold() {
    const progress = currentProgress();
    if (progress < 50) return 50;
    if (progress < 100) return 100;
    return Math.ceil((progress + 1) / 100) * 100;
  }

  function injectRewardHud() {
    if ($("#consumerRewardHud")) return;
    const stats = $(".casino-bankroll") || $(".casino-stats") || $(".casino-title");
    if (!stats) return;
    const hud = document.createElement("section");
    hud.id = "consumerRewardHud";
    hud.className = "consumer-reward-hud";
    stats.insertAdjacentElement("afterend", hud);
  }

  function renderRewardHud() {
    injectRewardHud();
    const hud = $("#consumerRewardHud");
    if (!hud) return;
    const progress = currentProgress();
    const threshold = nextThreshold();
    const pct = Math.max(0, Math.min(100, (progress % threshold) / threshold * 100));
    const loginText = casino.user ? "Rewards saving to account" : "Free play — sign in to save rewards";
    const gameTitle = casino.game === "blackjack" ? "Blackjack" : casino.game === "slots" ? "Duck Slots" : "Spin Wheel";

    hud.innerHTML = `
      <div class="consumer-reward-top">
        <div>
          <div class="consumer-reward-kicker">Reward Progress</div>
          <h3 class="consumer-reward-title">${gameTitle}: ${progress} / ${threshold}</h3>
        </div>
        <div class="consumer-login-pill">${loginText}</div>
      </div>
      <div class="consumer-progress-wrap">
        <div class="consumer-progress-line"><div class="consumer-progress-fill" style="width:${pct}%"></div></div>
        <div class="consumer-reward-kicker">Total Casino Bank: ${totalProgress()} • 50 points unlocks clues, codes, hidden tracks</div>
      </div>
      <div class="consumer-reward-grid">
        ${REWARDS.map(reward => {
          const unlocked = Boolean(casino.rewards[reward.key]);
          return `<div class="consumer-reward-card ${unlocked ? "unlocked" : "locked"}">
            <strong>${reward.title}</strong>
            <small>${reward.detail}</small>
            <span class="status">${unlocked ? "Unlocked" : "Locked"}</span>
          </div>`;
        }).join("")}
      </div>
    `;
  }

  function updateStats() {
    if ($("#balance")) $("#balance").textContent = casino.balance.toLocaleString();
    if ($("#bet")) $("#bet").textContent = casino.bet.toLocaleString();
    if ($("#streak")) $("#streak").textContent = casino.streak.toLocaleString();
    renderRewardHud();
    saveState();
  }

  function setMessage(text) {
    const message = casino.game === "blackjack" ? $("#message") : casino.game === "slots" ? $("#slotsMessage") : $("#wheelMessage");
    if (message) message.textContent = text;
    const announcer = $("#casinoAnnouncer");
    if (announcer) announcer.textContent = `Duck Sauce: “${text}”`;
  }

  function unlockEligibleRewards() {
    let unlockedSomething = false;
    REWARDS.forEach(reward => {
      const progress = reward.game === "total" ? totalProgress() : casino.progress[reward.game];
      if (progress >= reward.threshold && !casino.rewards[reward.key]) {
        casino.rewards[reward.key] = new Date().toISOString();
        unlockedSomething = true;
        toast(`Unlocked: ${reward.title}`);
      }
    });
    if (unlockedSomething) {
      $("#consumerRewardHud")?.classList.add("reward-flash");
      setTimeout(() => $("#consumerRewardHud")?.classList.remove("reward-flash"), 700);
    }
  }

  async function maybeAwardAccountPoints(amount) {
    if (!casino.client || !casino.user || amount <= 0) return;
    const now = Date.now();
    if (now - casino.lastPointAwardAt < 65000) return;
    casino.lastPointAwardAt = now;
    try {
      await casino.client.rpc("award_points", {
        p_amount: Math.max(1, Math.min(10, Math.floor(amount))),
        p_reason: "casino_play",
        p_metadata: { game: casino.game, source: "consumer_casino" },
      });
    } catch (error) {
      console.warn("Account point award skipped:", error.message);
    }
  }

  function addProgress(game, points) {
    const safe = Math.max(0, Math.floor(points || 0));
    if (!safe) return;
    casino.progress[game] = (casino.progress[game] || 0) + safe;
    unlockEligibleRewards();
    renderRewardHud();
    maybeAwardAccountPoints(Math.min(10, safe));
  }

  function switchGame(game) {
    casino.game = game;
    $$(".game-tab").forEach(tab => {
      const active = tab.dataset.game === game;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    $$(".game-view").forEach(view => view.classList.toggle("active", view.dataset.gameView === game));
    const titleMap = { blackjack: "Blackjack Table", slots: "Duck Sauce 5-Reel Slots", wheel: "Spin Wheel" };
    const subMap = {
      blackjack: "Beat the dealer without going over 21.",
      slots: "Line up HYPHSWORLD symbols to trigger hidden rewards.",
      wheel: "Spin for bonus points, clues, roasts, and reward jumps.",
    };
    if ($("#activeGameTitle")) $("#activeGameTitle").textContent = titleMap[game] || "Casino";
    if ($("#activeGameSubtext")) $("#activeGameSubtext").textContent = subMap[game] || "Play for rewards.";
    renderRewardHud();
  }

  function makeDeck() {
    const suits = ["♠", "♥", "♦", "♣"];
    const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const deck = [];
    suits.forEach(suit => ranks.forEach(rank => deck.push({ suit, rank })));
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function cardValue(card) {
    if (card.rank === "A") return 11;
    if (["K", "Q", "J"].includes(card.rank)) return 10;
    return Number(card.rank);
  }

  function handScore(hand) {
    let score = hand.reduce((sum, card) => sum + cardValue(card), 0);
    let aces = hand.filter(card => card.rank === "A").length;
    while (score > 21 && aces > 0) {
      score -= 10;
      aces -= 1;
    }
    return score;
  }

  function renderCard(card, hidden = false) {
    const node = document.createElement("div");
    node.className = hidden ? "card back deal-pop" : "card deal-pop";
    if (hidden) {
      node.innerHTML = "<strong>?</strong><span>?</span>";
      return node;
    }
    const red = ["♥", "♦"].includes(card.suit);
    if (red) node.classList.add("red");
    node.innerHTML = `<strong>${card.rank}</strong><span>${card.suit}</span>`;
    return node;
  }

  function renderBlackjack(hideDealer = false) {
    const dealerCards = $("#dealerCards");
    const playerCards = $("#playerCards");
    if (dealerCards) {
      dealerCards.innerHTML = "";
      casino.dealer.forEach((card, index) => dealerCards.append(renderCard(card, hideDealer && index === 1)));
    }
    if (playerCards) {
      playerCards.innerHTML = "";
      casino.player.forEach(card => playerCards.append(renderCard(card)));
    }
    if ($("#dealerScore")) $("#dealerScore").textContent = hideDealer ? handScore([casino.dealer[0]]) : handScore(casino.dealer);
    if ($("#playerScore")) $("#playerScore").textContent = handScore(casino.player);
    if ($("#hitBtn")) $("#hitBtn").disabled = casino.phase !== "player";
    if ($("#standBtn")) $("#standBtn").disabled = casino.phase !== "player";
  }

  function ensureBet() {
    if (casino.balance < casino.bet) {
      casino.bet = Math.max(5, Math.min(25, casino.balance));
      if (casino.balance <= 0) casino.balance = 500;
    }
  }

  function dealBlackjack() {
    switchGame("blackjack");
    ensureBet();
    casino.deck = makeDeck();
    casino.player = [casino.deck.pop(), casino.deck.pop()];
    casino.dealer = [casino.deck.pop(), casino.deck.pop()];
    casino.phase = "player";
    renderBlackjack(true);
    setMessage("Hand live. Hit or stand. Duck Dealer is already acting suspicious.");
    updateStats();
  }

  function hitBlackjack() {
    if (casino.phase !== "player") return;
    casino.player.push(casino.deck.pop());
    const score = handScore(casino.player);
    if (score > 21) finishBlackjack("dealer", "Bust. Duck Dealer wins this one.");
    else {
      renderBlackjack(true);
      setMessage("You hit. Now choose smart — hit again or stand.");
    }
  }

  function standBlackjack() {
    if (casino.phase !== "player") return;
    while (handScore(casino.dealer) < 17) casino.dealer.push(casino.deck.pop());
    const playerScore = handScore(casino.player);
    const dealerScore = handScore(casino.dealer);
    if (dealerScore > 21 || playerScore > dealerScore) finishBlackjack("player", "You beat Duck Dealer. Reward progress added.");
    else if (dealerScore === playerScore) finishBlackjack("push", "Push. Nobody wins, but the floor stays hot.");
    else finishBlackjack("dealer", "Duck Dealer wins. Run it back.");
  }

  function finishBlackjack(result, message) {
    casino.phase = "finished";
    renderBlackjack(false);
    if (result === "player") {
      casino.balance += casino.bet;
      casino.streak += 1;
      casino.lastWin = casino.bet * 2;
      addProgress("blackjack", Math.max(10, casino.bet));
    } else if (result === "dealer") {
      casino.balance = Math.max(0, casino.balance - casino.bet);
      casino.streak = 0;
      casino.lastWin = 0;
      addProgress("blackjack", 5);
    } else {
      casino.lastWin = 0;
      addProgress("blackjack", 3);
    }
    setMessage(message);
    updateStats();
  }

  function ensureFiveReels() {
    const reels = $("#slotReels");
    if (!reels) return;
    while (reels.children.length < 5) {
      const reel = document.createElement("div");
      reel.className = "slot-reel";
      reel.innerHTML = "<span>🛹</span><small>RAMP</small>";
      reels.append(reel);
    }
  }

  function weightedSymbol() {
    const total = SLOT_SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);
    let roll = Math.random() * total;
    for (const symbol of SLOT_SYMBOLS) {
      roll -= symbol.weight;
      if (roll <= 0) return symbol;
    }
    return SLOT_SYMBOLS[0];
  }

  function spinSlots() {
    switchGame("slots");
    ensureBet();
    ensureFiveReels();
    const reels = $("#slotReels");
    if (!reels) return;
    reels.classList.add("spinning");
    setMessage("Slots spinning. Duck Sauce says don’t blink.");
    setTimeout(() => {
      const result = Array.from({ length: 5 }, weightedSymbol);
      $$(".slot-reel", reels).forEach((reel, index) => {
        const symbol = result[index];
        reel.classList.remove("consumer-pop");
        reel.innerHTML = `<span>${symbol.icon}</span><small>${symbol.label}</small>`;
        void reel.offsetWidth;
        reel.classList.add("consumer-pop");
      });
      reels.classList.remove("spinning");
      const counts = result.reduce((map, symbol) => {
        map[symbol.label] = (map[symbol.label] || 0) + 1;
        return map;
      }, {});
      const best = Math.max(...Object.values(counts));
      let reward = 0;
      if (best >= 5) reward = casino.bet * 10;
      else if (best >= 4) reward = casino.bet * 5;
      else if (best >= 3) reward = casino.bet * 2;
      else if (result.some(symbol => symbol.label === "TRACK" || symbol.label === "CODE")) reward = 10;

      if (reward > 0) {
        casino.balance += reward;
        casino.lastWin = reward;
        addProgress("slots", Math.min(100, reward));
        setMessage(`Slots hit ${reward}. Hidden reward progress jumped.`);
      } else {
        casino.balance = Math.max(0, casino.balance - casino.bet);
        casino.lastWin = 0;
        addProgress("slots", 3);
        setMessage("No match. Duck Sauce says the machine still remembers you.");
      }
      updateStats();
    }, 620);
  }

  function spinWheel() {
    switchGame("wheel");
    const wheel = $("#vaultWheel");
    const prizeIndex = Math.floor(Math.random() * WHEEL_PRIZES.length);
    const prize = WHEEL_PRIZES[prizeIndex];
    const spin = 720 + prizeIndex * 60 + Math.floor(Math.random() * 35);
    if (wheel) wheel.style.transform = `rotate(${spin}deg)`;
    setTimeout(() => {
      if (prize.points > 0) {
        casino.balance += prize.points;
        casino.lastWin = prize.points;
        addProgress("wheel", prize.points);
      } else {
        casino.lastWin = 0;
        addProgress("wheel", 2);
      }
      setMessage(prize.message);
      updateStats();
    }, 900);
  }

  function resetCasino() {
    casino.balance = 500;
    casino.bet = 25;
    casino.streak = 0;
    casino.lastWin = 0;
    casino.phase = "idle";
    casino.player = [];
    casino.dealer = [];
    renderBlackjack(false);
    setMessage("Casino points reset. Rewards stay locked/unlocked based on progress.");
    updateStats();
  }

  function bindEvents() {
    $$(".game-tab").forEach(tab => tab.addEventListener("click", () => switchGame(tab.dataset.game)));
    $$(".chip").forEach(chip => chip.addEventListener("click", () => {
      casino.bet = Number(chip.dataset.bet || 25);
      updateStats();
      toast(`Bet set to ${casino.bet}`);
    }));
    $("#dealBtn")?.addEventListener("click", dealBlackjack);
    $("#hitBtn")?.addEventListener("click", hitBlackjack);
    $("#standBtn")?.addEventListener("click", standBlackjack);
    $("#resetBtn")?.addEventListener("click", resetCasino);
    $("#spinSlotsBtn")?.addEventListener("click", spinSlots);
    $("#spinWheelBtn")?.addEventListener("click", spinWheel);
  }

  async function boot() {
    injectStyles();
    loadState();
    ensureFiveReels();
    bindEvents();
    renderBlackjack(false);
    updateStats();
    switchGame("blackjack");
    setMessage("Casino floor live. Free play is open — sign in to save rewards.");
    await initSupabase();
    renderRewardHud();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
