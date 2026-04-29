const tracks = [
  {
    title: "HAM",
    meta: "Hyph Life — prod by 1ManBand",
    src: "audio/ham.mp3"
  },
  {
    title: "KIKI",
    meta: "Cuz Zaid x JCrown x Ruzzo — prod by Cuz Zaid",
    src: "audio/kiki.mp3"
  },
  {
    title: "ON GOD",
    meta: "BooGotGluu x No Flash",
    src: "audio/on-god.mp3"
  },
  {
    title: "TIME",
    meta: "SIXX FIGGAZ x HYPH LIFE",
    src: "audio/time.mp3"
  },
  {
    title: "25/8",
    meta: "Young Tez — prod by Marty McPhresh",
    src: "audio/young-tez-25-8.mp3"
  }
];

const audio = document.getElementById("audioPlayer");
const trackTitle = document.getElementById("trackTitle");
const trackMeta = document.getElementById("trackMeta");
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const seekBar = document.getElementById("seekBar");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const quickTracks = document.getElementById("quickTracks");
const coolPointsEl = document.getElementById("coolPoints");
const spotlightPlayBtn = document.getElementById("spotlightPlayBtn");
const previewVideo = document.getElementById("homePreviewVideo");
const videoDecision = document.getElementById("videoDecision");
const keepWatchingBtn = document.getElementById("keepWatchingBtn");

let currentIndex = 0;
let coolPoints = Number(localStorage.getItem("hyphsworldCoolPoints") || "195");
let decisionShown = false;

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${mins}:${secs}`;
}

function setCoolPoints(amount) {
  coolPoints += amount;
  localStorage.setItem("hyphsworldCoolPoints", String(coolPoints));
  if (coolPointsEl) coolPointsEl.textContent = coolPoints;
}

function setActivePill(index) {
  if (!quickTracks) return;
  quickTracks.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.track) === index);
  });
}

function loadTrack(index, autoplay = false) {
  currentIndex = (index + tracks.length) % tracks.length;
  const track = tracks[currentIndex];

  if (trackTitle) trackTitle.textContent = track.title;
  if (trackMeta) trackMeta.textContent = track.meta;
  if (audio) audio.src = track.src;

  if (seekBar) seekBar.value = "0";
  if (currentTimeEl) currentTimeEl.textContent = "0:00";
  if (durationEl) durationEl.textContent = "0:00";
  if (playBtn) playBtn.textContent = "▶ Play";
  setActivePill(currentIndex);

  if (window.gtag) {
    gtag("event", "select_track", {
      track_title: track.title,
      track_meta: track.meta
    });
  }

  if (autoplay) playCurrent();
}

function playCurrent() {
  if (!audio || !audio.src) return;
  audio.play().then(() => {
    if (playBtn) playBtn.textContent = "⏸ Playing";
    setCoolPoints(2);
  }).catch(() => {
    if (playBtn) playBtn.textContent = "▶ Tap Again";
  });
}

function pauseCurrent() {
  if (!audio) return;
  audio.pause();
  if (playBtn) playBtn.textContent = "▶ Play";
}

if (coolPointsEl) coolPointsEl.textContent = coolPoints;

if (playBtn) {
  playBtn.addEventListener("click", () => {
    if (!audio.src) loadTrack(currentIndex, false);
    if (audio.paused) playCurrent();
    else pauseCurrent();
  });
}

if (pauseBtn) pauseBtn.addEventListener("click", pauseCurrent);

if (quickTracks) {
  quickTracks.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-track]");
    if (!button) return;
    loadTrack(Number(button.dataset.track), true);
  });
}

if (spotlightPlayBtn) {
  spotlightPlayBtn.addEventListener("click", () => {
    loadTrack(Number(spotlightPlayBtn.dataset.track || 4), true);
    document.getElementById("music")?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

if (audio) {
  audio.addEventListener("loadedmetadata", () => {
    if (durationEl) durationEl.textContent = formatTime(audio.duration);
  });

  audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return;
    if (seekBar) seekBar.value = String((audio.currentTime / audio.duration) * 100);
    if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
  });

  audio.addEventListener("ended", () => {
    setCoolPoints(10);
    loadTrack(currentIndex + 1, true);
  });

  audio.addEventListener("error", () => {
    if (trackMeta) trackMeta.textContent = "Audio path not found. Check /audio/ file names.";
    if (playBtn) playBtn.textContent = "Check Audio";
  });
}

if (seekBar) {
  seekBar.addEventListener("input", () => {
    if (!audio || !audio.duration) return;
    audio.currentTime = (Number(seekBar.value) / 100) * audio.duration;
  });
}

if (previewVideo && videoDecision) {
  previewVideo.addEventListener("timeupdate", () => {
    if (!decisionShown && previewVideo.currentTime >= 9) {
      decisionShown = true;
      videoDecision.classList.add("show");
    }
  });
}

if (keepWatchingBtn && videoDecision) {
  keepWatchingBtn.addEventListener("click", () => {
    videoDecision.classList.remove("show");
  });
}

loadTrack(0, false);
