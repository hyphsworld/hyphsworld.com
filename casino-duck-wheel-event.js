/* HYPHSWORLD Casino Arcade — Duck Sauce Wheel Choice Event
   Restores the roulette moment where users choose to help Duck Sauce or leave him.
*/
(function(){
  "use strict";

  var LP = "hyphsworld.coolPoints.total";
  var RK = "hyphsworld.casinoArcade.recent";
  var $ = function(q, r){ return (r || document).querySelector(q); };
  var $$ = function(q, r){ return Array.prototype.slice.call((r || document).querySelectorAll(q)); };
  var activeEvent = false;
  var wheelRot = 0;

  function num(v){ var n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : 0; }
  function fmt(v){ return new Intl.NumberFormat("en-US").format(num(v)); }
  function power(){ var i = $("#casinoPowerInput"); return Math.max(1, Math.min(1000, num(i && i.value) || 25)); }
  function setStatus(text){ var s = $("#casinoStatus"); if(s) s.textContent = 'Duck Sauce: “' + text + '”'; }
  function localPoints(){ try { return num(localStorage.getItem(LP)); } catch(e){ return 0; } }
  function setLocalPoints(v){ try { localStorage.setItem(LP, String(Math.max(0, num(v)))); } catch(e){} }
  function addLocalPoints(points){
    points = Math.max(0, Math.round(points || 0));
    if(!points) return;
    var next = localPoints() + points;
    setLocalPoints(next);
    var cp = $("#casinoPoints");
    if(cp) cp.textContent = fmt(next);
  }
  function safe(v){ return String(v || "").replace(/[<>]/g, "").trim(); }
  function recent(){ try { return JSON.parse(localStorage.getItem(RK) || "[]"); } catch(e){ return []; } }
  function saveRecent(g, p, r){
    var list = [{ g:g, p:p, r:r }].concat(recent()).slice(0,5);
    try { localStorage.setItem(RK, JSON.stringify(list)); } catch(e){}
    var box = $("#casinoRecentList");
    if(box){
      box.innerHTML = list.length ? list.map(function(x){ return '<span>' + safe(x.g) + ' • +' + fmt(x.p) + ' • ' + safe(x.r) + '</span>'; }).join("") : '<span>No hits yet.</span>';
    }
  }

  function injectStyles(){
    if($("#duckWheelEventStyles")) return;
    var style = document.createElement("style");
    style.id = "duckWheelEventStyles";
    style.textContent = "\
      .duck-wheel-choice{position:absolute;inset:14px;z-index:20;display:grid;place-items:center;padding:16px;border-radius:28px;background:radial-gradient(circle at 50% 10%,rgba(255,230,0,.26),transparent 35%),radial-gradient(circle at 0 90%,rgba(255,43,214,.25),transparent 35%),rgba(0,0,0,.72);backdrop-filter:blur(6px);border:2px dashed rgba(57,255,122,.65);box-shadow:0 22px 50px rgba(0,0,0,.46)}\
      .duck-wheel-card{max-width:520px;text-align:center;color:#fff}\
      .duck-wheel-duck{width:110px;height:110px;margin:0 auto 10px;border-radius:50%;object-fit:contain;background:#111;border:3px solid #ffe45c;box-shadow:0 0 28px rgba(255,230,0,.35)}\
      .duck-wheel-card h3{margin:0 0 8px;font-size:clamp(1.7rem,7vw,3rem);line-height:.88;text-transform:uppercase;text-shadow:3px 3px 0 #ff2bd6,-2px -2px 0 #39ff7a}\
      .duck-wheel-card p{margin:8px auto 14px;max-width:420px;font-weight:900;color:#eafff4}\
      .duck-wheel-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}\
      .duck-wheel-actions button{border:0;border-radius:999px;padding:12px 15px;font-weight:1000;text-transform:uppercase;letter-spacing:.04em;cursor:pointer;color:#050507;background:linear-gradient(135deg,#39ff7a,#ffe45c,#1ffcff);box-shadow:0 12px 22px rgba(0,0,0,.32)}\
      .duck-wheel-actions button.leave{color:#fff;background:linear-gradient(135deg,#ff2bd6,#191919)}\
      .duck-wheel-note{display:inline-block;margin-top:12px;border-radius:999px;padding:7px 10px;color:#050507;background:#ffe45c;font-size:12px;font-weight:1000;text-transform:uppercase}\
    ";
    document.head.appendChild(style);
  }

  function spinWheelVisual(label){
    var wheel = $("#rouletteWheel");
    wheelRot += 720 + Math.floor(Math.random() * 720);
    if(wheel) wheel.style.transform = "rotate(" + wheelRot + "deg)";
    var result = $("#rouletteResult");
    if(result) result.innerHTML = label;
  }

  function normalRoulette(){
    var pick = String($("#roulettePickInput") && $("#roulettePickInput").value || "red");
    var roll = Math.random();
    var result = roll < .06 ? "green" : roll < .53 ? "red" : "black";
    var multiplier = result === "green" ? 14 : 2;
    var win = result === pick;
    spinWheelVisual(result.toUpperCase() + "<br>" + (win ? "HIT" : "MISS"));
    var points = win ? power() * multiplier : 0;
    if(points){
      addLocalPoints(points);
      saveRecent("Roulette", points, result + " hit");
      setStatus("Roulette hit +" + fmt(points) + " Cool Points. Duck watched that spin closely.");
    } else {
      saveRecent("Roulette", 0, result + " miss");
      setStatus("Roulette missed. Cool Points stayed safe.");
    }
  }

  function showDuckChoice(){
    var stage = $("#casinoStage");
    if(!stage || activeEvent) return;
    activeEvent = true;
    spinWheelVisual("DUCK<br>EVENT");
    setStatus("Duck Sauce got caught in the wheel. Are you helping him or leaving him spinning?");
    var choice = document.createElement("div");
    choice.className = "duck-wheel-choice";
    choice.id = "duckWheelChoice";
    choice.innerHTML = '\
      <div class="duck-wheel-card">\
        <img class="duck-wheel-duck" src="duck-sauce.png" alt="Duck Sauce" onerror="this.style.display=\'none\'">\
        <h3>Duck Sauce<br>Wheel Event</h3>\
        <p>Duck Sauce is stuck in the bonus wheel talking crazy. Help him out or leave him spinning?</p>\
        <div class="duck-wheel-actions">\
          <button type="button" data-duck-choice="help">Help Duck</button>\
          <button type="button" class="leave" data-duck-choice="leave">Leave Duck</button>\
        </div>\
        <span class="duck-wheel-note">No point loss — story choice only</span>\
      </div>';
    stage.appendChild(choice);
  }

  function resolveChoice(choice){
    var overlay = $("#duckWheelChoice");
    if(overlay) overlay.remove();
    activeEvent = false;
    var base = power();
    var points = 0;
    var result = "";
    if(choice === "help"){
      points = base * 5 + 25;
      result = "helped Duck";
      spinWheelVisual("HELPED<br>DUCK");
      setStatus("You helped Duck Sauce. He dropped +" + fmt(points) + " Cool Points and said you still owe him a favor.");
    } else {
      points = Math.max(10, Math.floor(base / 2));
      result = "left Duck";
      spinWheelVisual("LEFT<br>DUCK");
      setStatus("You left Duck spinning. He roasted you but still threw +" + fmt(points) + " petty points.");
    }
    addLocalPoints(points);
    saveRecent("Duck Wheel", points, result);
  }

  function interceptRouletteClick(event){
    var btn = event.target.closest('[data-action="roulette-spin"]');
    if(!btn) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if(Math.random() < 0.35){
      showDuckChoice();
    } else {
      normalRoulette();
    }
  }

  function bind(){
    injectStyles();
    document.addEventListener("click", interceptRouletteClick, true);
    document.addEventListener("click", function(event){
      var choice = event.target.closest("[data-duck-choice]");
      if(!choice) return;
      event.preventDefault();
      resolveChoice(choice.dataset.duckChoice);
    }, true);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
