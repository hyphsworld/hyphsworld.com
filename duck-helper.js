(function(){
  "use strict";
  var IMG="duck-sauce.png";
  var KEY="duck_helper_pos";
  function $(q){return document.querySelector(q)}
  function state(){try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){return {}}}
  function save(o){try{localStorage.setItem(KEY,JSON.stringify(Object.assign(state(),o)))}catch(e){}}
  function css(){
    if($("#duckStyle"))return;
    var s=document.createElement("style");
    s.id="duckStyle";
    s.textContent=".hw-duck-guide{display:none!important}.duckBox{position:fixed;left:16px;top:170px;width:82px;height:82px;z-index:2147483000;touch-action:none;user-select:none}.duckBox.off{display:none}.duckFace{width:82px;height:82px;border:0;background:transparent;padding:0;cursor:grab;filter:drop-shadow(0 12px 18px rgba(0,0,0,.45))}.duckFace img{width:100%;height:100%;object-fit:contain}.duckTalk{position:absolute;left:72px;top:-6px;width:min(78vw,310px);display:none;padding:12px 13px;border-radius:16px;background:rgba(5,8,6,.94);color:#fff;border:2px solid rgba(255,255,255,.18);box-shadow:0 18px 35px rgba(0,0,0,.4);font:800 14px/1.35 system-ui}.duckTalk.show{display:block}.duckTalk strong{display:block;color:#39ff14;font-size:11px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:4px}.duckBtns{display:flex;gap:7px;margin-top:9px;flex-wrap:wrap}.duckBtns button,.duckReturn{border:0;border-radius:999px;padding:7px 9px;font:900 11px/1 system-ui;cursor:pointer}.duckBtns button:first-child,.duckReturn{color:#050505;background:linear-gradient(135deg,#39ff14,#ffe600,#ff2bd6,#00e5ff)}.duckBtns button:last-child{color:#fff;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18)}.duckReturn{position:fixed;left:14px;bottom:88px;z-index:2147482999;display:none;text-transform:uppercase}.duckReturn.on{display:block}@media(max-width:700px){.duckBox{width:70px;height:70px;top:auto;bottom:118px}.duckFace{width:70px;height:70px}.duckTalk{left:0;top:auto;bottom:78px;width:min(88vw,320px)}}";
    document.head.appendChild(s);
  }
  function pageText(){
    var p=location.pathname.toLowerCase();
    if(p.indexOf("leaderboard")>-1)return"Leaderboard: see who is earning Cool Points and climbing the board.";
    if(p.indexOf("casino")>-1)return"Casino Arcade: pick a game, read the controls, and use Cool Points only.";
    if(p.indexOf("vault")>-1)return"Vault: unlock levels and hidden drops from here.";
    if(p.indexOf("games")>-1)return"Games: pick a game and sign in so progress can stay with you.";
    if(p.indexOf("app-player")>-1)return"Full Player: use this page for the clean music listening view.";
    if(p.indexOf("shop")>-1)return"Merch: check the drops and AMS WEST items here.";
    if(p.indexOf("auth")>-1||p.indexOf("account")>-1)return"Manage ID: sign in so points and rewards stay with your account.";
    return"Tap Duck for help. Drag Duck anywhere. Hide Duck when you need the screen clear.";
  }
  function say(t,hold){var b=$("#duckTalk"),x=$("#duckText");if(!b||!x)return;x.textContent=t;b.classList.add("show");clearTimeout(b._t);if(!hold)b._t=setTimeout(function(){b.classList.remove("show")},6000)}
  function hide(){var d=$("#duckBox"),r=$("#duckReturn");if(d)d.classList.add("off");if(r)r.classList.add("on");save({off:true})}
  function show(){var d=$("#duckBox"),r=$("#duckReturn");if(d)d.classList.remove("off");if(r)r.classList.remove("on");save({off:false});say(pageText())}
  function context(el){
    var game=el.dataset&&el.dataset.game;
    if(game==="crash")return"Crash: set Entry Power, choose a target, then launch. Clear the target to earn bonus progress.";
    if(game==="plinko")return"Plinko: drop the ball. The board picks your bonus path.";
    if(game==="mines")return"Mines: open safe tiles, then stop when you like the bonus.";
    if(game==="slots")return"Slots: press Spin. Matching symbols and special icons push rewards.";
    if(game==="scratcher")return"Scratcher: reveal all panels. Matching icons win a bonus.";
    if(game==="hilo")return"High-Low: guess higher or lower. Correct calls build a streak.";
    if(game==="roulette")return"Roulette: pick a color, then spin. Rare colors give bigger bonus progress.";
    var t=[el.textContent,el.getAttribute("aria-label"),el.href,el.id,String(el.className||"")].filter(Boolean).join(" ").toLowerCase();
    if(t.indexOf("leader")>-1)return"Leaderboard: this shows rankings and Cool Points activity.";
    if(t.indexOf("casino")>-1||t.indexOf("arcade")>-1)return"Casino Arcade: select a game, set Entry Power, then press the game button.";
    if(t.indexOf("vault")>-1)return"Vault: use access paths to reach hidden music and levels.";
    if(t.indexOf("game")>-1)return"Games: choose a game and keep earning progress.";
    if(t.indexOf("player")>-1||t.indexOf("music")>-1)return"Player: this is for music playback.";
    if(t.indexOf("merch")>-1||t.indexOf("shop")>-1)return"Merch: check products and drops here.";
    if(t.indexOf("manage")>-1||t.indexOf("login")>-1||t.indexOf("account")>-1||t.indexOf("id")>-1)return"Manage ID: sign in so points and rewards stay saved.";
    if(t.indexOf("home")>-1)return"Home: main HYPHSWORLD landing page.";
    return null;
  }
  function drag(box){
    var down=false,moved=false,sx=0,sy=0,bx=0,by=0,st=state();
    if(Number.isFinite(st.x)&&Number.isFinite(st.y)){box.style.left=st.x+"px";box.style.top=st.y+"px";box.style.bottom="auto"}
    function start(e){var p=e.touches?e.touches[0]:e;down=true;moved=false;sx=p.clientX;sy=p.clientY;var r=box.getBoundingClientRect();bx=r.left;by=r.top;box.style.bottom="auto";e.preventDefault()}
    function move(e){if(!down)return;var p=e.touches?e.touches[0]:e,dx=p.clientX-sx,dy=p.clientY-sy;if(Math.abs(dx)+Math.abs(dy)>6)moved=true;var x=Math.max(6,Math.min(innerWidth-box.offsetWidth-6,bx+dx)),y=Math.max(6,Math.min(innerHeight-box.offsetHeight-6,by+dy));box.style.left=x+"px";box.style.top=y+"px";e.preventDefault()}
    function end(){if(!down)return;down=false;var r=box.getBoundingClientRect();save({x:Math.round(r.left),y:Math.round(r.top)});setTimeout(function(){moved=false},50)}
    box.addEventListener("mousedown",start);box.addEventListener("touchstart",start,{passive:false});addEventListener("mousemove",move,{passive:false});addEventListener("touchmove",move,{passive:false});addEventListener("mouseup",end);addEventListener("touchend",end);$("#duckFace").addEventListener("click",function(){if(!moved)say(pageText(),true)})
  }
  function boot(){
    css();
    document.querySelectorAll(".hw-duck-guide").forEach(function(el){el.style.display="none"});
    if($("#duckBox"))return;
    var st=state();
    var d=document.createElement("div");d.id="duckBox";d.className="duckBox"+(st.off?" off":"");
    d.innerHTML="<button id='duckFace' class='duckFace' type='button'><img src='"+IMG+"' alt='Duck Sauce'></button><div id='duckTalk' class='duckTalk'><strong>Duck Sauce</strong><span id='duckText'></span><div class='duckBtns'><button id='duckHelp' type='button'>Page Help</button><button id='duckHide' type='button'>Hide Duck</button></div></div>";
    var r=document.createElement("button");r.id="duckReturn";r.className="duckReturn"+(st.off?" on":"");r.type="button";r.textContent="Duck";
    document.body.append(d,r);drag(d);$("#duckHelp").onclick=function(){say(pageText(),true)};$("#duckHide").onclick=hide;r.onclick=show;
    document.addEventListener("click",function(e){var el=e.target.closest("a,button,[data-game],[role='tab']");if(!el||el.closest("#duckBox")||el.closest("#duckReturn"))return;var t=context(el);if(t)setTimeout(function(){say(t)},80)},true);
    if(!st.off)setTimeout(function(){say(pageText())},700)
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
