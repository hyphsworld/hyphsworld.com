// File: app-player.js
(() => {
  const VAULT_LEVEL = Number(localStorage.getItem("hyphsVaultLevel") || "0");

  const TRACKS = [
    { section: "Featured", title: "YOUNGIN REMIX", meta: "Main playlist", file: "youngin-remix.mp3", art: "album-art.jpg", level: 0 },
    { section: "Featured", title: "KIKI", meta: "Main playlist", file: "kiki.mp3", art: "kiki-art.jpg", level: 0 },
    { section: "Featured", title: "ON GOD", meta: "Main playlist", file: "on-god.mp3", art: "album-art.jpg", level: 0 },
    { section: "Featured", title: "BOUT THAT", meta: "Main playlist", file: "bout-that.mp3", art: "album-art.jpg", level: 0 },
    { section: "Featured", title: "HAM", meta: "Main playlist", file: "ham.mp3", art: "album-art.jpg", level: 0 },
    { section: "Featured", title: "TIME", meta: "Main playlist", file: "time.mp3", art: "time-art.jpg", level: 0 },

    { section: "Level 1", title: "IM A BEAST", meta: "Vault Level 1", file: "im-a-beast.mp3", art: "album-art.jpg", level: 1 },
    { section: "Level 1", title: "GOTTA GO REMIX", meta: "Vault Level 1", file: "gotta-go-remix.mp3", art: "album-art.jpg", level: 1 },
    { section: "Level 1", title: "JAYS SHIT", meta: "Vault Level 1", file: "jay-z-shit.mp3", art: "album-art.jpg", level: 1 },
    { section: "Level 1", title: "SHARE MY MONEY", meta: "Vault Level 1", file: "share-my-money.mp3", art: "album-art.jpg", level: 1 },
    { section: "Level 1", title: "FREE HYPH", meta: "Vault Level 1", file: "free-hyph.mp3", art: "album-art.jpg", level: 1 },
    { section: "Level 1", title: "50 CENT SHIT", meta: "Vault Level 1", file: "50-cent-shit.mp3", art: "album-art.jpg", level: 1 },

    { section: "Level 2", title: "WHATS HANNIN", meta: "Vault Level 2", file: "whats-hannin.mp3", art: "album-art.jpg", level: 2 },
    { section: "Level 2", title: "BOUT YOU", meta: "Vault Level 2", file: "bout-you.mp3", art: "album-art.jpg", level: 2 },
    { section: "Level 2", title: "MULA", meta: "Vault Level 2", file: "mula.mp3", art: "album-art.jpg", level: 2 },
    { section: "Level 2", title: "NO TRACE SNIP", meta: "Vault Level 2", file: "no-trace-snip.mp3", art: "album-art.jpg", level: 2 },
    { section: "Level 2", title: "WIKKED WAYS", meta: "Vault Level 2", file: "wikked-wayz.mp3", art: "album-art.jpg", level: 2 },
    { section: "Level 2", title: "WITH ME", meta: "Vault Level 2", file: "with-me.mp3", art: "album-art.jpg", level: 2 }
  ];

  const visibleTracks = TRACKS.filter(track => track.level <= VAULT_LEVEL);
  const $ = id => document.getElementById(id);

  const audio = $("playerAudio");
  if (!audio) return;

  const art = $("playerArt");
  const title = $("playerTitle");
  const meta = $("playerMeta");
  const section = $("playerSection");
  const progress = $("playerProgress");
  const currentTimeEl = $("currentTime");
  const durationTimeEl = $("durationTime");
  const playBtn = $("playBtn");

  let current = 0;

  function fmt(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  }

  function renderLists() {
    const groups = {
      Featured: $("featuredList"),
      "Level 1": $("level1List"),
      "Level 2": $("level2List")
    };

    Object.values(groups).forEach(host => {
      if (host) host.innerHTML = "";
    });

    TRACKS.forEach(track => {
      const host = groups[track.section];
      if (!host) return;

      if (track.level > VAULT_LEVEL) {
        const locked = document.createElement("button");
        locked.className = "track-item locked";
        locked.type = "button";
        locked.innerHTML = `
          <span class="track-num">🔒</span>
          <span class="track-copy">
            <strong>${track.title}</strong>
            <small>Unlock Level ${track.level} in The Vault</small>
          </span>
        `;
        locked.addEventListener("click", () => {
          window.location.href = "vault-gate.html";
        });
        host.appendChild(locked);
        return;
      }

      const realIndex = visibleTracks.findIndex(t => t.title === track.title);
      const button = document.createElement("button");
      button.className = "track-item";
      button.type = "button";
      button.dataset.index = String(realIndex);
      button.innerHTML = `
        <span class="track-num">${String(realIndex + 1).padStart(2, "0")}</span>
        <span class="track-copy">
          <strong>${track.title}</strong>
          <small>${track.meta}</small>
        </span>
      `;
      button.addEventListener("click", () => setTrack(realIndex, true));
      host.appendChild(button);
    });
  }

  function updateActive() {
    document.querySelectorAll(".track-item:not(.locked)").forEach(button => {
      button.classList.toggle("active", Number(button.dataset.index) === current);
    });
  }

  function setTrack(index, autoplay = false) {
    current = ((index % visibleTracks.length) + visibleTracks.length) % visibleTracks.length;
    const track = visibleTracks[current];

    audio.src = track.file;
    audio.load();

    art.src = track.art;
    art.onerror = () => {
      art.onerror = null;
      art.src = "album-art.jpg";
    };

    art.alt = `${track.title} artwork`;
    title.textContent = track.title;
    meta.textContent = track.meta;
    section.textContent = track.section;
    currentTimeEl.textContent = "0:00";
    durationTimeEl.textContent = "0:00";
    progress.value = "0";
    playBtn.textContent = "▶ PLAY";

    updateActive();

    if (autoplay) void playCurrent();
  }

  async function playCurrent() {
    try {
      await audio.play();
      playBtn.textContent = "⏸ PAUSE";
    } catch {
      playBtn.textContent = "▶ PLAY";
    }
  }

  function togglePlay() {
    if (audio.paused) {
      void playCurrent();
    } else {
      audio.pause();
      playBtn.textContent = "▶ PLAY";
    }
  }

  $("playBtn")?.addEventListener("click", togglePlay);
  $("nextBtn")?.addEventListener("click", () => setTrack(current + 1, true));
  $("prevBtn")?.addEventListener("click", () => setTrack(current - 1, true));

  audio.addEventListener("loadedmetadata", () => {
    durationTimeEl.textContent = fmt(audio.duration);
  });

  audio.addEventListener("timeupdate", () => {
    currentTimeEl.textContent = fmt(audio.currentTime);
    if (audio.duration) {
      progress.value = String((audio.currentTime / audio.duration) * 100);
    }
  });

  audio.addEventListener("ended", () => setTrack(current + 1, true));

  progress?.addEventListener("input", () => {
    if (!audio.duration) return;
    audio.currentTime = (Number(progress.value) / 100) * audio.duration;
  });

  renderLists();
  setTrack(0, false);
})();
