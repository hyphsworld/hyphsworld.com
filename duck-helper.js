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
    s.textContent=".hw-duck-guide{display:none!important}.duckBox{position:fixed;left:16px;top:170px;width:92px;height:92px;z-index:2147483000;touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab}.duckBox:active{cursor:grabbing}.duckBox.off{display:none}.duckBox::before{content:'DRAG';position:absolute;left:50%;top:-18px;transform:translateX(-50%);padding:4px 8px;border-radius:999px;background:linear-gradient(90deg,#39ff14,#ffe600,#ff2bd6,#00e5ff);color:#050505;font:1000 10px/1 system-ui;letter-spacing:.12em;box-shadow:0 0 18px rgba(57,255,20,.28)}.duckBox::after{content:'';position:absolute;inset:-8px;border-radius:50%;border:2px dashed rgba(57,255,20,.45);animation:duckOrbit 2.8s linear infinite;pointer-events:none}.duckFace{width:92px;height:92px;border:0;background:transparent;padding:0;cursor:inherit;filter:drop-shadow(0 14px 22px rgba(0,0,0,.52)) drop-shadow(0 0 14px rgba(57,255,20,.18));animation:duckBob 2.2s ease-in-out infinite alternate}.duckFace img{width:100%;height:100%;object-fit:contain}.duckTalk{position:absolute;left:78px;top:-6px;width:min(68vw,238px);display:none;padding:9px 10px;border-radius:14px;background:linear-gradient(135deg,rgba(6,8,9,.96),rgba(18,8,28,.94));color:#fff;border:2px solid rgba(31,252,255,.30);box-shadow:0 12px 28px rgba(0,0,0,.42),0 0 18px rgba(57,255,20,.08);font:800 12px/1.28 system-ui}.duckTalk.show{display:block}.duckTalk strong{display:block;color:#39ff14;font-size:9px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:3px}.duckTalk span{display:block}.duckBtns{display:flex;gap:5px;margin-top:7px;flex-wrap:wrap}.duckBtns button,.duckReturn{border:0;border-radius:999px;padding:6px 8px;font:1000 9px/1 system-ui;cursor:pointer}.duckBtns button:first-child,.duckReturn{color:#050505;background:linear-gradient(135deg,#39ff14,#ffe600,#ff2bd6,#00e5ff)}.duckBtns button:last-child{color:#fff;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18)}.duckReturn{position:fixed;left:14px;bottom:88px;z-index:2147482999;display:none;text-transform:uppercase;box-shadow:0 0 22px rgba(57,255,20,.22)}.duckReturn.on{display:block}@keyframes duckBob{from{transform:translateY(0) rotate(-2deg)}to{transform:translateY(-8px) rotate(2deg)}}@keyframes duckOrbit{to{transform:rotate(360deg)}}@media(max-width:700px){.duckBox{width:78px;height:78px;top:auto;bottom:118px;left:18px}.duckFace{width:78px;height:78px}.duckTalk{left:0;top:auto;bottom:82px;width:min(76vw,238px);padding:8px 9px;border-radius:13px;font-size:11px;line-height:1.24}.duckTalk strong{font-size:8px}.duckBtns{gap:4px;margin-top:6px}.duckBtns button{padding:6px 7px;font-size:8px}.duckBox::before{top:-17px;font-size:9px}}";
    document.head.appendChild(s);
  }
  function pageText(){
    var p=location.pathname.toLowerCase();
    if(p.indexOf("leaderboard")>-1)return"Leaderboard: see who is earning Cool Points and climbing the board.";
    if(p.indexOf("casino")>-1)return"Casino Arcade: pick a game, read the controls, and use Cool Points only.";
    if(p.indexOf("vault")>-1)return"Lobby/Vault: drag me anywhere. Run the scan, enter the code, and let Buck clear the door.";
    if(p.indexOf("games")>-1)return"Games: pick a game and sign in so progress can stay with you.";
    if(p.indexOf("app-player")>-1||p.indexOf("player")>-1||p.indexOf("music")>-1)return"Player: tap a record, play music, and keep your HYPHSWORLD motion clean.";
    if(p.indexOf("shop")>-1||p.indexOf("point-store")>-1)return"Shop and rewards: check merch, drops, and point unlocks here.";
    if(p.indexOf("booking")>-1)return"Booking: use this page for shows, features, business, and direct contact.";
    if(p.indexOf("visuals")>-1)return"Visuals: watch videos, trailers, and 01 Show motion here.";
    if(p.indexOf("socials")>-1)return"Socials: follow the official HYPHSWORLD and AMS WEST channels here.";
    if(p.indexOf("auth")>-1||p.indexOf("account")>-1)return"Manage ID: sign in so points and rewards stay with your account.";
    return"Homepage: drag Duck anywhere. Tap me for help. Hide me when you need the screen clear.";
  }
  function say(t,hold){var b=$("#duckTalk"),x=$("#duckText");if(!b||!x)return;x.textContent=t;b.classList.add("show");clearTimeout(b._t);if(!hold)b._t=setTimeout(function(){b.classList.remove("show")},6000)}
  function hide(){var d=$("#duckBox"),r=$("#duckReturn");if(d)d.classList.add("off");if(r)r.classList.add("on");save({off:true})}
  function show(){var d=$("#duckBox"),r=$("#duckReturn");if(d)d.classList.remove("off");if(r)r.classList.remove("on");save({off:false});say(pageText(),true)}
  function context(el){return null}
  function drag(box){
    var down=false,moved=false,sx=0,sy=0,bx=0,by=0,st=state();
    if(Number.isFinite(st.x)&&Number.isFinite(st.y)){box.style.left=st.x+"px";box.style.top=st.y+"px";box.style.bottom="auto"}
    function start(e){var p=e.touches?e.touches[0]:e;down=true;moved=false;sx=p.clientX;sy=p.clientY;var r=box.getBoundingClientRect();bx=r.left;by=r.top;box.style.bottom="auto";e.preventDefault()}
    function move(e){if(!down)return;var p=e.touches?e.touches[0]:e,dx=p.clientX-sx,dy=p.clientY-sy;if(Math.abs(dx)+Math.abs(dy)>6)moved=true;var x=Math.max(6,Math.min(innerWidth-box.offsetWidth-6,bx+dx)),y=Math.max(6,Math.min(innerHeight-box.offsetHeight-6,by+dy));box.style.left=x+"px";box.style.top=y+"px";e.preventDefault()}
    function end(){if(!down)return;down=false;var r=box.getBoundingClientRect();save({x:Math.round(r.left),y:Math.round(r.top)});setTimeout(function(){moved=false},80)}
    function openDuck(e){if(moved)return;e.preventDefault();e.stopPropagation();say(pageText(),true)}
    box.addEventListener("mousedown",start);box.addEventListener("touchstart",start,{passive:false});box.addEventListener("pointerdown",start);addEventListener("mousemove",move,{passive:false});addEventListener("touchmove",move,{passive:false});addEventListener("pointermove",move,{passive:false});addEventListener("mouseup",end);addEventListener("touchend",end);addEventListener("pointerup",end);
    $("#duckFace").addEventListener("click",openDuck);
    $("#duckFace").addEventListener("touchend",openDuck,{passive:false});
    $("#duckFace").addEventListener("pointerup",openDuck);
  }
  function boot(){
    css();
    document.querySelectorAll(".hw-duck-guide").forEach(function(el){el.style.display="none"});
    if($("#duckBox"))return;
    var st=state();
    var d=document.createElement("div");d.id="duckBox";d.className="duckBox"+(st.off?" off":"");
    d.innerHTML="<button id='duckFace' class='duckFace' type='button' aria-label='Duck Sauce help'><img src='"+IMG+"' alt='Duck Sauce'></button><div id='duckTalk' class='duckTalk'><strong>Duck Sauce</strong><span id='duckText'></span><div class='duckBtns'><button id='duckHelp' type='button'>Page Help</button><button id='duckHide' type='button'>Hide Duck</button></div></div>";
    var r=document.createElement("button");r.id="duckReturn";r.className="duckReturn"+(st.off?" on":"");r.type="button";r.textContent="Duck";
    document.body.append(d,r);
    drag(d);
    $("#duckHelp").onclick=function(e){e.stopPropagation();say(pageText(),true)};
    $("#duckHide").onclick=function(e){e.stopPropagation();hide()};
    r.onclick=show;
    if(!st.off)setTimeout(function(){say(pageText())},700)
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
