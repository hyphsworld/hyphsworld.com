(function(){
  "use strict";

  var VERSION="global-duck-20260720-mobile-pointer-1";
  var IMG_VERSION="duck-reload-20260509-slick-talk-1";
  var IMG_FALLBACKS=["duck-sauce.png","duck-sauce.jpg","./duck-sauce.png","./duck-sauce.jpg"];
  var KEY="duck_helper_pos";
  var HIDE_KEY="duck_helper_hidden_hint_seen";
  var VERSION_KEY="duck_helper_version";
  var TAP_KEY="duck_helper_tap_count";
  var lastTap=0;
  var lineIndex=0;
  var tapCount=0;

  function $(q){return document.querySelector(q)}
  function state(){try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){return {}}}
  function save(o){try{localStorage.setItem(KEY,JSON.stringify(Object.assign(state(),o)))}catch(e){}}
  function store(key,value){try{localStorage.setItem(key,String(value))}catch(e){}}
  function read(key){try{return localStorage.getItem(key)}catch(e){return null}}
  function busted(src){return src+(src.indexOf("?")>-1?"&":"?")+"v="+IMG_VERSION}

  var GENERAL_LINES=[
    "Tap me for help anytime. I can point you to the Lobby, Music, Games, Leaderboards, Full Player, Merch, and account tools.",
    "Create an ID if you want your Cool Points and progress to stay connected across visits.",
    "If a video starts muted, that is normal. Tap play or unmute when your browser allows it.",
    "The Vault is the scanner route. Enter the code, run the scan, and follow the Level 1 prompts.",
    "Games help you stack progress. Leaderboards show who is really moving through HYPHSWORLD.",
    "The casino is earned. No direct URL access. You have to unlock it through progress.",
    "Drag me anywhere if I am blocking the screen. Double-tap me if you want me hidden.",
    "Rewards unlock clues, routes, codes, hidden tracks, and future access moments. Keep checking the chart.",
    "If something does not load right away, refresh once and give the page a moment.",
    "Welcome to HYPHSWORLD. Explore the rooms, earn access, and let the system open up step by step."
  ];

  var SLICK_LINES=[
    "Aight now you just tapping to tap. I respect the curiosity, but the buttons work too.",
    "You trying to wake me up or summon customer service? I’m right here.",
    "Tap number fifty is not a secret code. Nice try though.",
    "I know I’m helpful, but you wearing out my feathers.",
    "You keep tapping like there’s a hidden Grammy in here.",
    "Relax. I’m Duck Sauce, not a vending machine.",
    "If you tap me one more time I’m charging Cool Points for emotional labor.",
    "This is not a rhythm game, but your thumb got ambition.",
    "I already told you the sauce. Now go earn something.",
    "Okay speed tapper, next move is yours: Vault, Games, Music, or chill."
  ];

  var PAGE_LINES={
    leaderboard:["Leaderboard shows Cool Points and game progress. Check both tabs to see the full race.","The board may take a second to load if the database is warming up.","Climb the board by playing, earning, and keeping your progress connected to your account."],
    casino:["Casino access is earned. If you are here, the system should have unlocked you.","Watch the rewards chart. Clues, codes, and hidden drops build from progress.","Play smart. The casino rewards progress, not random direct URL visitors."],
    vault:["Vault scanner is the Level 1 route. Enter the code, run the scan, and let the access system work.","The new cyber scanner checks the route before transport opens.","If the casino says locked, that is correct. Earn access first."],
    games:["Games are where progress starts moving. Play rounds, collect points, and look for unlock paths.","Some unlocks are hidden behind repeated progress, not one click.","Sign in before grinding if you want progress to follow you."],
    player:["The Full Player is the main listening room. Tap a track and let it play.","If audio does not start, tap Play again. Mobile browsers sometimes need that.","Music, rewards, and hidden routes can connect later as the world evolves."],
    shop:["Shop and rewards can connect over time. Stack points and watch for unlockable drops.","Some future merch moments can be tied to Cool Points and hidden access.","If something says locked, it may need a reward trigger first."],
    booking:["Booking requests work best with date, city, budget, and the type of request.","Keep business messages clear and direct so AMS WEST can respond cleanly.","Features, shows, interviews, and brand moves can start here."],
    visuals:["Visuals are for trailers, motion, 01 Show energy, and cinematic drops.","If an embed is slow, refresh once or tap play again.","Future visuals can unlock through rewards and secret routes."],
    socials:["Use the official links here to tap in and share HYPHSWORLD.","Follow the real channels and keep the motion going.","Social links are the safest route to official updates."],
    auth:["Create ID or login to keep your Cool Points and progress attached.","Use an email you can access so reset and account tools work smoothly.","Your account is how the world remembers your movement."],
    home:["Homepage starts the experience. Use the top buttons to move through the world.","Tap me for help. Double-tap me to hide. Drag me if I block the screen.","Start with the Lobby, Music, Games, Leaderboards, or Merch. Earn your way deeper."]
  };

  function pageKey(){var p=location.pathname.toLowerCase();if(p.indexOf("leaderboard")>-1)return"leaderboard";if(p.indexOf("casino")>-1)return"casino";if(p.indexOf("vault")>-1||p.indexOf("floor")>-1||p.indexOf("level")>-1)return"vault";if(p.indexOf("games")>-1)return"games";if(p.indexOf("app-player")>-1||p.indexOf("player")>-1||p.indexOf("music")>-1)return"player";if(p.indexOf("shop")>-1||p.indexOf("point-store")>-1||p.indexOf("merch")>-1)return"shop";if(p.indexOf("booking")>-1||p.indexOf("contact")>-1)return"booking";if(p.indexOf("visuals")>-1||p.indexOf("video")>-1)return"visuals";if(p.indexOf("socials")>-1)return"socials";if(p.indexOf("auth")>-1||p.indexOf("account")>-1||p.indexOf("login")>-1)return"auth";return"home";}
  function nextLine(){var list=(PAGE_LINES[pageKey()]||PAGE_LINES.home).concat(GENERAL_LINES);var msg=list[lineIndex%list.length];lineIndex++;return msg;}
  function nextSlick(){return SLICK_LINES[tapCount%SLICK_LINES.length];}
  function css(){if($("#duckStyle"))return;var s=document.createElement("style");s.id="duckStyle";s.textContent=".hw-duck-guide{display:none!important}.duckBox{position:fixed;left:16px;top:170px;width:92px;height:92px;z-index:2147483000;touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab}.duckBox:active{cursor:grabbing}.duckBox.off{display:none}.duckBox::before{content:'TAP HELP';position:absolute;left:50%;top:-18px;transform:translateX(-50%);padding:4px 8px;border-radius:999px;background:linear-gradient(90deg,#39ff14,#ffe600,#ff2bd6,#00e5ff);color:#050505;font:1000 10px/1 system-ui;letter-spacing:.08em;box-shadow:0 0 18px rgba(57,255,20,.28);white-space:nowrap}.duckBox.slick::before{content:'SLICK MODE'}.duckBox::after{content:'';position:absolute;inset:-8px;border-radius:50%;border:2px dashed rgba(57,255,20,.45);animation:duckOrbit 2.8s linear infinite;pointer-events:none}.duckBox.slick::after{border-color:rgba(255,230,0,.8);box-shadow:0 0 22px rgba(255,230,0,.28)}.duckFace{width:92px;height:92px;border:0;background:transparent;padding:0;cursor:inherit;filter:drop-shadow(0 14px 22px rgba(0,0,0,.52)) drop-shadow(0 0 14px rgba(57,255,20,.18));animation:duckBob 2.2s ease-in-out infinite alternate}.duckBox.slick .duckFace{animation:duckSlick .24s ease 2}.duckFace img{width:100%;height:100%;object-fit:contain}.duckFace .duckFallback{display:grid;place-items:center;width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at 30% 25%,#fff36d,#39ff14 42%,#00e5ff 70%,#ff2bd6);color:#050505;font:1000 30px/1 system-ui;box-shadow:0 0 24px rgba(57,255,20,.28)}.duckTalk{position:absolute;left:78px;top:-6px;width:min(72vw,292px);display:none;padding:10px 11px;border-radius:14px;background:linear-gradient(135deg,rgba(6,8,9,.96),rgba(18,8,28,.94));color:#fff;border:2px solid rgba(31,252,255,.30);box-shadow:0 12px 28px rgba(0,0,0,.42),0 0 18px rgba(57,255,20,.08);font:850 12px/1.32 system-ui}.duckTalk.show{display:block}.duckTalk strong{display:block;color:#39ff14;font-size:9px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:3px}.duckBox.slick .duckTalk strong{color:#ffe600}.duckTalk span{display:block}.duckBtns{display:flex;gap:5px;margin-top:8px;flex-wrap:wrap}.duckBtns button,.duckReturn{border:0;border-radius:999px;padding:7px 9px;font:1000 9px/1 system-ui;cursor:pointer}.duckBtns button:first-child,.duckReturn{color:#050505;background:linear-gradient(135deg,#39ff14,#ffe600,#ff2bd6,#00e5ff)}.duckBtns button:nth-child(2){color:#050505;background:linear-gradient(135deg,#ffe600,#ff8a00)}.duckBtns button:last-child{color:#fff;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18)}.duckReturn{position:fixed;left:14px;bottom:88px;z-index:2147482999;display:none;text-transform:uppercase;box-shadow:0 0 22px rgba(57,255,20,.22)}.duckReturn.on{display:block}@keyframes duckBob{from{transform:translateY(0) rotate(-2deg)}to{transform:translateY(-8px) rotate(2deg)}}@keyframes duckSlick{50%{transform:translateX(5px) rotate(5deg) scale(1.04)}}@keyframes duckOrbit{to{transform:rotate(360deg)}}@media(max-width:700px){.duckBox{width:78px;height:78px;top:auto;bottom:118px;left:18px}.duckFace{width:78px;height:78px}.duckTalk{left:0;top:auto;bottom:82px;width:min(82vw,292px);padding:9px 10px;border-radius:13px;font-size:11px;line-height:1.26}.duckBtns button{padding:6px 7px;font-size:8px}.duckBox::before{top:-17px;font-size:9px}}";document.head.appendChild(s);}
  function say(t,hold){var b=$("#duckTalk"),x=$("#duckText");if(!b||!x)return;x.textContent=t;b.classList.add("show");clearTimeout(b._t);if(!hold)b._t=setTimeout(function(){b.classList.remove("show")},8200);}
  function hide(){var d=$("#duckBox"),r=$("#duckReturn");if(d)d.classList.add("off");if(r)r.classList.add("on");save({off:true});store(HIDE_KEY,"1");}
  function show(){var d=$("#duckBox"),r=$("#duckReturn");if(d)d.classList.remove("off");if(r)r.classList.remove("on");save({off:false});say("Duck Sauce is back. Tap me for help, double-tap to hide me, or drag me anywhere.",true);}
  function installDuckImage(img){var i=0;function tryNext(){if(i>=IMG_FALLBACKS.length){var wrap=img.parentNode;if(wrap){wrap.innerHTML="<span class='duckFallback' aria-hidden='true'>🦆</span>";}return;}img.src=busted(IMG_FALLBACKS[i++]);}img.onerror=tryNext;tryNext();}
  function drag(box){
    var down=false,moved=false,sx=0,sy=0,bx=0,by=0,pointerId=null,st=state();
    if(Number.isFinite(st.x)&&Number.isFinite(st.y)){
      box.style.left=st.x+"px";
      box.style.top=st.y+"px";
      box.style.bottom="auto";
    }
    function start(e){
      if(e.target&&e.target.closest&&e.target.closest(".duckBtns"))return;
      down=true;
      moved=false;
      pointerId=e.pointerId;
      sx=e.clientX;
      sy=e.clientY;
      var r=box.getBoundingClientRect();
      bx=r.left;
      by=r.top;
      box.style.bottom="auto";
      if(box.setPointerCapture&&pointerId!=null){
        try{box.setPointerCapture(pointerId)}catch(err){}
      }
      e.preventDefault();
    }
    function move(e){
      if(!down||(pointerId!=null&&e.pointerId!==pointerId))return;
      var dx=e.clientX-sx,dy=e.clientY-sy;
      if(Math.abs(dx)+Math.abs(dy)>7)moved=true;
      var x=Math.max(6,Math.min(innerWidth-box.offsetWidth-6,bx+dx));
      var y=Math.max(6,Math.min(innerHeight-box.offsetHeight-6,by+dy));
      box.style.left=x+"px";
      box.style.top=y+"px";
      e.preventDefault();
    }
    function end(e){
      if(!down||(pointerId!=null&&e&&e.pointerId!==pointerId))return;
      down=false;
      if(box.releasePointerCapture&&pointerId!=null){
        try{box.releasePointerCapture(pointerId)}catch(err){}
      }
      pointerId=null;
      var r=box.getBoundingClientRect();
      save({x:Math.round(r.left),y:Math.round(r.top)});
      setTimeout(function(){moved=false},90);
    }
    function tapDuck(e){
      if(moved){e.preventDefault();e.stopPropagation();return}
      e.preventDefault();
      e.stopPropagation();
      var now=Date.now();
      if(now-lastTap<360){
        say("No problem. I’ll hide for now. Tap the Duck button anytime to bring me back.",true);
        setTimeout(hide,320);
      }else{
        tapCount+=1;
        store(TAP_KEY,tapCount);
        if(tapCount>=5){
          box.classList.add("slick");
          say(nextSlick(),true);
          clearTimeout(box._slickTimer);
          box._slickTimer=setTimeout(function(){box.classList.remove("slick")},1400);
        }else{
          say(nextLine(),true);
        }
      }
      lastTap=now;
    }
    box.addEventListener("pointerdown",start,{passive:false});
    box.addEventListener("pointermove",move,{passive:false});
    box.addEventListener("pointerup",end);
    box.addEventListener("pointercancel",end);
    var face=$("#duckFace");
    face.addEventListener("click",tapDuck);
  }
  function boot(){css();document.querySelectorAll(".hw-duck-guide").forEach(function(el){el.style.display="none"});if($("#duckBox"))return;var st=state();tapCount=parseInt(read(TAP_KEY)||"0",10)||0;if(read(VERSION_KEY)!==VERSION){st.off=false;tapCount=0;save({off:false});store(TAP_KEY,"0");store(VERSION_KEY,VERSION)}var d=document.createElement("div");d.id="duckBox";d.className="duckBox"+(st.off?" off":"");d.innerHTML="<button id='duckFace' class='duckFace' type='button' aria-label='Duck Sauce help. Tap for help. Double tap to hide.'><img id='duckImg' alt='Duck Sauce'></button><div id='duckTalk' class='duckTalk'><strong>Duck Sauce</strong><span id='duckText'></span><div class='duckBtns'><button id='duckHelp' type='button'>More Help</button><button id='duckHide' type='button'>Hide Duck</button><button id='duckClose' type='button'>Close Bubble</button></div></div>";var r=document.createElement("button");r.id="duckReturn";r.className="duckReturn"+(st.off?" on":"");r.type="button";r.textContent="Duck";document.body.append(d,r);installDuckImage($("#duckImg"));drag(d);$("#duckHelp").onclick=function(e){e.stopPropagation();tapCount+=1;store(TAP_KEY,tapCount);say(tapCount>=5?nextSlick():nextLine(),true)};$("#duckHide").onclick=function(e){e.stopPropagation();say("No problem. I’ll hide for now. Tap the Duck button anytime to bring me back.",true);setTimeout(hide,300)};$("#duckClose").onclick=function(e){e.stopPropagation();var b=$("#duckTalk");if(b)b.classList.remove("show")};r.onclick=show;if(!st.off){setTimeout(function(){var intro=read(HIDE_KEY)?"Duck Sauce online. Tap for help, double-tap to hide me again, or drag me out of the way." : "Duck Sauce online. Tap me for help. If you keep tapping too much, I might get slick.";say(intro)},700)}}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
