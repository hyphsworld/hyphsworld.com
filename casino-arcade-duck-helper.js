/* HYPHSWORLD Casino Arcade — Duck Sauce Helper
   Adds visible Duck Sauce image + simple solo/CPU/house instructions to casino-arcade.html.
*/
(function(){
  "use strict";

  const DUCK_IMAGE = "duck-sauce.png";
  const RULES = {
    crash: {
      title: "Crash",
      duck: "The rocket is the CPU. You pick a target, then the rocket either clears it or crashes before it gets there.",
      steps: [
        "Set Entry Power on the right.",
        "Pick a Target Multiplier.",
        "Tap Launch Crash.",
        "If the rocket clears your target, you win bonus Cool Points.",
        "If it crashes first, you lose no Cool Points — you just miss the bonus."
      ],
      goal: "Easy start: target 1.5x to 2.0x."
    },
    plinko: {
      title: "Plinko",
      duck: "The board is the CPU. You drop the ball and let the buckets decide your bonus.",
      steps: [
        "Set Entry Power.",
        "Tap Drop Ball.",
        "The ball falls through pegs into a bucket.",
        "Bigger bucket multiplier means bigger bonus.",
        "No real money. Cool Points only."
      ],
      goal: "This is the fastest game for casual users."
    },
    mines: {
      title: "Mines",
      duck: "The mines are hidden by the house. Open safe tiles and cash out before you hit a bomb.",
      steps: [
        "Choose how many mines are hidden.",
        "Tap Start Mines.",
        "Tap tiles one by one.",
        "Safe tiles raise your multiplier.",
        "Tap Cash Out before you hit a mine."
      ],
      goal: "Best beginner move: reveal 2 or 3 safe tiles, then cash out."
    },
    slots: {
      title: "Neon Slots",
      duck: "The reels are the CPU. Tap spin and watch for matching symbols, hidden tracks, and code icons.",
      steps: [
        "Set Entry Power.",
        "Tap Spin Reels.",
        "Three matching symbols hit a bonus.",
        "Special icons like TRACK or CODE push reward progress.",
        "At 50 reward points, hidden rewards can unlock."
      ],
      goal: "Slots should feel quick: spin, see result, run it back."
    },
    scratcher: {
      title: "Scratcher",
      duck: "Scratch all six panels. Three matching icons wins the bonus.",
      steps: [
        "Tap New Scratcher.",
        "Reveal all six tiles.",
        "Three matching icons wins.",
        "No match means no bonus, but your Cool Points stay safe."
      ],
      goal: "Simple game for new users. No strategy needed."
    },
    hilo: {
      title: "High-Low",
      duck: "The CPU flips the next card. You guess if it’s higher or lower than the current card.",
      steps: [
        "Look at the current card.",
        "Tap Higher or Lower.",
        "Correct guesses build a streak.",
        "A bigger streak means a bigger bonus.",
        "Wrong guess resets the streak."
      ],
      goal: "Start with simple logic: low cards usually guess higher, high cards usually guess lower."
    },
    roulette: {
      title: "Roulette",
      duck: "Pick a color. The wheel is the CPU. Red and black are safer, green is rare but bigger.",
      steps: [
        "Choose Red, Black, or Green.",
        "Tap Spin Wheel.",
        "If your color lands, you win a Cool Points bonus.",
        "Green is rare but pays more.",
        "Again: no real-money payout."
      ],
      goal: "Red/Black for steady play. Green for wild Duck Sauce energy."
    }
  };

  const $ = (q, r=document) => r.querySelector(q);
  const $$ = (q, r=document) => Array.from(r.querySelectorAll(q));

  function activeGame(){
    const tile = $(".casino-game-tile.is-active") || $("[data-game].is-active");
    return tile?.dataset?.game || "crash";
  }

  function injectStyles(){
    if($("#arcadeDuckStyles")) return;
    const style = document.createElement("style");
    style.id = "arcadeDuckStyles";
    style.textContent = `
      .arcade-duck-helper{position:relative;margin:16px 0;padding:14px;border:2px dashed rgba(57,255,20,.55);border-radius:24px;background:radial-gradient(circle at 0% 0%,rgba(255,43,214,.22),transparent 32%),linear-gradient(135deg,rgba(0,0,0,.5),rgba(57,255,20,.08));box-shadow:0 16px 34px rgba(0,0,0,.28);overflow:hidden}.arcade-duck-helper:after{content:"DUCK SAUCE GUIDE";position:absolute;right:-20px;bottom:8px;opacity:.13;font-size:34px;font-weight:1000;letter-spacing:.08em;transform:rotate(-7deg);color:#fff;text-shadow:3px 3px 0 #ff2bd6,-3px -2px 0 #39ff14;pointer-events:none}.arcade-duck-head{display:flex;gap:12px;align-items:center;margin-bottom:10px}.arcade-duck-face{width:72px;height:72px;border-radius:50%;display:grid;place-items:center;background:#101010;border:3px solid #39ff14;box-shadow:0 0 22px rgba(57,255,20,.25);overflow:hidden;flex:0 0 auto}.arcade-duck-face img{width:100%;height:100%;object-fit:contain;transform:scale(1.18)}.arcade-duck-kicker{color:#39ff14;font-size:12px;font-weight:1000;letter-spacing:.14em;text-transform:uppercase}.arcade-duck-title{margin:2px 0 0;font-size:clamp(20px,4vw,30px);line-height:1;text-transform:uppercase}.arcade-duck-bubble{border-left:5px solid #ffe600;background:rgba(0,0,0,.34);border-radius:14px;padding:10px;margin:10px 0;font-weight:900}.arcade-duck-steps{margin:10px 0 0;padding-left:22px}.arcade-duck-steps li{margin:7px 0;font-weight:800}.arcade-duck-goal{margin-top:12px;padding:10px;border-radius:16px;color:#050505;background:linear-gradient(135deg,#39ff14,#ffe600,#00e5ff);font-weight:1000}.arcade-duck-tabs{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.arcade-duck-tab{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#fff;border-radius:999px;padding:7px 9px;font-weight:1000;font-size:12px;cursor:pointer}.arcade-duck-tab.active{background:#39ff14;color:#050505}.arcade-duck-float{position:fixed;right:14px;top:154px;z-index:10000;border:2px solid #39ff14;border-radius:999px;background:linear-gradient(135deg,#39ff14,#ffe600,#ff2bd6,#00e5ff);color:#050505;font-weight:1000;text-transform:uppercase;letter-spacing:.05em;padding:8px 12px;display:flex;align-items:center;gap:7px;box-shadow:0 14px 30px rgba(0,0,0,.35);cursor:pointer}.arcade-duck-float img{width:36px;height:36px;border-radius:50%;object-fit:contain;background:#111}@media(max-width:700px){.arcade-duck-float{top:auto;right:10px;bottom:92px}.arcade-duck-helper{margin-top:12px}.arcade-duck-face{width:60px;height:60px}}
    `;
    document.head.append(style);
  }

  function ruleHtml(game){
    const rule = RULES[game] || RULES.crash;
    return `
      <div class="arcade-duck-head">
        <div class="arcade-duck-face"><img src="${DUCK_IMAGE}" alt="Duck Sauce" onerror="this.parentElement.textContent='🦆'"></div>
        <div>
          <div class="arcade-duck-kicker">Duck Sauce Explains</div>
          <h3 class="arcade-duck-title">${rule.title}</h3>
        </div>
      </div>
      <div class="arcade-duck-bubble">Duck Sauce: “${rule.duck}”</div>
      <ol class="arcade-duck-steps">${rule.steps.map(step => `<li>${step}</li>`).join("")}</ol>
      <div class="arcade-duck-goal">${rule.goal}</div>
      <div class="arcade-duck-tabs">
        ${Object.keys(RULES).map(key => `<button class="arcade-duck-tab ${key===game?"active":""}" type="button" data-duck-game="${key}">${RULES[key].title}</button>`).join("")}
      </div>
    `;
  }

  function render(game=activeGame()){
    const panel = $("#arcadeDuckHelper");
    if(!panel) return;
    panel.innerHTML = ruleHtml(game);
    $$('[data-duck-game]', panel).forEach(btn => btn.addEventListener('click', () => render(btn.dataset.duckGame)));
  }

  function inject(){
    injectStyles();
    if(!$("#arcadeDuckHelper")){
      const helper = document.createElement("section");
      helper.id = "arcadeDuckHelper";
      helper.className = "arcade-duck-helper";
      const control = $(".casino-control-panel");
      const hero = $(".casino-hero-copy");
      if(control){
        const desc = $("#casinoGameDescription", control);
        if(desc) desc.insertAdjacentElement("afterend", helper);
        else control.prepend(helper);
      } else if(hero){
        hero.append(helper);
      } else {
        document.body.append(helper);
      }
    }
    if(!$("#arcadeDuckFloat")){
      const float = document.createElement("button");
      float.id = "arcadeDuckFloat";
      float.className = "arcade-duck-float";
      float.type = "button";
      float.innerHTML = `<img src="${DUCK_IMAGE}" alt="" onerror="this.style.display='none'"><span>How To Play</span>`;
      document.body.append(float);
      float.addEventListener("click", () => {
        const helper = $("#arcadeDuckHelper");
        if(helper){
          helper.scrollIntoView({behavior:"smooth", block:"center"});
          helper.classList.add("reward-flash");
          setTimeout(()=>helper.classList.remove("reward-flash"),700);
        }
      });
    }
    render();
  }

  function bindGameChanges(){
    $$('[data-game]').forEach(btn => {
      if(btn.dataset.duckArcadeBound) return;
      btn.dataset.duckArcadeBound = "true";
      btn.addEventListener("click", () => setTimeout(() => render(btn.dataset.game), 60));
    });
  }

  function boot(){
    inject();
    bindGameChanges();
    const observer = new MutationObserver(() => { inject(); bindGameChanges(); });
    observer.observe(document.documentElement, {childList:true, subtree:true});
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
