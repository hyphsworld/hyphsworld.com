/* HYPHSWORLD Casino — Duck Sauce Game Guide Helper
   Load after casino.js:
   <script src="casino-duck-guide.js"></script>
*/
(() => {
  "use strict";

  const RULES = {
    blackjack: {
      title: "Blackjack",
      duck: "Get as close to 21 as possible without busting. I’m Duck Dealer, not your financial advisor.",
      steps: [
        "Press Play CPU to start instantly, or Create Table for a hosted room.",
        "You and Duck Dealer get two cards.",
        "Hit means take another card.",
        "Stand means keep your total and let the dealer play.",
        "Closest to 21 wins. Over 21 is a bust."
      ],
      tip: "Beginner move: stand on 17 or higher unless you’re feeling reckless."
    },
    dice: {
      title: "Dice",
      duck: "Roll them bones. Highest pressure wins when the table rules say so.",
      steps: [
        "Create or join a Dice table.",
        "Each player rolls on their turn.",
        "The table state tracks rolls and round results.",
        "Use room code if you want another player to join."
      ],
      tip: "Dice is best as a fast mini-game for points and side bets."
    },
    poker: {
      title: "Poker",
      duck: "Don’t let your face tell on your hand. Keep it player, keep it quiet.",
      steps: [
        "Create or join a Poker table.",
        "Players enter the room with a shared table state.",
        "The dealer/round system can expand into cards, bets, and winners.",
        "Use hosted rooms for multiplayer play."
      ],
      tip: "Poker needs the most UI polish later: cards, pot, bets, fold/check/call/raise."
    },
    dominos: {
      title: "Dominos",
      duck: "Match the ends. Score the points. Don’t be staring at the bones like they owe you money.",
      steps: [
        "Create or join a Dominos table.",
        "Each player gets bones/tiles.",
        "Play a tile that matches an open end on the board.",
        "If you cannot play, draw/pass depending on the table rule.",
        "First player out or highest score wins the round."
      ],
      tip: "Dominos should show a center board, player hand, open ends, and whose turn it is."
    }
  };

  const $ = (q, root = document) => root.querySelector(q);

  function injectStyles() {
    if ($("#duckGuideStyles")) return;
    const style = document.createElement("style");
    style.id = "duckGuideStyles";
    style.textContent = `
      .duck-guide-button{position:fixed;right:18px;bottom:92px;z-index:10000;border:2px solid rgba(255,239,0,.85);background:linear-gradient(135deg,#ffef00,#39ff14,#ff2bd6);color:#080707;border-radius:999px;padding:12px 16px;font-weight:1000;text-transform:uppercase;letter-spacing:.05em;box-shadow:0 14px 30px rgba(0,0,0,.42);cursor:pointer}.duck-guide-panel{position:fixed;right:16px;bottom:148px;z-index:10000;width:min(92vw,390px);max-height:70vh;overflow:auto;border:2px solid rgba(57,255,20,.65);border-radius:24px;background:radial-gradient(circle at top left,rgba(255,43,214,.22),transparent 30%),linear-gradient(145deg,#071108,#15001e);color:#fff;padding:16px;box-shadow:0 20px 50px rgba(0,0,0,.55);display:none}.duck-guide-panel.open{display:block}.duck-guide-head{display:flex;gap:12px;align-items:center;margin-bottom:10px}.duck-face{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#ffef00,#ff2bd6);border:3px solid white;font-size:2rem;box-shadow:0 0 18px rgba(255,239,0,.35)}.duck-guide-title{margin:0;font-size:1.35rem;text-transform:uppercase;line-height:1}.duck-guide-kicker{color:#39ff14;font-weight:1000;letter-spacing:.14em;text-transform:uppercase;font-size:.72rem}.duck-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.duck-tab{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);color:white;border-radius:999px;padding:8px 10px;font-weight:900;cursor:pointer}.duck-tab.active{background:#39ff14;color:#061008}.duck-quote{border-left:4px solid #ffef00;background:rgba(0,0,0,.25);border-radius:12px;padding:10px;margin:10px 0;font-weight:800}.duck-steps{margin:10px 0 0;padding-left:20px}.duck-steps li{margin:7px 0}.duck-tip{margin-top:12px;border:1px solid rgba(255,239,0,.28);border-radius:14px;padding:10px;background:rgba(255,239,0,.08);font-weight:900;color:#ffef00}.duck-close{position:absolute;right:12px;top:10px;background:rgba(0,0,0,.4);color:white;border:1px solid rgba(255,255,255,.2);border-radius:999px;width:32px;height:32px;font-weight:1000;cursor:pointer}@media(max-width:600px){.duck-guide-button{right:12px;bottom:74px}.duck-guide-panel{right:10px;bottom:126px;width:calc(100vw - 20px)}}
    `;
    document.head.append(style);
  }

  function selectedGame() {
    const select = $("#hwGameType");
    return select?.value || "blackjack";
  }

  function renderRule(gameKey) {
    const rule = RULES[gameKey] || RULES.blackjack;
    const body = $("#duckGuideBody");
    if (!body) return;
    body.innerHTML = `
      <div class="duck-guide-kicker">${rule.title} Guide</div>
      <div class="duck-quote">🦆 Duck Sauce: “${rule.duck}”</div>
      <ol class="duck-steps">${rule.steps.map(step => `<li>${step}</li>`).join("")}</ol>
      <div class="duck-tip">Tip: ${rule.tip}</div>
    `;
    document.querySelectorAll(".duck-tab").forEach(btn => btn.classList.toggle("active", btn.dataset.game === gameKey));
  }

  function injectGuide() {
    if ($("#duckGuidePanel")) return;
    injectStyles();

    const btn = document.createElement("button");
    btn.id = "duckGuideButton";
    btn.className = "duck-guide-button";
    btn.type = "button";
    btn.textContent = "🦆 How To Play";

    const panel = document.createElement("aside");
    panel.id = "duckGuidePanel";
    panel.className = "duck-guide-panel";
    panel.innerHTML = `
      <button class="duck-close" id="duckGuideClose" type="button">×</button>
      <div class="duck-guide-head">
        <div class="duck-face">🦆</div>
        <div>
          <div class="duck-guide-kicker">Duck Sauce Helper</div>
          <h3 class="duck-guide-title">How To Play</h3>
        </div>
      </div>
      <div class="duck-tabs">
        <button class="duck-tab" data-game="blackjack" type="button">Blackjack</button>
        <button class="duck-tab" data-game="dice" type="button">Dice</button>
        <button class="duck-tab" data-game="poker" type="button">Poker</button>
        <button class="duck-tab" data-game="dominos" type="button">Dominos</button>
      </div>
      <div id="duckGuideBody"></div>
    `;

    document.body.append(btn, panel);
    btn.addEventListener("click", () => {
      panel.classList.toggle("open");
      renderRule(selectedGame());
    });
    $("#duckGuideClose")?.addEventListener("click", () => panel.classList.remove("open"));
    panel.querySelectorAll(".duck-tab").forEach(tab => tab.addEventListener("click", () => renderRule(tab.dataset.game)));
    $("#hwGameType")?.addEventListener("change", e => renderRule(e.target.value));
    renderRule(selectedGame());
  }

  function bootWhenCasinoAppears() {
    injectGuide();
    const observer = new MutationObserver(() => {
      injectGuide();
      const gameSelect = $("#hwGameType");
      if (gameSelect && !gameSelect.dataset.duckBound) {
        gameSelect.dataset.duckBound = "true";
        gameSelect.addEventListener("change", e => renderRule(e.target.value));
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootWhenCasinoAppears);
  else bootWhenCasinoAppears();
})();
