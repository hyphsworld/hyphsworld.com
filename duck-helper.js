(function(){
  "use strict";

  var IMG="duck-sauce.png";
  var KEY="duck_helper_pos";
  var HIDE_KEY="duck_helper_hidden_hint_seen";
  var lastTap=0;
  var lineIndex=0;

  function $(q){return document.querySelector(q)}
  function state(){try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){return {}}}
  function save(o){try{localStorage.setItem(KEY,JSON.stringify(Object.assign(state(),o)))}catch(e){}}
  function store(key,value){try{localStorage.setItem(key,String(value))}catch(e){}}
  function read(key){try{return localStorage.getItem(key)}catch(e){return null}}

  var GENERAL_LINES=[
    "Tap me once for help. Double-tap me if you need me gone. I got feelings, but I also got a hide button, genius.",
    "Nav buttons stay up top. Music, Vault, Games, Leaderboards, Full Player, Merch — they not decorations, chief.",
    "That big MP4 is the Lobby player. It should autoplay muted. Hit Unmute if your phone not acting brand new.",
    "Create ID keeps your Cool Points with you. Guest mode is cute until you clear your browser and start crying.",
    "Vault means scan first, ask questions second. Buck does not respect sloppy clicking.",
    "Games stack motion. Play, earn, climb the board. Don’t blame me if somebody’s grandma outranks you.",
    "Leaderboard shows who is really outside with the Cool Points. If it says warming up, Supabase is tying its shoes.",
    "Full Player is for real listening. Homepage player is quick. Learn the difference, professor.",
    "Merch and rewards are where drops and point unlocks live. Go look before you start asking obvious stuff.",
    "If the video is muted, that’s normal. Browsers hate fun and block loud autoplay. Blame them, not the duck.",
    "Drag me anywhere. I’m portable wisdom with a beak and bad patience.",
    "Double-tap Duck Sauce to hide me. Use the little Duck button to bring me back when you miss excellence.",
    "If something doesn’t load, refresh once. If you refresh twelve times, that’s not troubleshooting, that’s cardio.",
    "Booking and contact are for business. Don’t send a paragraph that starts with ‘yo fam’ unless you mean business-fam.",
    "This is HYPHSWORLD. Read the buttons, tap the right door, and stop hovering like you forgot why you came."
  ];

  var PAGE_LINES={
    leaderboard:[
      "Leaderboard: this is where Cool Points stop being private thoughts and start embarrassing people publicly.",
      "Points board updates from Supabase. If it warms up slow, let the database breathe, speed racer.",
      "Use the tabs for Cool Points or Games. Same race, different lanes. Try both, obviously."
    ],
    casino:[
      "Casino Arcade: pick a game, learn the controls, and stop touching everything like a raccoon with Wi-Fi.",
      "These games are for Cool Points motion, not your rent money. Relax, high roller.",
      "Win, lose, replay. That’s the system. Don’t argue with Duck Sauce math."
    ],
    vault:[
      "Vault: run the scan, enter the code, and let Buck decide if you’re ready. Buck is judgmental. I respect it.",
      "Level 1 is the first door. Higher levels are not for lobby tourists with weak thumbs.",
      "If the Vault bounces you to login, make an ID. The door likes names attached to points."
    ],
    games:[
      "Games: play something, earn something, then talk spicy on the board. In that order, champion.",
      "Sign in before you grind. Guest points can vanish like snacks around Bellygang.",
      "If a game has instructions, read them. I know reading is scary, but be brave."
    ],
    player:[
      "Player: tap a record and let it breathe. HAM, KIKI, ON GOD, TIME — pick pressure, not excuses.",
      "Browser blocked audio? Tap Play again. Safari acts like it owns the masters.",
      "Full Player is where serious listeners go. The homepage player is just the front porch."
    ],
    shop:[
      "Shop: merch, drops, rewards. Look around before asking where the stuff is. It is literally the shop.",
      "Point unlocks live around here. Stack Cool Points first, shop talk second.",
      "If a drop is not visible yet, Tone probably ain’t opened the gate. Stop rattling it."
    ],
    booking:[
      "Booking: features, shows, interviews, business. Keep it clean, clear, and paid-looking.",
      "Use the contact path for real business. Duck Sauce does not forward messy emails.",
      "Put the important details first. Date, city, budget, request. Boom. Adult behavior."
    ],
    visuals:[
      "Visuals: videos, trailers, and 01 Show motion. Watch first, critique after. That’s manners.",
      "If YouTube gets weird, refresh once. It be acting famous sometimes.",
      "This section is for eyes and motion. Don’t overthink it, cinema scholar."
    ],
    socials:[
      "Socials: follow the official channels. Fake pages smell like hot pennies.",
      "Use the real links here. Screenshots from strangers are not a strategy.",
      "Tap in, follow, share, keep moving. Simple assignment."
    ],
    auth:[
      "Create ID / Login: this keeps your Cool Points attached to you instead of floating around like lost socks.",
      "Use a real email you can access. Duck Sauce cannot rescue imaginary inboxes.",
      "Account page is where your identity and progress stop being temporary. Very grown."
    ],
    home:[
      "Homepage: nav buttons stay at the top. The MP4 Lobby player is right below. This is not a maze, beloved.",
      "Tap Duck once for help. Double-tap Duck to hide. Drag me around if I’m blocking your masterpiece.",
      "Start with the Lobby video, then hit Music, Vault, Games, or Leaderboards. That’s the tour, butthead."
    ]
  };

  function pageKey(){
    var p=location.pathname.toLowerCase();
    if(p.indexOf("leaderboard")>-1)return"leaderboard";
    if(p.indexOf("casino")>-1)return"casino";
    if(p.indexOf("vault")>-1||p.indexOf("floor")>-1||p.indexOf("level")>-1)return"vault";
    if(p.indexOf("games")>-1)return"games";
    if(p.indexOf("app-player")>-1||p.indexOf("player")>-1||p.indexOf("music")>-1)return"player";
    if(p.indexOf("shop")>-1||p.indexOf("point-store")>-1||p.indexOf("merch")>-1)return"shop";
    if(p.indexOf("booking")>-1||p.indexOf("contact")>-1)return"booking";
    if(p.indexOf("visuals")>-1||p.indexOf("video")>-1)return"visuals";
    if(p.indexOf("socials")>-1)return"socials";
    if(p.indexOf("auth")>-1||p.indexOf("account")>-1||p.indexOf("login")>-1)return"auth";
    return"home";
  }

  function nextLine(){
    var list=(PAGE_LINES[pageKey()]||PAGE_LINES.home).concat(GENERAL_LINES);
    var msg=list[lineIndex%list.length];
    lineIndex++;
    return msg;
  }

  function css(){
    if($("#duckStyle"))return;
    var s=document.createElement("style");
    s.id="duckStyle";
    s.textContent=".hw-duck-guide{display:none!important}.duckBox{position:fixed;left:16px;top:170px;width:92px;height:92px;z-index:2147483000;touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab}.duckBox:active{cursor:grabbing}.duckBox.off{display:none}.duckBox::before{content:'TAP HELP';position:absolute;left:50%;top:-18px;transform:translateX(-50%);padding:4px 8px;border-radius:999px;background:linear-gradient(90deg,#39ff14,#ffe600,#ff2bd6,#00e5ff);color:#050505;font:1000 10px/1 system-ui;letter-spacing:.08em;box-shadow:0 0 18px rgba(57,255,20,.28);white-space:nowrap}.duckBox::after{content:'';position:absolute;inset:-8px;border-radius:50%;border:2px dashed rgba(57,255,20,.45);animation:duckOrbit 2.8s linear infinite;pointer-events:none}.duckFace{width:92px;height:92px;border:0;background:transparent;padding:0;cursor:inherit;filter:drop-shadow(0 14px 22px rgba(0,0,0,.52)) drop-shadow(0 0 14px rgba(57,255,20,.18));animation:duckBob 2.2s ease-in-out infinite alternate}.duckFace img{width:100%;height:100%;object-fit:contain}.duckTalk{position:absolute;left:78px;top:-6px;width:min(72vw,278px);display:none;padding:10px 11px;border-radius:14px;background:linear-gradient(135deg,rgba(6,8,9,.96),rgba(18,8,28,.94));color:#fff;border:2px solid rgba(31,252,255,.30);box-shadow:0 12px 28px rgba(0,0,0,.42),0 0 18px rgba(57,255,20,.08);font:850 12px/1.32 system-ui}.duckTalk.show{display:block}.duckTalk strong{display:block;color:#39ff14;font-size:9px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:3px}.duckTalk span{display:block}.duckBtns{display:flex;gap:5px;margin-top:8px;flex-wrap:wrap}.duckBtns button,.duckReturn{border:0;border-radius:999px;padding:7px 9px;font:1000 9px/1 system-ui;cursor:pointer}.duckBtns button:first-child,.duckReturn{color:#050505;background:linear-gradient(135deg,#39ff14,#ffe600,#ff2bd6,#00e5ff)}.duckBtns button:nth-child(2){color:#050505;background:linear-gradient(135deg,#ffe600,#ff8a00)}.duckBtns button:last-child{color:#fff;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18)}.duckReturn{position:fixed;left:14px;bottom:88px;z-index:2147482999;display:none;text-transform:uppercase;box-shadow:0 0 22px rgba(57,255,20,.22)}.duckReturn.on{display:block}@keyframes duckBob{from{transform:translateY(0) rotate(-2deg)}to{transform:translateY(-8px) rotate(2deg)}}@keyframes duckOrbit{to{transform:rotate(360deg)}}@media(max-width:700px){.duckBox{width:78px;height:78px;top:auto;bottom:118px;left:18px}.duckFace{width:78px;height:78px}.duckTalk{left:0;top:auto;bottom:82px;width:min(82vw,278px);padding:9px 10px;border-radius:13px;font-size:11px;line-height:1.26}.duckTalk strong{font-size:8px}.duckBtns{gap:4px;margin-top:7px}.duckBtns button{padding:6px 7px;font-size:8px}.duckBox::before{top:-17px;font-size:9px}}";
    document.head.appendChild(s);
  }

  function say(t,hold){
    var b=$("#duckTalk"),x=$("#duckText");
    if(!b||!x)return;
    x.textContent=t;
    b.classList.add("show");
    clearTimeout(b._t);
    if(!hold)b._t=setTimeout(function(){b.classList.remove("show")},7600);
  }

  function hide(){
    var d=$("#duckBox"),r=$("#duckReturn");
    if(d)d.classList.add("off");
    if(r)r.classList.add("on");
    save({off:true});
    store(HIDE_KEY,"1");
  }

  function show(){
    var d=$("#duckBox"),r=$("#duckReturn");
    if(d)d.classList.remove("off");
    if(r)r.classList.remove("on");
    save({off:false});
    say("I’m back. Try not to need me immediately. Tap me for help, double-tap if you want me gone again.",true);
  }

  function drag(box){
    var down=false,moved=false,sx=0,sy=0,bx=0,by=0,st=state();
    if(Number.isFinite(st.x)&&Number.isFinite(st.y)){box.style.left=st.x+"px";box.style.top=st.y+"px";box.style.bottom="auto"}

    function point(e){return e.touches?e.touches[0]:e}
    function start(e){
      var p=point(e);down=true;moved=false;sx=p.clientX;sy=p.clientY;
      var r=box.getBoundingClientRect();bx=r.left;by=r.top;box.style.bottom="auto";
      e.preventDefault();
    }
    function move(e){
      if(!down)return;
      var p=point(e),dx=p.clientX-sx,dy=p.clientY-sy;
      if(Math.abs(dx)+Math.abs(dy)>7)moved=true;
      var x=Math.max(6,Math.min(innerWidth-box.offsetWidth-6,bx+dx));
      var y=Math.max(6,Math.min(innerHeight-box.offsetHeight-6,by+dy));
      box.style.left=x+"px";box.style.top=y+"px";
      e.preventDefault();
    }
    function end(){
      if(!down)return;
      down=false;
      var r=box.getBoundingClientRect();
      save({x:Math.round(r.left),y:Math.round(r.top)});
      setTimeout(function(){moved=false},90);
    }
    function tapDuck(e){
      if(moved)return;
      e.preventDefault();
      e.stopPropagation();
      var now=Date.now();
      if(now-lastTap<360){
        say("Fine. I’ll hide. Bring me back with the Duck button when you remember you need adult supervision.",true);
        setTimeout(hide,320);
      }else{
        say(nextLine(),true);
      }
      lastTap=now;
    }

    box.addEventListener("mousedown",start);
    box.addEventListener("touchstart",start,{passive:false});
    box.addEventListener("pointerdown",start);
    addEventListener("mousemove",move,{passive:false});
    addEventListener("touchmove",move,{passive:false});
    addEventListener("pointermove",move,{passive:false});
    addEventListener("mouseup",end);
    addEventListener("touchend",end);
    addEventListener("pointerup",end);

    var face=$("#duckFace");
    face.addEventListener("click",tapDuck);
    face.addEventListener("touchend",tapDuck,{passive:false});
    face.addEventListener("pointerup",tapDuck);
  }

  function boot(){
    css();
    document.querySelectorAll(".hw-duck-guide").forEach(function(el){el.style.display="none"});
    if($("#duckBox"))return;
    var st=state();
    var d=document.createElement("div");
    d.id="duckBox";
    d.className="duckBox"+(st.off?" off":"");
    d.innerHTML="<button id='duckFace' class='duckFace' type='button' aria-label='Duck Sauce help. Tap for help. Double tap to hide.'><img src='"+IMG+"' alt='Duck Sauce'></button><div id='duckTalk' class='duckTalk'><strong>Duck Sauce</strong><span id='duckText'></span><div class='duckBtns'><button id='duckHelp' type='button'>More Help</button><button id='duckHide' type='button'>Hide Duck</button><button id='duckClose' type='button'>Close Bubble</button></div></div>";
    var r=document.createElement("button");
    r.id="duckReturn";
    r.className="duckReturn"+(st.off?" on":"");
    r.type="button";
    r.textContent="Duck";
    document.body.append(d,r);
    drag(d);
    $("#duckHelp").onclick=function(e){e.stopPropagation();say(nextLine(),true)};
    $("#duckHide").onclick=function(e){e.stopPropagation();say("Aight, I’m gone. Try not to touch the wrong thing immediately.",true);setTimeout(hide,300)};
    $("#duckClose").onclick=function(e){e.stopPropagation();var b=$("#duckTalk");if(b)b.classList.remove("show")};
    r.onclick=show;
    if(!st.off){
      setTimeout(function(){
        var intro=read(HIDE_KEY)?"Duck Sauce online. Tap for help, double-tap to hide me again, or drag me out the way." : "Duck Sauce online. Tap me for help. Double-tap me to hide. Drag me if I’m blocking your little masterpiece.";
        say(intro);
      },700);
    }
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
