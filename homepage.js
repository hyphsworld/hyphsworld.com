document.addEventListener("DOMContentLoaded", () => {
  const tracks = [
    {
      title: "HAM",
      artist: "Artist: Hyph Life • Produced by 1ManBand",
      src: "ham.mp3",
      cover: "album-art.jpg",
      label: "SPOTLIGHT 02"
    },
    {
      title: "KIKI",
      artist: "Artist: Cuz Zaid x JCrown x Ruzzo • Produced by Cuz Zaid",
      src: "kiki.mp3",
      cover: "kiki-art.jpg",
      label: "SPOTLIGHT 04"
    },
    {
      title: "ON GOD",
      artist: "Artist: BooGotGluu x No Flash",
      src: "on-god.mp3",
      cover: "album-art.jpg",
      label: "SPOTLIGHT 03"
    },
    {
      title: "TIME",
      artist: "Artist: SIXX FIGGAZ x HYPH LIFE",
      src: "time.mp3",
      cover: "time-art.jpg",
      label: "NEW DROP"
    }
  ];

  const audio = document.getElementById("homeAudio");
  const title = document.getElementById("homeTitle");
  const meta = document.getElementById("homeMeta");
  const cover = document.getElementById("homeCover");
  const label = document.getElementById("homeSpotlightLabel");
  const playBtn = document.getElementById("playTrack");
  const prevBtn = document.getElementById("prevTrack");
  const nextBtn = document.getElementById("nextTrack");
  const progress = document.getElementById("homeProgress");
  const current = document.getElementById("homeCurrent");
  const duration = document.getElementById("homeDuration");
  const list = document.getElementById("trackList");

  if (!audio || !title || !meta || !cover || !label || !playBtn || !prevBtn || !nextBtn || !progress || !current || !duration || !list) return;

  let currentIndex = 0;

  function formatTime(value) {
    if (!Number.isFinite(value)) return "0:00";
    const mins = Math.floor(value / 60);
    const secs = Math.floor(value % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  }

  function trackEvent(eventName, details = {}) {
    if (typeof gtag === "function") {
      gtag("event", eventName, {
        section: "homepage",
        ...details
      });
    }
  }

  function renderList() {
    list.innerHTML = tracks.map((track, index) => `
      <button class="track-btn ${index === currentIndex ? "active" : ""}" type="button" data-index="${index}">
        <span class="track-num">${String(index + 1).padStart(2, "0")}</span>
        <span>
          <strong>${track.title}</strong>
          <small>${track.artist}</small>
        </span>
      </button>
    `).join("");

    list.querySelectorAll(".track-btn").forEach((button) => {
      button.addEventListener("click", () => {
        loadTrack(Number(button.dataset.index), true);
      });
    });
  }

  function loadTrack(index, shouldPlay = false) {
    currentIndex = (index + tracks.length) % tracks.length;
    const track = tracks[currentIndex];
    audio.src = track.src;
    title.textContent = track.title;
    meta.textContent = track.artist;
    cover.src = track.cover;
    cover.onerror = () => { cover.src = "album-art.jpg"; };
    label.textContent = track.label;
    playBtn.textContent = `PLAY ${track.title}`;
    progress.value = 0;
    current.textContent = "0:00";
    duration.textContent = "0:00";
    renderList();

    trackEvent("homepage_track_select", {
      track_title: track.title,
      track_file: track.src
    });

    if (shouldPlay) {
      audio.play().then(() => {
        playBtn.textContent = "PAUSE";
        trackEvent("homepage_track_play", { track_title: track.title });
      }).catch(() => {
        playBtn.textContent = `PLAY ${track.title}`;
      });
    }
  }

  playBtn.addEventListener("click", () => {
    const track = tracks[currentIndex];
    if (audio.paused) {
      audio.play().then(() => {
        playBtn.textContent = "PAUSE";
        trackEvent("homepage_track_play", { track_title: track.title });
      }).catch(() => {});
    } else {
      audio.pause();
      playBtn.textContent = `PLAY ${track.title}`;
      trackEvent("homepage_track_pause", { track_title: track.title });
    }
  });

  prevBtn.addEventListener("click", () => loadTrack(currentIndex - 1, true));
  nextBtn.addEventListener("click", () => loadTrack(currentIndex + 1, true));

  audio.addEventListener("loadedmetadata", () => {
    duration.textContent = formatTime(audio.duration);
  });

  audio.addEventListener("timeupdate", () => {
    current.textContent = formatTime(audio.currentTime);
    if (audio.duration) {
      progress.value = (audio.currentTime / audio.duration) * 100;
    }
  });

  progress.addEventListener("input", () => {
    if (audio.duration) {
      audio.currentTime = (Number(progress.value) / 100) * audio.duration;
    }
  });

  audio.addEventListener("ended", () => loadTrack(currentIndex + 1, true));

  document.querySelectorAll(".track-click").forEach((link) => {
    link.addEventListener("click", () => {
      trackEvent("homepage_link_click", {
        link_name: link.dataset.trackLink || link.textContent.trim(),
        link_href: link.getAttribute("href") || ""
      });
    });
  });

  loadTrack(0, false);
});
