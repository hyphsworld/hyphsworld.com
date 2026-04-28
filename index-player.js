const tracks = [
  {
    title: "HAM",
    artist: "Hyph Life",
    src: ""
  },
  {
    title: "KIKI",
    artist: "Cuz Zaid x JCrown x Ruzzo",
    src: ""
  },
  {
    title: "ON GOD",
    artist: "BooGotGluu x No Flash",
    src: ""
  },
  {
    title: "TIME",
    artist: "SIXX FIGGAZ x HYPH LIFE",
    src: ""
  }
];

const audio = document.getElementById("audioPlayer");
const titleEl = document.getElementById("songTitle");
const artistEl = document.getElementById("songArtist");
const playBtn = document.getElementById("playBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const seekBar = document.getElementById("seekBar");
const timeNow = document.getElementById("timeNow");
const tabs = Array.from(document.querySelectorAll(".song-tab"));
const coolPoints = document.getElementById("coolPoints");

let currentIndex = 2;
let points = Number(localStorage.getItem("hyphsworldCoolPoints") || 203);

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function updatePoints(amount = 1) {
  points += amount;
  localStorage.setItem("hyphsworldCoolPoints", String(points));
  if (coolPoints) coolPoints.textContent = points;
}

function loadTrack(index, autoplay = false) {
  currentIndex = (index + tracks.length) % tracks.length;
  const track = tracks[currentIndex];

  titleEl.textContent = track.title;
  artistEl.textContent = track.artist;

  tabs.forEach((tab, tabIndex) => {
    tab.classList.toggle("active", tabIndex === currentIndex);
  });

  if (track.src) {
    audio.src = track.src;
  } else {
    audio.removeAttribute("src");
  }

  seekBar.value = 0;
  timeNow.textContent = "0:00";
  playBtn.textContent = "▶";

  updatePoints(1);

  if (window.gtag) {
    gtag("event", "select_track", {
      track_title: track.title,
      track_artist: track.artist
    });
  }

  if (autoplay && track.src) {
    audio.play().then(() => {
      playBtn.textContent = "Ⅱ";
    }).catch(() => {
      playBtn.textContent = "▶";
    });
  }
}

playBtn.addEventListener("click", () => {
  if (!audio.src) {
    updatePoints(3);
    playBtn.textContent = playBtn.textContent === "▶" ? "Ⅱ" : "▶";
    return;
  }

  if (audio.paused) {
    audio.play();
    playBtn.textContent = "Ⅱ";
  } else {
    audio.pause();
    playBtn.textContent = "▶";
  }
});

prevBtn.addEventListener("click", () => loadTrack(currentIndex - 1, !audio.paused));
nextBtn.addEventListener("click", () => loadTrack(currentIndex + 1, !audio.paused));

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    loadTrack(Number(tab.dataset.index), false);
  });
});

audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;
  seekBar.value = String((audio.currentTime / audio.duration) * 100);
  timeNow.textContent = formatTime(audio.currentTime);
});

seekBar.addEventListener("input", () => {
  if (!audio.duration) return;
  audio.currentTime = (Number(seekBar.value) / 100) * audio.duration;
});

audio.addEventListener("ended", () => loadTrack(currentIndex + 1, true));

if (coolPoints) coolPoints.textContent = points;
loadTrack(currentIndex, false);
