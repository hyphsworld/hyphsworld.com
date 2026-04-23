document.addEventListener("DOMContentLoaded", () => {
  const tracks = [
    {
      title: "25/8",
      artist: "Young Tez — prod by Marty McPhresh",
      src: "25-8.mp3",
      cover: "album-art.jpg"
    },
    {
      title: "HAM",
      artist: "Hyph Life — prod by Hyph Life",
      src: "ham.mp3",
      cover: "album-art.jpg"
    },
    {
      title: "ON GOD",
      artist: "BooGotGluu x No Flash",
      src: "on-god.mp3",
      cover: "album-art.jpg"
    },
    {
      title: "KIKI",
      artist: "Cuz Zaid x JCrown x Ruzzo — prod by Cuz Zaid",
      src: "kiki.mp3",
      cover: "album-art.jpg"
    },
    {
      title: "Wikked Wayz",
      artist: "Hyph Life x 3D The Capo",
      src: "wikked-wayz.mp3",
      cover: "album-art.jpg"
    }
  ];

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

  let currentTrackIndex = 0;
  let isShuffle = false;
  let isRepeat = false;

  function trackEvent(eventName, details = {}) {
    if (typeof gtag === "function") {
      gtag("event", eventName, {
        section: "full_player",
        ...details
      });
    }
  }

  function formatTime(time) {
    if (!Number.isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function updatePlaylistUI() {
    const items = playlist.querySelectorAll(".playlist-item");
    items.forEach((item, index) => {
      item.classList.toggle("active", index === currentTrackIndex);
    });
  }

  function loadTrack(index, autoplay = false) {
    currentTrackIndex = index;
    const track = tracks[currentTrackIndex];

    audio.src = track.src;
    songTitle.textContent = track.title;
    songArtist.textContent = track.artist;
    coverArt.src = track.cover;
    coverArt.alt = `${track.title} artwork`;

    seekBar.value = 0;
    currentTimeEl.textContent = "0:00";
    durationEl.textContent = "0:00";

    updatePlaylistUI();

    trackEvent("full_player_track_select", {
      track_title: track.title,
      track_artist: track.artist
    });

    if (autoplay) {
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

  function previousTrack() {
    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      loadTrack(randomIndex, true);
      return;
    }

    const prevIndex = currentTrackIndex === 0 ? tracks.length - 1 : currentTrackIndex - 1;
    loadTrack(prevIndex, true);
  }

  function nextTrack() {
    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      loadTrack(randomIndex, true);
      return;
    }

    const nextIndex = currentTrackIndex === tracks.length - 1 ? 0 : currentTrackIndex + 1;
    loadTrack(nextIndex, true);
  }

  function renderPlaylist() {
    playlist.innerHTML = "";

    tracks.forEach((track, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "playlist-item";
      button.innerHTML = `
        <span class="playlist-number">${String(index + 1).padStart(2, "0")}</span>
        <span class="playlist-copy">
          <strong>${track.title}</strong>
          <small>${track.artist}</small>
        </span>
      `;

      button.addEventListener("click", () => {
        loadTrack(index, true);
      });

      playlist.appendChild(button);
    });

    updatePlaylistUI();
  }

  playBtn.addEventListener("click", togglePlay);
  prevBtn.addEventListener("click", previousTrack);
  nextBtn.addEventListener("click", nextTrack);

  shuffleBtn.addEventListener("click", () => {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle("active", isShuffle);
    trackEvent("full_player_shuffle_toggle", { enabled: isShuffle });
  });

  repeatBtn.addEventListener("click", () => {
    isRepeat = !isRepeat;
    repeatBtn.classList.toggle("active", isRepeat);
    trackEvent("full_player_repeat_toggle", { enabled: isRepeat });
  });

  audio.addEventListener("play", () => {
    playBtn.textContent = "⏸ Pause";
    trackEvent("full_player_play", {
      track_title: tracks[currentTrackIndex].title
    });
  });

  audio.addEventListener("pause", () => {
    playBtn.textContent = "▶ Play";
  });

  audio.addEventListener("loadedmetadata", () => {
    durationEl.textContent = formatTime(audio.duration);
  });

  audio.addEventListener("timeupdate", () => {
    currentTimeEl.textContent = formatTime(audio.currentTime);

    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      seekBar.value = (audio.currentTime / audio.duration) * 100;
    }
  });

  seekBar.addEventListener("input", () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = (Number(seekBar.value) / 100) * audio.duration;
    }
  });

  audio.addEventListener("ended", () => {
    if (isRepeat) {
      loadTrack(currentTrackIndex, true);
      return;
    }

    nextTrack();
  });

  loadTrack(0, false);
  renderPlaylist();
});