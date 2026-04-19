document.addEventListener("DOMContentLoaded", () => {
  const tracks = [
    {
      title: "WHAT'S HANNIN",
      artist: "Hyph Life ft 3D The Capo, Thali",
      src: "whats-hannin.mp3",
      cover: "album-art.jpg",
      duration: "3:12"
    },
    {
      title: "WITH ME",
      artist: "Hyph Life",
      src: "with-me.mp3",
      cover: "album-art.jpg",
      duration: "2:58"
    },
    {
      title: "BOUT YOU",
      artist: "Hyph Life",
      src: "bout-you.mp3",
      cover: "album-art.jpg",
      duration: "3:05"
    },
    {
      title: "NO TRACE SNIP",
      artist: "Hyph Life",
      src: "no-trace-snip.mp3",
      cover: "album-art.jpg",
      duration: "1:54"
    }
  ];

  let currentTrack = 0;
  let isShuffle = false;
  let isRepeat = false;

  const audio = document.getElementById("audioPlayer");
  const playBtn = document.getElementById("playBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const shuffleBtn = document.getElementById("shuffleBtn");
  const repeatBtn = document.getElementById("repeatBtn");
  const progress = document.getElementById("progressBar");
  const currentTimeEl = document.getElementById("currentTime");
  const durationEl = document.getElementById("duration");
  const trackTitle = document.getElementById("trackTitle");
  const trackMeta = document.getElementById("trackMeta");
  const coverArt = document.getElementById("coverArt");
  const queueList = document.getElementById("queueList");

  const stickyPlayBtn = document.getElementById("stickyPlayBtn");
  const stickyPauseBtn = document.getElementById("stickyPauseBtn");
  const stickyTrackTitle = document.getElementById("stickyTrackTitle");
  const stickyTrackMeta = document.getElementById("stickyTrackMeta");

  if (!audio) return;

  function formatTime(time) {
    if (!Number.isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function renderQueue() {
    if (!queueList) return;

    queueList.innerHTML = tracks
      .map((track, index) => {
        const activeClass = index === currentTrack ? " active" : "";
        return `
          <button class="queue-item${activeClass}" data-index="${index}" type="button">
            <span class="queue-number">${String(index + 1).padStart(2, "0")}</span>
            <div class="queue-copy">
              <strong>${track.title}</strong>
              <span>${track.artist}</span>
            </div>
            <span class="queue-duration">${track.duration}</span>
          </button>
        `;
      })
      .join("");

    queueList.querySelectorAll(".queue-item").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.index);
        loadTrack(index);
        audio.play();
      });
    });
  }

  function loadTrack(index) {
    currentTrack = index;
    const track = tracks[currentTrack];

    audio.src = track.src;
    if (trackTitle) trackTitle.textContent = track.title;
    if (trackMeta) trackMeta.textContent = track.artist;
    if (coverArt) coverArt.src = track.cover;

    if (stickyTrackTitle) stickyTrackTitle.textContent = track.title;
    if (stickyTrackMeta) stickyTrackMeta.textContent = track.artist;

    if (durationEl) durationEl.textContent = track.duration;
    if (currentTimeEl) currentTimeEl.textContent = "0:00";
    if (progress) progress.value = 0;

    audio._tracked25 = false;
    audio._tracked50 = false;
    audio._tracked75 = false;

    renderQueue();

    if (typeof trackVaultEvent === "function") {
      trackVaultEvent("vault_track_select", {
        track_title: track.title,
        track_artist: track.artist,
        track_file: track.src
      });
    }
  }

  function playTrack() {
    audio.play().catch(() => {});
  }

  function pauseTrack() {
    audio.pause();
  }

  function prevTrack() {
    if (isShuffle) {
      currentTrack = Math.floor(Math.random() * tracks.length);
    } else {
      currentTrack = (currentTrack - 1 + tracks.length) % tracks.length;
    }
    loadTrack(currentTrack);
    playTrack();
  }

  function nextTrack() {
    if (isShuffle) {
      currentTrack = Math.floor(Math.random() * tracks.length);
    } else {
      currentTrack = (currentTrack + 1) % tracks.length;
    }
    loadTrack(currentTrack);
    playTrack();
  }

  if (playBtn) playBtn.addEventListener("click", playTrack);
  if (pauseBtn) pauseBtn.addEventListener("click", pauseTrack);
  if (prevBtn) prevBtn.addEventListener("click", prevTrack);
  if (nextBtn) nextBtn.addEventListener("click", nextTrack);

  if (stickyPlayBtn) stickyPlayBtn.addEventListener("click", playTrack);
  if (stickyPauseBtn) stickyPauseBtn.addEventListener("click", pauseTrack);

  if (shuffleBtn) {
    shuffleBtn.addEventListener("click", () => {
      isShuffle = !isShuffle;
      shuffleBtn.classList.toggle("active", isShuffle);
    });
  }

  if (repeatBtn) {
    repeatBtn.addEventListener("click", () => {
      isRepeat = !isRepeat;
      repeatBtn.classList.toggle("active", isRepeat);
    });
  }

  audio.addEventListener("loadedmetadata", () => {
    if (durationEl) durationEl.textContent = formatTime(audio.duration);
  });

  audio.addEventListener("timeupdate", () => {
    if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);

    if (progress && Number.isFinite(audio.duration) && audio.duration > 0) {
      progress.value = (audio.currentTime / audio.duration) * 100;
    }

    if (!audio.duration || !isFinite(audio.duration)) return;
    const percent = (audio.currentTime / audio.duration) * 100;

    if (percent >= 25 && !audio._tracked25 && typeof trackVaultEvent === "function") {
      audio._tracked25 = true;
      trackVaultEvent("vault_progress", {
        track_title: tracks[currentTrack].title,
        progress: "25%"
      });
    }

    if (percent >= 50 && !audio._tracked50 && typeof trackVaultEvent === "function") {
      audio._tracked50 = true;
      trackVaultEvent("vault_progress", {
        track_title: tracks[currentTrack].title,
        progress: "50%"
      });
    }

    if (percent >= 75 && !audio._tracked75 && typeof trackVaultEvent === "function") {
      audio._tracked75 = true;
      trackVaultEvent("vault_progress", {
        track_title: tracks[currentTrack].title,
        progress: "75%"
      });
    }
  });

  if (progress) {
    progress.addEventListener("input", () => {
      if (Number.isFinite(audio.duration)) {
        audio.currentTime = (progress.value / 100) * audio.duration;
      }
    });
  }

  audio.addEventListener("play", () => {
    if (typeof trackVaultEvent === "function") {
      trackVaultEvent("vault_play", {
        track_title: tracks[currentTrack].title,
        track_artist: tracks[currentTrack].artist
      });
    }
  });

  audio.addEventListener("pause", () => {
    if (!audio.ended && typeof trackVaultEvent === "function") {
      trackVaultEvent("vault_pause", {
        track_title: tracks[currentTrack].title,
        current_time: Math.floor(audio.currentTime || 0)
      });
    }
  });

  audio.addEventListener("ended", () => {
    if (typeof trackVaultEvent === "function") {
      trackVaultEvent("vault_complete", {
        track_title: tracks[currentTrack].title,
        track_artist: tracks[currentTrack].artist
      });
    }

    if (isRepeat) {
      audio.currentTime = 0;
      playTrack();
      return;
    }

    nextTrack();
  });

  loadTrack(currentTrack);
  renderQueue();
});