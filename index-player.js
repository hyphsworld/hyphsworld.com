
(() => {
  const TRACKS = [
    {
      title: "HAM",
      artist: "Hyph Life",
      meta: "Hyph Life — prod by 1ManBand",
      file: "music/ham.mp3",
      art: "album-art.jpg"
    },
    {
      title: "KIKI",
      artist: "Cuz Zaid x JCrown x Ruzzo",
      meta: "Cuz Zaid x JCrown x Ruzzo — prod by Cuz Zaid",
      file: "music/kiki.mp3",
      art: "kiki-art.jpg"
    },
    {
      title: "ON GOD",
      artist: "BooGotGluu x No Flash",
      meta: "BooGotGluu x No Flash",
      file: "music/on-god.mp3",
      art: "album-art.jpg"
    },
    {
      title: "TIME",
      artist: "SIXX FIGGAZ x Hyph Life",
      meta: "SIXX FIGGAZ x Hyph Life",
      file: "music/time.mp3",
      art: "time-art.jpg"
    }
  ];

  const LEVELS = [
    { score: 0, title: "Rookie" },
    { score: 100, title: "Active" },
    { score: 250, title: "Respectable" },
    { score: 500, title: "Certified" },
    { score: 1000, title: "Real One" },
    { score: 2500, title: "HYPHSWORLD Elite" }
  ];

  const STORAGE_KEY = "hyphsworld_points";
  const VISIT_KEY = "hyphsworld_last_visit";

  const $ = (id) => document.getElementById(id);
  const audio = $("main-audio");

  if (!audio) return;

  const els = {
    title: $("homeTrackTitle"),
    meta: $("homeTrackMeta"),
    art: $("homeTrackArt"),
    play: $("playBtn"),
    pause: $("pauseBtn"),
    progress: $("homeProgress"),
    current: $("homeCurrentTime"),
    duration: $("homeDuration"),
    stickyTitle: $("stickyTrackTitle"),
    stickyMeta: $("stickyTrackMeta"),
    stickyArt: $("stickyArt"),
    stickyPlay: $("stickyPlayBtn"),
    stickyPause: $("stickyPauseBtn"),
    duckHost: $("duck-helper"),
    pointsHost: $("cool-points-widget")
  };

  let current = 0;
  let points = Number(localStorage.getItem(STORAGE_KEY) || 0);
  let finishAwarded = false;

  function safeTrack(i){
    current = i;
    if(current < 0) current = 0;
    if(current >= TRACKS.length) current = 0;
    return TRACKS[current];
  }

  function fmt(sec){
    if (!isFinite(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2,"0");
    return `${m}:${s}`;
  }

  function levelTitle(){
    let found = LEVELS[0].title;
    for (const lv of LEVELS){
      if(points >= lv.score) found = lv.title;
    }
    return found;
  }

  function savePoints(){
    localStorage.setItem(STORAGE_KEY, String(points));
  }

  function showToast(msg, tone="gold"){
    const div = document.createElement("div");
    div.textContent = msg;
    div.style.position = "fixed";
    div.style.right = "16px";
    div.style.bottom = "100px";
    div.style.zIndex = "9999";
    div.style.padding = "12px 16px";
    div.style.borderRadius = "14px";
    div.style.fontWeight = "900";
    div.style.letterSpacing = ".04em";
    div.style.maxWidth = "260px";
    div.style.color = "#111";
    div.style.background = tone === "red"
      ? "linear-gradient(180deg,#ffb3b3,#d83b3b)"
      : "linear-gradient(180deg,#f1d28a,#c9a34a)";
    div.style.boxShadow = "0 20px 40px rgba(0,0,0,.45)";
    document.body.appendChild(div);
    setTimeout(()=>div.remove(), 2600);
  }

  function addPoints(amount, reason=""){
    points += amount;
    savePoints();
    showToast(`+${amount} COOL POINTS • ${levelTitle()}`);
    renderPoints();
    if(reason && window.gtag){
      gtag("event","cool_points",{
        points_added: amount,
        reason
      });
    }
  }

  function renderPoints(){
    if(!els.pointsHost) return;
    els.pointsHost.innerHTML = `
      <div style="
        position:fixed;
        left:14px;
        bottom:96px;
        z-index:9998;
        background:rgba(0,0,0,.88);
        color:#fff;
        border:1px solid rgba(255,255,255,.12);
        border-radius:18px;
        padding:12px 14px;
        min-width:170px;
        font-family:Arial,sans-serif;">
        <div style="font-size:11px;letter-spacing:.18em;color:#f1d28a;">COOL POINTS</div>
        <div style="font-size:24px;font-weight:900;margin-top:4px;">${points}</div>
        <div style="font-size:12px;color:#bdbdbd;">${levelTitle()}</div>
      </div>
    `;
  }

  function buck(message){
    showToast(message || "DENIED BLOOD", "red");
  }

  function duck(message){
    showToast(message || "RUN IT UP 😈");
  }

  function randomBuck(){
    const chance = Math.random();
    if(chance > 0.82){
      const sayings = [
        "DENIED BLOOD",
        "I NEED YOU LEAVE",
        "MOVE AROUND",
        "YOU AIN'T CLEARED",
        "NOT TODAY BLOOD"
      ];
      buck(sayings[Math.floor(Math.random()*sayings.length)]);
    }
  }

  function setTrack(i){
    const track = safeTrack(i);
    audio.src = track.file;
    if(els.title) els.title.textContent = track.title;
    if(els.meta) els.meta.textContent = track.meta;
    if(els.art) els.art.src = track.art;

    if(els.stickyTitle) els.stickyTitle.textContent = track.title;
    if(els.stickyMeta) els.stickyMeta.textContent = track.meta;
    if(els.stickyArt) els.stickyArt.src = track.art;

    document.querySelectorAll(".home-song").forEach((btn, idx)=>{
      btn.classList.toggle("active", idx === current);
    });

    finishAwarded = false;
  }

  async function playTrack(){
    try{
      await audio.play();
      addPoints(10, "play_song");
      duck("MOTION +10");
      if(window.gtag){
        gtag("event","play_song",{track: TRACKS[current].title});
      }
    }catch(err){
      buck("PRESS PLAY AGAIN");
    }
  }

  function pauseTrack(){
    audio.pause();
  }

  function nextTrack(){
    setTrack(current + 1);
    playTrack();
  }

  function bindButtons(){
    document.querySelectorAll(".home-song").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const i = Number(btn.dataset.index || 0);
        setTrack(i);
        addPoints(5, "select_track");
      });
    });

    document.querySelectorAll(".earn-points").forEach(el=>{
      el.addEventListener("click", ()=>{
        const val = Number(el.dataset.points || 5);
        addPoints(val, "engagement_click");
      });
    });

    els.play?.addEventListener("click", playTrack);
    els.pause?.addEventListener("click", pauseTrack);
    els.stickyPlay?.addEventListener("click", playTrack);
    els.stickyPause?.addEventListener("click", pauseTrack);
  }

  function bindAudio(){
    audio.addEventListener("loadedmetadata", ()=>{
      if(els.duration) els.duration.textContent = fmt(audio.duration);
    });

    audio.addEventListener("timeupdate", ()=>{
      if(els.current) els.current.textContent = fmt(audio.currentTime);
      if(els.progress && audio.duration){
        els.progress.value = (audio.currentTime / audio.duration) * 100;
      }

      if(audio.duration && !finishAwarded){
        const pct = audio.currentTime / audio.duration;
        if(pct >= 0.92){
          finishAwarded = true;
          addPoints(20, "song_finish");
          duck("SONG FINISHED +20");
        }
      }
    });

    els.progress?.addEventListener("input", ()=>{
      if(audio.duration){
        audio.currentTime = (els.progress.value / 100) * audio.duration;
      }
    });

    audio.addEventListener("ended", nextTrack);
  }

  function dailyVisit(){
    const today = new Date().toDateString();
    const last = localStorage.getItem(VISIT_KEY);
    if(last !== today){
      localStorage.setItem(VISIT_KEY, today);
      addPoints(25, "daily_login");
      duck("DAILY CHECK IN +25");
    }
  }

  function analyticsPage(){
    if(window.gtag){
      gtag("event","homepage_loaded",{
        page: "index"
      });
    }
  }

  function init(){
    renderPoints();
    setTrack(0);
    bindButtons();
    bindAudio();
    dailyVisit();
    analyticsPage();
    randomBuck();

    setInterval(()=>{
      if(Math.random() > 0.93){
        duck("ONE MORE SONG = MORE POINTS");
      }
    }, 30000);
  }

  init();
})();
