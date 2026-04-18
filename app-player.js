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

  const tracks = [
    {
      title: "WHAT'S HANNIN",
      artist: "Hyph Life ft 3D The Capo, Thali",
      file: "whats-hannin.mp3",
      cover: "album-art.jpg",
      length: "3:12"
    },
    {
      title: "WITH ME",
      artist: "Hyph Life",
      file: "with-me.mp3",
      cover: "album-art.jpg",
      length: "2:58"
    },
    {
      title: "BOUT YOU",
      artist: "Hyph Life",
      file: "bout-you.mp3",
      cover: "album-art.jpg",
      length: "3:05"
    },
    {
      title: "NO TRACE SNIP",
      artist: "Hyph Life",
      file: "no-trace-snip.mp3",
      cover: "album-art.jpg",
      length: "1:54"
    },
    {
      title: "TIME",
      artist: "Sixx Figgaz x Hyph Life",
      file: "time.mp3",
      cover: "album-art.jpg",
      length: "3:08"
    }
  ];

  let currentTrack = 0;
  let isPlaying = false;
  let repeatMode = false;
  let shuffleMode = false;

  function formatTime(time) {
    if (!Number.isFinite(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }

  function renderPlaylist() {
    playlist.innerHTML = "";

    tracks.forEach((track, index) => {
      const row = document.createElement("div");
      row.className = "track";
      if (index === currentTrack) row.classList.add("active");

      row.innerHTML = `
        <div class="track-number">${String(index + 1).padStart(2, "0")}</div>
        <div class="track-copy">
          <strong>${track.title}</strong>
          <span>${track.artist}</span>
        </div>
        <div class="track-length">${track.length}</div>
      `;

      row.addEventListener("click", () => {
        currentTrack = index;
        loadTrack();
        playSong();
      });

      playlist.appendChild(row);
    });
  }

  function loadTrack() {
    const track = tracks[currentTrack];

    audio.src = track.file;
    songTitle.textContent = track.title;
    songArtist.textContent = track.artist;
    coverArt.src = track.cover;

    seekBar.value = 0;
    currentTimeEl.textContent = "0:00";
    durationEl.textContent = track.length;

    renderPlaylist();

    if (typeof gtag === "function") {
      gtag("event", "load_track", {
        event_category: "music",
        event_label: track.title
      });
    }
  }

  async function playSong() {
    try {
      await audio.play();
      isPlaying = true;
      playBtn.textContent = "⏸";

      if (typeof gtag === "function") {
        gtag("event", "play_track", {
          event_category: "music",
          event_label: tracks[currentTrack].title
        });
      }
    } catch (err) {
      console.log("Playback blocked:", err);
    }
  }

  function pauseSong() {
    audio.pause();
    isPlaying = false;
    playBtn.textContent = "▶";
  }

  function nextTrack() {
    if (shuffleMode) {
      currentTrack = Math.floor(Math.random() * tracks.length);
    } else {
      currentTrack++;
      if (currentTrack >= tracks.length) currentTrack = 0;
    }

    loadTrack();
    playSong();
  }

  function prevTrack() {
    currentTrack--;
    if (currentTrack < 0) currentTrack = tracks.length - 1;

    loadTrack();
    playSong();
  }

  playBtn.addEventListener("click", () => {
    if (isPlaying) {
      pauseSong();
    } else {
      playSong();
    }
  });

  nextBtn.addEventListener("click", nextTrack);
  prevBtn.addEventListener("click", prevTrack);

  shuffleBtn.addEventListener("click", () => {
    shuffleMode = !shuffleMode;
    shuffleBtn.style.opacity = shuffleMode ? "1" : ".6";
  });

  repeatBtn.addEventListener("click", () => {
    repeatMode = !repeatMode;
    repeatBtn.style.opacity = repeatMode ? "1" : ".6";
  });

  audio.addEventListener("timeupdate", () => {
    if (audio.duration) {
      seekBar.value = (audio.currentTime / audio.duration) * 100;
      currentTimeEl.textContent = formatTime(audio.currentTime);
      durationEl.textContent = formatTime(audio.duration);
    }
  });

  seekBar.addEventListener("input", () => {
    if (audio.duration) {
      audio.currentTime = (seekBar.value / 100) * audio.duration;
    }
  });

  audio.addEventListener("ended", () => {
    if (repeatMode) {
      playSong();
    } else {
      nextTrack();
    }

    if (typeof gtag === "function") {
      gtag("event", "track_complete", {
        event_category: "music",
        event_label: tracks[currentTrack].title
      });
    }
  });

  loadTrack();
  renderPlaylist();
});