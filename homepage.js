const userEmail = localStorage.getItem("hyphUserEmail");

// 🔒 RESET IF NOT LOGGED IN
if (!userEmail) {
  localStorage.removeItem("hyphsworldCoolPoints");
}

// ================= TRACKS =================
const tracks = [
  { title: "HAM", key: "ham", src: "ham.mp3" },
  { title: "KIKI", key: "kiki", src: "kiki.mp3" },
  { title: "ON GOD", key: "on-god", src: "on-god.mp3" },
  { title: "TIME", key: "time", src: "time.mp3" },
  { title: "25/8", key: "25-8", src: "25-8.mp3" }
];

// ================= ELEMENTS =================
const audio = document.getElementById("audioPlayer");
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const trackTitle = document.getElementById("trackTitle");
const coolPointsEl = document.getElementById("coolPoints");

let currentIndex = 0;
let points = Number(localStorage.getItem("hyphsworldCoolPoints") || 0);

// ================= ANTI FARM STATE =================
let hasEarnedListen = false;
let lastTrackKey = null;

// ================= UI =================
function updateUI() {
  if (coolPointsEl) coolPointsEl.textContent = points;
  if (trackTitle) trackTitle.textContent = tracks[currentIndex].title;
}

// ================= LOAD TRACK =================
function loadTrack(i) {
  currentIndex = i;
  const track = tracks[i];

  audio.src = track.src;
  audio.load();

  // reset anti-farm flags
  hasEarnedListen = false;
  lastTrackKey = track.key;

  updateUI();
}

// ================= PLAY =================
function playTrack() {
  audio.play().catch(() => {});
}

// ================= PAUSE =================
function pauseTrack() {
  audio.pause();
}

// ================= EVENTS =================

// ❌ NO POINTS ON PLAY BUTTON
playBtn.onclick = () => {
  playTrack();
};

pauseBtn.onclick = () => {
  pauseTrack();
};

// 🎧 ONLY REWARD AFTER 20 SECONDS
audio.addEventListener("timeupdate", () => {
  if (!audio.duration) return;

  const current = audio.currentTime;
  const track = tracks[currentIndex];

  if (current >= 20 && !hasEarnedListen) {
    hasEarnedListen = true;

    // prevent repeat farming same track
    const key = "listen_" + track.key;
    const lastTime = Number(localStorage.getItem(key) || 0);

    if (Date.now() - lastTime > 60 * 60 * 1000) {
      points += 2;
      localStorage.setItem(key, Date.now());
    }

    localStorage.setItem("hyphsworldCoolPoints", points);

    // only save if logged in
    if (userEmail) {
      localStorage.setItem("hyphUserPoints", points);
    }

    updateUI();
  }
});

// 🎯 COMPLETE BONUS
audio.addEventListener("ended", () => {
  const track = tracks[currentIndex];
  const key = "complete_" + track.key;

  const lastTime = Number(localStorage.getItem(key) || 0);

  if (Date.now() - lastTime > 24 * 60 * 60 * 1000) {
    points += 10;
    localStorage.setItem(key, Date.now());
  }

  localStorage.setItem("hyphsworldCoolPoints", points);

  if (userEmail) {
    localStorage.setItem("hyphUserPoints", points);
  }

  loadTrack((currentIndex + 1) % tracks.length);
  playTrack();
});

// ================= INIT =================
loadTrack(0);
updateUI();
