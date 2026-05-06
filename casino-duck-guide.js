/* HYPHSWORLD Casino — Duck Sauce CPU + Multiplayer Guide
   Full rewrite. Layout-safe overlay only: does not move cards, tables, buttons, or game panels.
*/
(() => {
  "use strict";

  const DUCK_IMAGE = "duck-sauce.png";
  const FALLBACK_DUCK = "duck-sauce.jpg";

  const $ = (q, root = document) => root.querySelector(q);
  const $$ = (q, root = document) => Array.from(root.querySelectorAll(q));

  const GAME_RULES = {
    blackjack: {
      title: "Blackjack",
      cpu: [
        "Tap Deal or Play CPU to start a solo hand.",
        "You get two cards. Duck Dealer gets two cards.",
        "Tap Hit to take another card.",
        "Tap Stand when you want to keep your total.",
        "Beat Duck Dealer without going over 21. Over 21 is a bust."
      ],
      multiplayer: [
        "Tap Create Table or Multiplayer to host a room.",
        "Copy the room code when it appears.",
        "Send that code to your player.",
        "They tap Join Table, enter the code, and sit down.",
        "When both players are live, start the hand and play turn by turn."
      ],
      tip: "Duck Sauce tip: If you got 17 or higher, standing is usually the safe play. If you got 11 or less, hit that thing."
    },
    roulette: {
      title: "Roulette",
      cpu: [
        "Pick a number, color, or safe bet.",
        "Tap Spin or Play CPU to roll the wheel.",
        "Duck wheel choice lands randomly.",
        "Match the result to win Cool Points."
      ],
      multiplayer: [
        "Create a room and share the room code.",
        "Each player places their own bet.",
        "Host spins the wheel.",
        "Everyone sees the same result when realtime is connected."
      ],
      tip: "Duck Sauce tip: Color bets are safer. Number bets hit harder but Duck might laugh at you first."
    },
    dice: {
      title: "Dice",
      cpu: [
        "Tap Play CPU to roll against Duck.",
        "Highest roll wins the round.",
        "Tie means run it back.",
        "Streaks can stack when the game mode allows it."
      ],
      multiplayer: [
        "Create a dice table.",
        "Send the room code to your player.",
        "Each player rolls on their turn.",
        "The table log tracks wins and pressure."
      ],
      tip: "Duck Sauce tip: Dice is the fast game. Don’t overthink it unless Buck is counting your losses."
    },
    poker: {
      title: "Poker",
      cpu: [
        "CPU poker is practice mode.",
        "Start a hand, review your cards, then choose your move.",
        "Fold weak hands. Push strong hands.",
        "Full betting rules can expand later."
      ],
      multiplayer: [
        "Create a poker table.",
        "Send your room code.",
        "Players join seats before the hand starts.",
        "Use table actions for turn order, pot, and winner."
      ],
      tip: "Duck Sauce tip: Poker needs patience. Don’t play every hand like you found a cheat code."
    },
    dominos: {
      title: "Dominos",
      cpu: [
        "Play CPU to practice against Duck.",
        "Match tiles to the open ends.",
        "If you cannot play, draw or pass depending on table rules.",
        "First player out or highest score wins."
      ],
      multiplayer: [
        "Create a Dominos room.",
        "Send the room code to your player.",
        "Each player gets their bones.",
        "Play turn by turn until somebody clears their hand."
      ],
      tip: "Duck Sauce tip: Watch the open ends. Don’t be staring at bones like they owe you money."
    },
    slots: {
      title: "Duck Slots",
      cpu: [
        "Slots are solo mode.",
        "Set your bet, then tap Spin Slots.",
        "Matching symbols wins Cool Points.",
        "Three Ducks is pressure."
      ],
      multiplayer: [
        "Slots are mostly solo right now.",
        "For multiplayer energy, use leaderboard score after each spin.",
        "Highest session score wins bragging rights."
      ],
      tip: "Duck Sauce tip: Slots are for fun. Do not argue with a machine wearing Duck Sauce branding."
    },
    wheel: {
      title: "Wheel",
      cpu: [
        "Tap Spin Wheel.",
        "Wait for the wheel result.",
        "Bonus points, clues, misses, or Duck roasts can hit.",
        "Claim the result when the game allows it."
      ],
      multiplayer: [
        "Wheel can be used as party mode.",
        "Host spins, everyone watches the same result.",
        "Use it for side bonuses, clues, or table rules."
      ],
      tip: "Duck Sauce tip: If it lands on roast, take it like a player and keep moving."
    }
  };

  function currentGameKey() {
    const select = $("#hwGameType");
    if (select && select.value) return select.value.toLowerCase();

    const activeTab = $(".game-tab.active, .game-tab[aria-selected='true'], [data-game].active, [data-game].is-active");
    if (activeTab && activeTab.dataset.game) return activeTab.dataset.game.toLowerCase();

    const heading = ((document.body.innerText || "").slice(0, 3000)).toLowerCase();
    if (heading.includes("roulette")) return "roulette";
    if (heading.includes("domino")) return "dominos";
    if (heading.includes("poker")) return "poker";
    if (heading.includes("dice")) return "dice";
    if (heading.includes("slot")) return "slots";
    if (heading.includes("wheel")) return "wheel";
    return "blackjack";
  }

  function styleOnce() {
    if ($("#hwDuckCasinoGuideStyles")) return;
    const style = document.createElement("style");
    style.id = "hwDuckCasinoGuideStyles";
    style.textContent = `
      .hw-duck-help-launcher{position:fixed;left:14px;bottom:94px;z-index:10000;display:flex;align-items:center;gap:9px;border:2px solid rgba(255,238,0,.9);border-radius:999px;padding:8px 13px;background:linear-gradient(135deg,#ffee00,#45ff36,#ff2dd6);color:#050505;font-weight:1000;text-transform:uppercase;letter-spacing:.05em;box-shadow:0 14px 34px rgba(0,0,0,.48);cursor:pointer}.hw-duck-help-launcher img{width:42px;height:42px;border-radius:50%;object-fit:contain;background:#111;border:2px solid #fff;filter:drop-shadow(0 0 8px rgba(255,238,0,.48))}.hw-duck-guide-card{position:fixed;left:14px;bottom:154px;z-index:10000;width:min(430px,calc(100vw - 28px));max-height:72vh;overflow:auto;border:2px solid rgba(69,255,54,.70);border-radius:26px;background:radial-gradient(circle at 0% 0%,rgba(69,255,54,.18),transparent 32%),radial-gradient(circle at 100% 0%,rgba(255,45,214,.19),transparent 34%),linear-gradient(145deg,rgba(2,8,5,.97),rgba(30,4,42,.96));color:#fff;box-shadow:0 22px 60px rgba(0,0,0,.62);display:none}.hw-duck-guide-card.is-open{display:block}.hw-duck-guide-inner{position:relative;padding:16px}.hw-duck-guide-inner:before{content:'HYPH LIFE  AMS WEST  DUCK SAUCE  CPU  MULTIPLAYER';position:absolute;left:-28px;right:-60px;bottom:16px;transform:rotate(-9deg);font-size:2rem;font-weight:1000;line-height:.9;color:rgba(255,238,0,.14);-webkit-text-stroke:1px rgba(255,45,214,.28);pointer-events:none;white-space:nowrap}.hw-duck-guide-content{position:relative;z-index:2}.hw-duck-guide-head{display:flex;gap:12px;align-items:center;margin-bottom:12px}.hw-duck-face{width:78px;height:78px;flex:0 0 auto;border-radius:24px;display:grid;place-items:center;overflow:hidden;background:#111;border:3px solid rgba(255,238,0,.95);box-shadow:0 0 22px rgba(255,238,0,.28)}.hw-duck-face img{width:100%;height:100%;object-fit:contain;transform:scale(1.12)}.hw-duck-kicker{display:block;color:#45ff36;font-size:.72rem;font-weight:1000;letter-spacing:.16em;text-transform:uppercase}.hw-duck-title{margin:2px 0 0;font-size:1.42rem;line-height:1;text-transform:uppercase}.hw-duck-close{position:absolute;right:11px;top:11px;z-index:3;width:34px;height:34px;border-radius:999px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.42);color:#fff;font-weight:1000;cursor:pointer}.hw-duck-mode-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.hw-duck-mode-tab{border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:10px;background:rgba(255,255,255,.08);color:#fff;font-weight:1000;text-transform:uppercase;cursor:pointer}.hw-duck-mode-tab.is-active{background:linear-gradient(135deg,#45ff36,#00ffee);color:#050505}.hw-duck-game-tabs{display:flex;flex-wrap:wrap;gap:7px;margin:8px 0 12px}.hw-duck-game-tab{border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:7px 9px;background:rgba(255,255,255,.07);color:#fff;font-size:.76rem;font-weight:900;text-transform:uppercase;cursor:pointer}.hw-duck-game-tab.is-active{border-color:#ffee00;color:#ffee00;background:rgba(255,238,0,.09)}.hw-duck-quote{margin:10px 0;border-left:4px solid #ffee00;background:rgba(0,0,0,.28);border-radius:14px;padding:10px 11px;font-weight:850;line-height:1.35}.hw-duck-list{margin:10px 0 0;padding-left:20px}.hw-duck-list li{margin:7px 0;line-height:1.32}.hw-duck-tip{margin-top:12px;border:1px solid rgba(255,238,0,.28);border-radius:16px;padding:10px;background:rgba(255,238,0,.08);color:#ffee00;font-weight:950;line-height:1.35}.hw-duck-table-bubble{position:absolute;left:18px;top:18px;z-index:8;max-width:300px;display:flex;align-items:center;gap:9px;border:1px solid rgba(255,238,0,.42);border-radius:20px;padding:9px 10px;background:rgba(0,0,0,.50);color:#fff;font-weight:900;box-shadow:0 12px 28px rgba(0,0,0,.35)}.hw-duck-table-bubble img{width:48px;height:48px;border-radius:50%;object-fit:contain;background:#111;border:2px solid #ffee00}.hw-duck-table-bubble button{border:0;border-radius:999px;background:#45ff36;color:#050505;font-weight:1000;padding:6px 9px;text-transform:uppercase;cursor:pointer}@media(max-width:620px){.hw-duck-help-launcher{left:10px;right:auto;bottom:74px;padding:7px 11px}.hw-duck-help-launcher img{width:38px;height:38px}.hw-duck-guide-card{left:10px;bottom:126px;width:calc(100vw - 20px);max-height:70vh}.hw-duck-table-bubble{left:10px;right:10px;top:10px;max-width:none}.hw-duck-guide-inner:before{font-size:1.45rem}}`;
    document.head.appendChild(style);
  }

  function imageHtml() {
    return `<img src="${DUCK_IMAGE}" alt="Duck Sauce" onerror="this.onerror=null;this.src='${FALLBACK_DUCK}';">`;
  }

  function renderGuide(gameKey, mode) {
    const rule = GAME_RULES[gameKey] || GAME_RULES.blackjack;
    const list = mode === "multiplayer" ? rule.multiplayer : rule.cpu;
    const body = $("#hwDuckGuideBody");
    if (!body) return;
    body.innerHTML = `
      <div class="hw-duck-kicker">${rule.title} • ${mode === "multiplayer" ? "Multiplayer" : "CPU"}</div>
      <div class="hw-duck-quote">Duck Sauce: “${mode === "multiplayer" ? "Multiplayer means make a table, send the code, and stop yelling across the lobby." : "CPU mode means you versus Duck Dealer. Quick game, no waiting on nobody."}”</div>
      <ol class="hw-duck-list">${list.map(item => `<li>${item}</li>`).join("")}</ol>
      <div class="hw-duck-tip">${rule.tip}</div>
    `;
    $$(".hw-duck-mode-tab").forEach(btn => btn.classList.toggle("is-active", btn.dataset.mode === mode));
    $$(".hw-duck-game-tab").forEach(btn => btn.classList.toggle("is-active", btn.dataset.game === gameKey));
  }

  function makePanel() {
    if ($("#hwDuckCasinoGuide")) return;
    const panel = document.createElement("aside");
    panel.id = "hwDuckCasinoGuide";
    panel.className = "hw-duck-guide-card";
    panel.innerHTML = `
      <div class="hw-duck-guide-inner">
        <button class="hw-duck-close" type="button" data-duck-close>×</button>
        <div class="hw-duck-guide-content">
          <div class="hw-duck-guide-head">
            <div class="hw-duck-face">${imageHtml()}</div>
            <div>
              <span class="hw-duck-kicker">Duck Sauce Game Guide</span>
              <h3 class="hw-duck-title">Start A Game</h3>
            </div>
          </div>
          <div class="hw-duck-mode-tabs">
            <button class="hw-duck-mode-tab is-active" type="button" data-mode="cpu">VS CPU</button>
            <button class="hw-duck-mode-tab" type="button" data-mode="multiplayer">Multiplayer</button>
          </div>
          <div class="hw-duck-game-tabs">
            <button class="hw-duck-game-tab" type="button" data-game="blackjack">Blackjack</button>
            <button class="hw-duck-game-tab" type="button" data-game="roulette">Roulette</button>
            <button class="hw-duck-game-tab" type="button" data-game="dice">Dice</button>
            <button class="hw-duck-game-tab" type="button" data-game="poker">Poker</button>
            <button class="hw-duck-game-tab" type="button" data-game="dominos">Dominos</button>
          </div>
          <div id="hwDuckGuideBody"></div>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    panel.querySelector("[data-duck-close]").addEventListener("click", () => panel.classList.remove("is-open"));
    panel.querySelectorAll(".hw-duck-mode-tab").forEach(btn => btn.addEventListener("click", () => renderGuide(currentGameKey(), btn.dataset.mode)));
    panel.querySelectorAll(".hw-duck-game-tab").forEach(btn => btn.addEventListener("click", () => renderGuide(btn.dataset.game, $(".hw-duck-mode-tab.is-active")?.dataset.mode || "cpu")));
    renderGuide(currentGameKey(), "cpu");
  }

  function makeLauncher() {
    if ($("#hwDuckGuideLauncher")) return;
    const btn = document.createElement("button");
    btn.id = "hwDuckGuideLauncher";
    btn.className = "hw-duck-help-launcher";
    btn.type = "button";
    btn.innerHTML = `${imageHtml()} <span>Duck Help</span>`;
    document.body.appendChild(btn);
    btn.addEventListener("click", () => {
      makePanel();
      const panel = $("#hwDuckCasinoGuide");
      panel.classList.toggle("is-open");
      renderGuide(currentGameKey(), $(".hw-duck-mode-tab.is-active")?.dataset.mode || "cpu");
    });
  }

  function makeTableBubble() {
    if ($("#hwDuckTableBubble")) return;
    const table = $(".blackjack-table, .hw-table-stage, .casino-game-panel, .game-panel, main");
    if (!table) return;
    if (getComputedStyle(table).position === "static") table.style.position = "relative";
    const bubble = document.createElement("div");
    bubble.id = "hwDuckTableBubble";
    bubble.className = "hw-duck-table-bubble";
    bubble.innerHTML = `${imageHtml()} <span>Need CPU or multiplayer help?</span> <button type="button">Info</button>`;
    table.appendChild(bubble);
    bubble.querySelector("button").addEventListener("click", () => {
      makePanel();
      $("#hwDuckCasinoGuide").classList.add("is-open");
      renderGuide(currentGameKey(), "cpu");
    });
  }

  function bindGameChanges() {
    const select = $("#hwGameType");
    if (select && !select.dataset.duckGuideBound) {
      select.dataset.duckGuideBound = "true";
      select.addEventListener("change", () => renderGuide(currentGameKey(), $(".hw-duck-mode-tab.is-active")?.dataset.mode || "cpu"));
    }
    $$(".game-tab,[data-game]").forEach(tab => {
      if (tab.dataset.duckGuideBound) return;
      tab.dataset.duckGuideBound = "true";
      tab.addEventListener("click", () => setTimeout(() => renderGuide(currentGameKey(), $(".hw-duck-mode-tab.is-active")?.dataset.mode || "cpu"), 50));
    });
  }

  function boot() {
    styleOnce();
    makeLauncher();
    makePanel();
    makeTableBubble();
    bindGameChanges();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  const observer = new MutationObserver(() => {
    makeTableBubble();
    bindGameChanges();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
