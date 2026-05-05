/* HYPHSWORLD Casino — Duck Sauce Game Guide Helper
   Uses the real Duck Sauce character image as an embedded asset.
   Load after casino.js:
   <script src="casino-duck-guide.js"></script>
*/
(() => {
  "use strict";

  const DUCK_IMAGE = "duck-sauce.png";

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
      .duck-guide-button{position:fixed;right:18px;bottom:92px;z-index:10000;border:2px solid rgba(255,239,0,.85);background:linear-gradient(135deg,#ffef00,#39ff14,#ff2bd6);color:#080707;border-radius:999px;padding:10px 15px;font-weight:1000;text-transform:uppercase;letter-spacing:.05em;box-shadow:0 14px 30px rgba(0,0,0,.42);cursor:pointer;display:flex;align-items:center;gap:8px}.duck-guide-button img{width:34px;height:34px;object-fit:contain;border-radius:50%;filter:drop-shadow(0 0 8px rgba(255,239,0,.5))}.duck-guide-panel{position:fixed;right:16px;bottom:148px;z-index:10000;width:min(92vw,410px);max-height:72vh;overflow:auto;border:2px solid rgba(57,255,20,.65);border-radius:24px;background:radial-gradient(circle at top left,rgba(255,43,214,.22),transparent 30%),linear-gradient(145deg,#071108,#15001e);color:#fff;padding:16px;box-shadow:0 20px 50px rgba(0,0,0,.55);display:none}.duck-guide-panel.open{display:block}.duck-guide-head{display:flex;gap:12px;align-items:center;margin-bottom:10px}.duck-face{width:74px;height:74px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#171717,#070707);border:3px solid rgba(255,239,0,.9);box-shadow:0 0 18px rgba(255,239,0,.35);overflow:hidden;flex:0 0 auto}.duck-face img{width:100%;height:100%;object-fit:contain;transform:scale(1.16)}.duck-guide-title{margin:0;font-size:1.35rem;text-transform:uppercase;line-height:1}.duck-guide-kicker{color:#39ff14;font-weight:1000;letter-spacing:.14em;text-transform:uppercase;font-size:.72rem}.duck-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.duck-tab{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);color:white;border-radius:999px;padding:8px 10px;font-weight:900;cursor:pointer}.duck-tab.active{background:#39ff14;color:#061008}.duck-quote{border-left:4px solid #ffef00;background:rgba(0,0,0,.25);border-radius:12px;padding:10px;margin:10px 0;font-weight:800}.duck-steps{margin:10px 0 0;padding-left:20px}.duck-steps li{margin:7px 0}.duck-tip{margin-top:12px;border:1px solid rgba(255,239,0,.28);border-radius:14px;padding:10px;background:rgba(255,239,0,.08);font-weight:900;color:#ffef00}.duck-close{position:absolute;right:12px;top:10px;background:rgba(0,0,0,.4);color:white;border:1px solid rgba(255,255,255,.2);border-radius:999px;width:32px;height:32px;font-weight:1000;cursor:pointer}.duck-table-nudge{position:absolute;left:18px;bottom:76px;z-index:6;display:flex;align-items:center;gap:8px;max-width:260px;border:1px solid rgba(255,239,0,.42);background:rgba(0,0,0,.48);border-radius:18px;padding:9px;color:#fff;font-weight:900;box-shadow:0 12px 28px rgba(0,0,0,.35)}.duck-table-nudge img{width:44px;height:44px;border-radius:50%;object-fit:contain;background:#111;border:2px solid #ffef00}@media(max-width:600px){.duck-guide-button{right:12px;bottom:74px}.duck-guide-panel{right:10px;bottom:126px;width:calc(100vw - 20px)}.duck-table-nudge{left:10px;right:10px;bottom:108px;max-width:none}}
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
      <div class="duck-quote">Duck Sauce: “${rule.duck}”</div>
      <ol class="duck-steps">${rule.steps.map(step => `<li>${step}</li>`).join("")}</ol>
      <div class="duck-tip">Tip: ${rule.tip}</div>
    `;
    document.querySelectorAll(".duck-tab").forEach(btn => btn.classList.toggle("active", btn.dataset.game === gameKey));
  }

  function injectTableNudge() {
    const stage = $(".hw-table-stage");
    if (!stage || $("#duckTableNudge")) return;
    const nudge = document.createElement("div");
    nudge.id = "duckTableNudge";
    nudge.className = "duck-table-nudge";
    nudge.innerHTML = `<img src="${DUCK_IMAGE}" alt="Duck Sauce" onerror="this.style.display='none'"> <span>Need rules? Tap How To Play before you donate points.</span>`;
    stage.append(nudge);
  }

  function injectGuide() {
    injectStyles();

    if (!$("#duckGuideButton")) {
      const btn = document.createElement("button");
      btn.id = "duckGuideButton";
      btn.className = "duck-guide-button";
      btn.type = "button";
      btn.innerHTML = `<img src="${DUCK_IMAGE}" alt="" onerror="this.style.display='none'"> <span>How To Play</span>`;
      document.body.append(btn);
      btn.addEventListener("click", () => {
        $("#duckGuidePanel")?.classList.toggle("open");
        renderRule(selectedGame());
      });
    }

    if (!$("#duckGuidePanel")) {
      const panel = document.createElement("aside");
      panel.id = "duckGuidePanel";
      panel.className = "duck-guide-panel";
      panel.innerHTML = `
        <button class="duck-close" id="duckGuideClose" type="button">×</button>
        <div class="duck-guide-head">
          <div class="duck-face"><img src="${DUCK_IMAGE}" alt="Duck Sauce" onerror="this.parentElement.textContent='🦆'"></div>
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
      document.body.append(panel);
      $("#duckGuideClose")?.addEventListener("click", () => panel.classList.remove("open"));
      panel.querySelectorAll(".duck-tab").forEach(tab => tab.addEventListener("click", () => renderRule(tab.dataset.game)));
      renderRule(selectedGame());
    }

    const gameSelect = $("#hwGameType");
    if (gameSelect && !gameSelect.dataset.duckBound) {
      gameSelect.dataset.duckBound = "true";
      gameSelect.addEventListener("change", e => renderRule(e.target.value));
    }

    injectTableNudge();
  }

  function bootWhenCasinoAppears() {
    injectGuide();
    const observer = new MutationObserver(() => injectGuide());
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootWhenCasinoAppears);
  else bootWhenCasinoAppears();
})();
