const tracks = [
  {
    number: "01",
    title: "HAM",
    meta: "Hyph Life — prod by 1ManBand",
    src: "ham.mp3"
  },
  {
    number: "02",
    title: "KIKI",
    meta: "Cuz Zaid x JCrown x Ruzzo — prod by Cuz Zaid",
    src: "kiki.mp3"
  },
  {
    number: "03",
    title: "ON GOD",
    meta: "BooGotGluu x No Flash",
    src: "on-god.mp3"
  },
  {
    number: "04",
    title: "TIME",
    meta: "SIXX FIGGAZ x Hyph Life",
    src: "time.mp3"
  }
];

const audio = document.getElementById("audioPlayer");
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const miniPlay = document.getElementById("miniPlay");
const miniPause = document.getElementById("miniPause");
const trackTitle = document.getElementById("trackTitle");
const trackMeta = document.getElementById("trackMeta");
const miniTitle = document.getElementById("miniTitle");
const miniMeta = document.getElementById("miniMeta");
const trackList = document.getElementById("trackList");
const seekBar = document.getElementById("seekBar");
const currentTime = document.getElementById("currentTime");
const duration = document.getElementById("duration");
const coolPoints = document.getElementById("coolPoints");

let currentTrack = 0;
let points = Number(localStorage.getItem("hyphsworld_cool_points") || 195);

function formatTime(seconds) {
  if (!seconds || Number.isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function savePoints(add = 0) {
  points += add;
  localStorage.setItem("hyphsworld_cool_points", points);
  coolPoints.textContent = points;
}

function loadTrack(index, autoplay = false) {
  currentTrack = index;
  const track = tracks[currentTrack];

  trackTitle.textContent = track.title;
  trackMeta.textContent = track.meta;
  miniTitle.textContent = track.title;
  miniMeta.textContent = track.meta;
  audio.src = track.src;

  document.querySelectorAll(".track-row").forEach((row, rowIndex) => {
    row.classList.toggle("active", rowIndex === currentTrack);
  });

  if (autoplay) {
    audio.play().catch(() => {});
    savePoints(1);
  }
}

function playCurrent() {
  if (!audio.src) loadTrack(currentTrack, false);
  audio.play().catch(() => {});
  savePoints(1);
}

function pauseCurrent() {
  audio.pause();
}

function renderTracks() {
  trackList.innerHTML = "";

  tracks.forEach((track, index) => {
    const row = document.createElement("div");
    row.className = "track-row";
    row.innerHTML = `
      <span>${track.number}</span>
      <div>
        <strong>${track.title}</strong>
        <small>${track.meta}</small>
      </div>
      <button type="button">Play</button>
    `;

    row.querySelector("button").addEventListener("click", () => {
      loadTrack(index, true);
    });

    trackList.appendChild(row);
  });
}

playBtn.addEventListener("click", playCurrent);
pauseBtn.addEventListener("click", pauseCurrent);
miniPlay.addEventListener("click", playCurrent);
miniPause.addEventListener("click", pauseCurrent);

audio.addEventListener("loadedmetadata", () => {
  duration.textContent = formatTime(audio.duration);
});

audio.addEventListener("timeupdate", () => {
  currentTime.textContent = formatTime(audio.currentTime);
  if (audio.duration) {
    seekBar.value = (audio.currentTime / audio.duration) * 100;
  }
});

seekBar.addEventListener("input", () => {
  if (audio.duration) {
    audio.currentTime = (seekBar.value / 100) * audio.duration;
  }
});

audio.addEventListener("ended", () => {
  const next = (currentTrack + 1) % tracks.length;
  loadTrack(next, true);
});

renderTracks();
savePoints(0);
loadTrack(0, false);
