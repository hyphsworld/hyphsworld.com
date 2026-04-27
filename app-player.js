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

  const VAULT_LEVEL = Number(localStorage.getItem("hyphsVaultLevel") || "0");

  const allTracks = [
    {
      title: "HAM",
      artist: "Hyph Life â€” prod by Hyph Life",
      src: "ham.mp3",
      cover: "album-art.jpg",
      level: 0
    },
    {
      title: "KIKI",
      artist: "Cuz Zaid x JCrown x Ruzzo â€” prod by Cuz Zaid",
      src: "kiki.mp3",
      cover: "album-art.jpg",
      level: 0
    },
    {
      title: "ON GOD",
      artist: "BooGotGluu x No Flash",
      src: "on-god.mp3",
      cover: "album-art.jpg",
      level: 0
    },
    {
      title: "TIME",
      artist: "Sixx Figgaz x Hyph Life",
      src: "time.mp3",
      cover: "album-art.jpg",
      level: 0
    },

    {
      title: "GOTTA GO REMIX",
      artist: "Hyph Life x Young Tez",
      src: "gotta-go-remix.mp3",
      cover: "gotta-go-remix.jpg",
      level: 1
    },
    {
      title: "FREE-HYPH",
      artist: "Hyph Life",
      src: "free-hyph.mp3",
      cover: "album-art.jpg",
      level: 1
    },
    {
      title: "MONEY IS THE ROOT",
      artist: "Hyph Life x Young Tez â€” prod by #1ManBand",
      src: "money-is-the-root.mp3",
      cover: "money-is-the-root.jpg",
      level: 1
    },

    {
      title: "WHAT'S HANNIN",
      artist: "Hyph Life ft 3D The Capo, Thali",
      src: "whats-hannin.mp3",
      cover: "album-art.jpg",
      level: 2
    },
    {
      title: "WITH ME",
      artist: "Hyph Life",
      src: "with-me.mp3",
      cover: "album-art.jpg",
      level: 2
    },
    {
      title: "BOUT YOU",
      artist: "Hyph Life",
      src: "bout-you.mp3",
      cover: "album-art.jpg",
      level: 2
    },
    {
      title: "NO TRACE SNIP",
      artist: "Hyph Life",
      src: "no-trace-snip.mp3",
      cover: "album-art.jpg",
      level: 2
    }
  ];

  const tracks = allTracks.filter((track) => track.level <= VAULT_LEVEL);
  let currentIndex = 0;
  let isShuffle = false;
  let isRepeat = false;
  let playedForPoints = new Set(JSON.parse(localStorage.getItem("hyphsPlayedTracks") || "[]"));

  function formatTime(time) {
    if (!Number.isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function addCoolPoints(amount, reason = "player") {
    const current = Number(localStorage.getItem("hyphsCoolPoints") || "0");
    localStorage.setItem("hyphsCoolPoints", String(current + amount));

    if (typeof gtag === "function") {
      gtag("event", "cool_points_awarded", {
        section: "full_player",
        reason,
        points_awarded: amount
      });
    }
  }

  function trackVaultEventSafe(eventName, details = {}) {
    if (typeof gtag === "function") {
      gtag("event", eventName, {
        section: "full_player",
        vault_level: VAULT_LEVEL,
        ...details
      });
    }
  }

  function renderPlaylist() {
    playlist.innerHTML = "";

    allTracks.forEach((track) => {
      const visibleIndex = tracks.findIndex((visibleTrack) => visibleTrack.src === track.src);
      const isLocked = track.level > VAULT_LEVEL;

      const button = document.createElement("button");
      button.type = "button";
      button.className = `playlist-item${visibleIndex === currentIndex && !isLocked ? " active" : ""}${isLocked ? " locked" : ""}`;

      button.innerHTML = `
        <span class="playlist-num">${isLocked ? "LOCK" : String(visibleIndex + 1).padStart(2, "0")}</span>
        <div class="playlist-copy">
          <strong>${track.title}</strong>
          <span>${isLocked ? `Unlock Level ${track.level} in The Vault` : track.artist}</span>
        </div>
      `;

      button.addEventListener("click", () => {
        if (isLocked) {
          window.location.href = "vault.html";
          return;
        }
        loadTrack(visibleIndex, true);
      });

      playlist.appendChild(button);
    });
  }

  function loadTrack(index, shouldAutoplay = false) {
    if (!tracks.length) return;

    currentIndex = ((index % tracks.length) + tracks.length) % tracks.length;
    const track = tracks[currentIndex];

    audio.src = track.src;
    songTitle.textContent = track.title;
    songArtist.textContent = track.artist;
    coverArt.src = track.cover;
    coverArt.onerror = () => {
      coverArt.onerror = null;
      coverArt.src = "album-art.jpg";
    };

    currentTimeEl.textContent = "0:00";
    durationEl.textContent = "0:00";
    seekBar.value = 0;

    audio._tracked25 = false;
    audio._tracked50 = false;
    audio._tracked75 = false;
    audio._pointsAwarded = false;

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

  function togglePlay() {
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }

  function updatePlayButton() {
    playBtn.textContent = audio.paused ? "â–¶" : "â¸";
  }

  function playNext() {
    const nextIndex = isShuffle
      ? Math.floor(Math.random() * tracks.length)
      : (currentIndex + 1) % tracks.length;

    loadTrack(nextIndex, true);
  }

  function playPrev() {
    const prevIndex = isShuffle
      ? Math.floor(Math.random() * tracks.length)
      : (currentIndex - 1 + tracks.length) % tracks.length;

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

        const trackKey = tracks[currentIndex].src;
        if (!playedForPoints.has(trackKey)) {
          playedForPoints.add(trackKey);
          localStorage.setItem("hyphsPlayedTracks", JSON.stringify([...playedForPoints]));
          addCoolPoints(10, "played_75_percent");
        }
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

  if (!tracks.length) {
    playlist.innerHTML = `
      <button type="button" class="playlist-item locked">
        <span class="playlist-num">LOCK</span>
        <div class="playlist-copy">
          <strong>VAULT LOCKED</strong>
          <span>Enter a code to unlock the full player.</span>
        </div>
      </button>
    `;
    songTitle.textContent = "VAULT LOCKED";
    songArtist.textContent = "Enter a code to unlock player access.";
    playBtn.disabled = true;
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }

  loadTrack(0, false);
  updatePlayButton();
});
