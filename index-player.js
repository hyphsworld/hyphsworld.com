(function () {
  const tracks = [
    {
      title: "HAM",
      artist: "Hyph Life — prod by 1ManBand",
      src: "audio/ham.mp3",
      fallbacks: ["ham.mp3", "HAM.mp3", "music/ham.mp3", "assets/ham.mp3"]
    },
    {
      title: "KIKI",
      artist: "Cuz Zaid x JCrown x Ruzzo — prod by Cuz Zaid",
      src: "audio/kiki.mp3",
      fallbacks: ["kiki.mp3", "KIKI.mp3", "music/kiki.mp3", "assets/kiki.mp3"]
    },
    {
      title: "ON GOD",
      artist: "BooGotGluu x No Flash",
      src: "audio/on-god.mp3",
      fallbacks: ["on-god.mp3", "ongod.mp3", "ON GOD.mp3", "music/on-god.mp3", "assets/on-god.mp3"]
    },
    {
      title: "TIME",
      artist: "SIXX FIGGAZ x HYPH LIFE",
      src: "audio/time.mp3",
      fallbacks: ["time.mp3", "TIME.mp3", "music/time.mp3", "assets/time.mp3"]
    },
    {
      title: "25/8",
      artist: "Young Tez — prod by Marty McPhresh",
      src: "audio/25-8.mp3",
      fallbacks: ["25-8.mp3", "258.mp3", "25_8.mp3", "music/25-8.mp3", "assets/25-8.mp3"]
    }
  ];

  const audio = document.getElementById("audioPlayer") || (() => {
    const a = document.createElement("audio");
    a.id = "audioPlayer";
    a.preload = "metadata";
    document.body.appendChild(a);
    return a;
  })();

  const titleEls = [
    document.getElementById("trackTitle"),
    document.getElementById("miniTitle"),
    document.getElementById("songTitle")
  ].filter(Boolean);

  const metaEls = [
    document.getElementById("trackMeta"),
    document.getElementById("miniMeta"),
    document.getElementById("songArtist")
  ].filter(Boolean);

  const playBtns = [
    document.getElementById("playBtn"),
    document.getElementById("miniPlay")
  ].filter(Boolean);

  const pauseBtns = [
    document.getElementById("pauseBtn"),
    document.getElementById("miniPause")
  ].filter(Boolean);

  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const seekBar = document.getElementById("seekBar");
  const currentTime = document.getElementById("currentTime") || document.getElementById("timeNow");
  const duration = document.getElementById("duration");
  const coolPoints = document.getElementById("coolPoints");

  let index = 0;
  let currentSrcAttempt = 0;
  let currentSources = [];
  let points = Number(localStorage.getItem("hyphsworldCoolPoints") || (coolPoints ? coolPoints.textContent : 203) || 203);

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function setPoints(amount) {
    points = amount;
    localStorage.setItem("hyphsworldCoolPoints", String(points));
    document.querySelectorAll("#coolPoints, #vaultPoints").forEach(el => el.textContent = String(points));
  }

  function addPoints(amount) {
    setPoints(points + amount);
    window.dispatchEvent(new CustomEvent("hyphsworld:addpoints", { detail: { amount } }));
  }

  function setStatus(text) {
    let status = document.getElementById("playerStatus");
    if (!status) {
      status = document.createElement("p");
      status.id = "playerStatus";
      status.className = "player-status";
      const target = document.querySelector(".compact-player") || document.querySelector(".now-card") || document.body;
      target.appendChild(status);
    }
    status.textContent = text;
  }

  function allSources(track) {
    return [track.src].concat(track.fallbacks || []).filter(Boolean);
  }

  function updateUI(track) {
    titleEls.forEach(el => el.textContent = track.title);
    metaEls.forEach(el => el.textContent = track.artist);

    document.querySelectorAll("[data-track], [data-index], .song-tab").forEach(btn => {
      const raw = btn.getAttribute("data-track") ?? btn.getAttribute("data-index");
      btn.classList.toggle("active", Number(raw) === index);
    });

    playBtns.forEach(btn => {
      btn.innerHTML = audio.paused ? "▶ PLAY" : "⏸ PLAYING";
    });
  }

  function loadTrack(i) {
    index = (i + tracks.length) % tracks.length;
    const track = tracks[index];
    currentSources = allSources(track);
    currentSrcAttempt = 0;
    audio.src = currentSources[currentSrcAttempt];
    audio.load();
    updateUI(track);
    setStatus(`Loaded ${track.title}`);
    return track;
  }

  function tryNextSource() {
    currentSrcAttempt += 1;
    if (currentSrcAttempt < currentSources.length) {
      audio.src = currentSources[currentSrcAttempt];
      audio.load();
      audio.play().catch(() => {});
      return true;
    }
    const track = tracks[index];
    setStatus(`Audio file missing for ${track.title}. Upload one of: ${currentSources.join(", ")}`);
    playBtns.forEach(btn => btn.innerHTML = "▶ PLAY");
    return false;
  }

  function playCurrent() {
    if (!audio.src) loadTrack(index);
    audio.play().then(() => {
      updateUI(tracks[index]);
      addPoints(1);
      setStatus(`Now playing ${tracks[index].title}`);
      if (window.gtag) {
        gtag("event", "play_track", {
          track_title: tracks[index].title,
          track_artist: tracks[index].artist
        });
      }
    }).catch(() => {
      tryNextSource();
    });
  }

  function pauseCurrent() {
    audio.pause();
    updateUI(tracks[index]);
    setStatus(`Paused ${tracks[index].title}`);
  }

  function selectAndPlay(i) {
    loadTrack(i);
    playCurrent();
  }

  playBtns.forEach(btn => {
    btn.addEventListener("click", function (event) {
      event.preventDefault();
      if (audio.paused) playCurrent();
      else pauseCurrent();
    });
  });

  pauseBtns.forEach(btn => {
    btn.addEventListener("click", function (event) {
      event.preventDefault();
      pauseCurrent();
    });
  });

  if (prevBtn) prevBtn.addEventListener("click", () => selectAndPlay(index - 1));
  if (nextBtn) nextBtn.addEventListener("click", () => selectAndPlay(index + 1));

  document.querySelectorAll("[data-track], [data-index]").forEach(btn => {
    btn.addEventListener("click", function (event) {
      event.preventDefault();
      const raw = this.getAttribute("data-track") ?? this.getAttribute("data-index");
      selectAndPlay(Number(raw));
    });
  });

  document.querySelectorAll("[data-spotlight-play], .spotlight-actions a[href='app-player.html']").forEach(btn => {
    btn.addEventListener("click", function (event) {
      event.preventDefault();
      selectAndPlay(4);
      const music = document.getElementById("music");
      if (music) music.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  audio.addEventListener("error", tryNextSource);

  audio.addEventListener("timeupdate", () => {
    if (seekBar && audio.duration) seekBar.value = String((audio.currentTime / audio.duration) * 100);
    if (currentTime) currentTime.textContent = formatTime(audio.currentTime);
  });

  audio.addEventListener("loadedmetadata", () => {
    if (duration) duration.textContent = formatTime(audio.duration);
  });

  if (seekBar) {
    seekBar.addEventListener("input", () => {
      if (!audio.duration) return;
      audio.currentTime = (Number(seekBar.value) / 100) * audio.duration;
    });
  }

  audio.addEventListener("ended", () => selectAndPlay(index + 1));

  window.HYPHSWORLD_PLAYER = {
    tracks,
    play: selectAndPlay,
    pause: pauseCurrent,
    load: loadTrack
  };

  setPoints(points);
  loadTrack(0);
})();
