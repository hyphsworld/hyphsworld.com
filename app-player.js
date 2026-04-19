document.addEventListener("DOMContentLoaded", () => {
  const audio = document.getElementById("audio");
  const playBtn = document.getElementById("playBtn");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const seekBar = document.getElementById("seekBar");
  const currentTimeEl = document.getElementById("currentTime");
  const durationEl = document.getElementById("duration");
  const songTitle = document.getElementById("songTitle");
  const songArtist = document.getElementById("songArtist");
  const coverArt = document.getElementById("coverArt");
  const playlist = document.getElementById("playlist");
  const shuffleBtn = document.getElementById("shuffleBtn");
  const repeatBtn = document.getElementById("repeatBtn");

  if (
    !audio ||
    !playBtn ||
    !prevBtn ||
    !nextBtn ||
    !seekBar ||
    !currentTimeEl ||
    !durationEl ||
    !songTitle ||
    !songArtist ||
    !coverArt ||
    !playlist ||
    !shuffleBtn ||
    !repeatBtn
  ) {
    return;
  }

  const tracks = [
    {
      title: "WHAT'S HANNIN",
      artist: "Hyph Life ft 3D The Capo, Thali",
      src: "whats-hannin.mp3",
      cover: "album-art.jpg"
    },
    {
      title: "WITH ME",
      artist: "Hyph Life",
      src: "with-me.mp3",
      cover: "album-art.jpg"
    },
    {
      title: "BOUT YOU",
      artist: "Hyph Life",
      src: "bout-you.mp3",
      cover: "album-art.jpg"
    },
    {
      title: "NO TRACE SNIP",
      artist: "Hyph Life",
      src: "no-trace-snip.mp3",
      cover: "album-art.jpg"
    }
  ];

  let currentIndex = 0;
  let isShuffle = false;
  let isRepeat = false;

  function formatTime(time) {
    if (!Number.isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function trackVaultEventSafe(eventName, details = {}) {
    if (typeof gtag === "function") {
      gtag("event", eventName, {
        section: "full_player",
        ...details
      });
    }
  }

  function loadTrack(index, shouldAutoplay = false) {
    currentIndex = index;
    const track = tracks[currentIndex];

    audio.src = track.src;
    songTitle.textContent = track.title;
    songArtist.textContent = track.artist;
    coverArt.src = track.cover;
    currentTimeEl.textContent = "0:00";
    durationEl.textContent = "0:00";
    seekBar.value = 0;

    audio._tracked25 = false;
    audio._tracked50 = false;
    audio._tracked75 = false;

    renderPlaylist();

    trackVaultEventSafe("vault_track_select", {
      track_title: track.title,
      track_artist: track.artist,
      track_file: track.src
    });

    if (shouldAutoplay) {
      audio.play().catch(() => {});
    }
  }

  function renderPlaylist() {
    playlist.innerHTML = "";

    tracks.forEach((track, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `playlist-item${index === currentIndex ? " active" : ""}`;
      button.innerHTML = `
        <span class="playlist-num">${String(index + 1).padStart(2, "0")}</span>
        <div class="playlist-copy">
          <strong>${track.title}</strong>
          <span>${track.artist}</span>
        </div>
      `;

      button.addEventListener("click", () => {
        loadTrack(index, true);
      });

      playlist.appendChild(button);
    });
  }

  function togglePlay() {
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }

  function updatePlayButton() {
    playBtn.textContent = audio.paused ? "▶" : "⏸";
  }

  function playNext() {
    let nextIndex;

    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * tracks.length);
    } else {
      nextIndex = (currentIndex + 1) % tracks.length;
    }

    loadTrack(nextIndex, true);
  }

  function playPrev() {
    let prevIndex;

    if (isShuffle) {
      prevIndex = Math.floor(Math.random() * tracks.length);
    } else {
      prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    }

    loadTrack(prevIndex, true);
  }

  playBtn.addEventListener("click", togglePlay);
  nextBtn.addEventListener("click", playNext);
  prevBtn.addEventListener("click", playPrev);

  shuffleBtn.addEventListener("click", () => {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle("active", isShuffle);
  });

  repeatBtn.addEventListener("click", () => {
    isRepeat = !isRepeat;
    repeatBtn.classList.toggle("active", isRepeat);
  });

  seekBar.addEventListener("input", () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = (Number(seekBar.value) / 100) * audio.duration;
    }
  });

  audio.addEventListener("loadedmetadata", () => {
    durationEl.textContent = formatTime(audio.duration);
  });

  audio.addEventListener("timeupdate", () => {
    currentTimeEl.textContent = formatTime(audio.currentTime);

    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      const progress = (audio.currentTime / audio.duration) * 100;
      seekBar.value = progress;

      if (progress >= 25 && !audio._tracked25) {
        audio._tracked25 = true;
        trackVaultEventSafe("vault_progress", {
          track_title: tracks[currentIndex].title,
          progress: "25%"
        });
      }

      if (progress >= 50 && !audio._tracked50) {
        audio._tracked50 = true;
        trackVaultEventSafe("vault_progress", {
          track_title: tracks[currentIndex].title,
          progress: "50%"
        });
      }

      if (progress >= 75 && !audio._tracked75) {
        audio._tracked75 = true;
        trackVaultEventSafe("vault_progress", {
          track_title: tracks[currentIndex].title,
          progress: "75%"
        });
      }
    }
  });

  audio.addEventListener("play", () => {
    updatePlayButton();
    trackVaultEventSafe("vault_play", {
      track_title: tracks[currentIndex].title,
      track_artist: tracks[currentIndex].artist
    });
  });

  audio.addEventListener("pause", () => {
    updatePlayButton();

    if (!audio.ended) {
      trackVaultEventSafe("vault_pause", {
        track_title: tracks[currentIndex].title,
        current_time: Math.floor(audio.currentTime || 0)
      });
    }
  });

  audio.addEventListener("ended", () => {
    trackVaultEventSafe("vault_complete", {
      track_title: tracks[currentIndex].title,
      track_artist: tracks[currentIndex].artist
    });

    if (isRepeat) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
      return;
    }

    playNext();
  });

  loadTrack(0, false);
  updatePlayButton();
});