// File: app-player.js
(() => {
  const TRACKS = [
    { section: "Featured", title: "YOUNGIN REMIX", meta: "Main playlist", file: "youngin-remix.mp3", art: "album-art.jpg" },
    { section: "Featured", title: "KIKI", meta: "Main playlist", file: "kiki.mp3", art: "kiki-art.jpg" },
    { section: "Featured", title: "ON GOD", meta: "Main playlist", file: "on-god.mp3", art: "album-art.jpg" },
    { section: "Featured", title: "BOUT THAT", meta: "Main playlist", file: "bout-that.mp3", art: "album-art.jpg" },
    { section: "Featured", title: "HAM", meta: "Main playlist", file: "ham.mp3", art: "album-art.jpg" },
    { section: "Featured", title: "TIME", meta: "Main playlist", file: "time.mp3", art: "time-art.jpg" },

    { section: "Level 1", title: "IM A BEAST", meta: "Vault Level 1", file: "im-a-beast.mp3", art: "album-art.jpg" },
    { section: "Level 1", title: "GOTTA GO REMIX", meta: "Vault Level 1", file: "gotta-go-remix.mp3", art: "album-art.jpg" },
    { section: "Level 1", title: "JAYS SHIT", meta: "Vault Level 1", file: "jay-z-shit.mp3", art: "album-art.jpg" },
    { section: "Level 1", title: "SHARE MY MONEY", meta: "Vault Level 1", file: "share-my-money.mp3", art: "album-art.jpg" },
    { section: "Level 1", title: "FREE HYPH", meta: "Vault Level 1", file: "free-hyph.mp3", art: "album-art.jpg" },
    { section: "Level 1", title: "50 CENT SHIT", meta: "Vault Level 1", file: "50-cent-shit.mp3", art: "album-art.jpg" },

    { section: "Level 2", title: "WHATS HANNIN", meta: "Vault Level 2", file: "whats-hannin.mp3", art: "album-art.jpg" },
    { section: "Level 2", title: "BOUT YOU", meta: "Vault Level 2", file: "bout-you.mp3", art: "album-art.jpg" },
    { section: "Level 2", title: "MULA", meta: "Vault Level 2", file: "mula.mp3", art: "album-art.jpg" },
    { section: "Level 2", title: "NO TRACE SNIP", meta: "Vault Level 2", file: "no-trace-snip.mp3", art: "album-art.jpg" },
    { section: "Level 2", title: "WIKKED WAYS", meta: "Vault Level 2", file: "wikked-wayz.mp3", art: "album-art.jpg" },
    { section: "Level 2", title: "WITH ME", meta: "Vault Level 2", file: "with-me.mp3", art: "album-art.jpg" }
  ];

  const $ = (id) => document.getElementById(id);

  const audio = $("playerAudio");
  const art = $("playerArt");
  const title = $("playerTitle");
  const meta = $("playerMeta");
  const section = $("playerSection");
  const progress = $("playerProgress");
  const currentTimeEl = $("currentTime");
  const durationTimeEl = $("durationTime");
  const playBtn = $("playBtn");

  if (!audio) return;

  let current = 0;

  function fmt(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  }

  function renderLists() {
    const featuredList = $("featuredList");
    const level1List = $("level1List");
    const level2List = $("level2List");

    const groups = {
      Featured: featuredList,
      "Level 1": level1List,
      "Level 2": level2List
    };

    Object.values(groups).forEach((host) => {
      if (host) host.innerHTML = "";
    });

    TRACKS.forEach((track, index) => {
      const button = document.createElement("button");
      button.className = "track-item";
      button.type = "button";
      button.dataset.index = String(index);
      button.innerHTML = `
        <span class="track-num">${String(index + 1).padStart(2, "0")}</span>
        <span class="track-copy">
          <strong>${track.title}</strong>
          <small>${track.meta}</small>
        </span>
      `;
      button.addEventListener("click", () => {
        setTrack(index, true);
      });

      groups[track.section]?.appendChild(button);
    });
  }

  function updateActive() {
    document.querySelectorAll(".track-item").forEach((button, index) => {
      button.classList.toggle("active", index === current);
      button.setAttribute("aria-pressed", String(index === current));
    });
  }

  function setTrack(index, autoplay = false) {
    current = ((index % TRACKS.length) + TRACKS.length) % TRACKS.length;
    const track = TRACKS[current];

    audio.src = track.file;
    audio.load();

    art.src = track.art;art.onerror = () => {
  art.onerror = null;
  art.src = "album-art.jpg";
};    art.alt = `${track.title} artwork`;
    title.textContent = track.title;
    meta.textContent = track.meta;
    section.textContent = track.section;

    currentTimeEl.textContent = "0:00";
    durationTimeEl.textContent = "0:00";
    progress.value = "0";
    playBtn.textContent = "▶ PLAY";

    updateActive();

    if (autoplay) {
      void playCurrent();
    }
  }

  async function playCurrent() {
    try {
      await audio.play();
      playBtn.textContent = "⏸ PAUSE";
    } catch {
      playBtn.textContent = "▶ PLAY";
    }
  }

  function pauseCurrent() {
    audio.pause();
    playBtn.textContent = "▶ PLAY";
  }

  function togglePlay() {
    if (audio.paused) {
      void playCurrent();
      return;
    }
    pauseCurrent();
  }

  function nextTrack() {
    setTrack(current + 1, true);
  }

  function prevTrack() {
    setTrack(current - 1, true);
  }

  $("playBtn")?.addEventListener("click", togglePlay);
  $("nextBtn")?.addEventListener("click", nextTrack);
  $("prevBtn")?.addEventListener("click", prevTrack);

  audio.addEventListener("loadedmetadata", () => {
    durationTimeEl.textContent = fmt(audio.duration);
  });

  audio.addEventListener("timeupdate", () => {
    currentTimeEl.textContent = fmt(audio.currentTime);
    if (audio.duration) {
      progress.value = String((audio.currentTime / audio.duration) * 100);
    }
  });

  audio.addEventListener("ended", nextTrack);

  progress?.addEventListener("input", () => {
    if (!audio.duration) return;
    audio.currentTime = (Number(progress.value) / 100) * audio.duration;
  });

  renderLists();
  setTrack(0, false);
})();
