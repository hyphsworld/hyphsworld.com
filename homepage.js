const audio = document.getElementById("homeAudio");
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const spotlightPlay = document.getElementById("spotlightPlay");
const duckHelper = document.getElementById("duckHelper");
const coolPoints = document.getElementById("coolPoints");
const coolRank = document.getElementById("coolRank");

const tracks = [
  {
    title: "HAM",
    meta: "Hyph Life — prod by 1ManBand",
    src: "ham.mp3",
    art: "album-art.jpg"
  },
  {
    title: "KIKI",
    meta: "Cuz Zaid x JCrown x Ruzzo — prod by Cuz Zaid",
    src: "kiki.mp3",
    art: "kiki-art.jpg"
  },
  {
    title: "ON GOD",
    meta: "BooGotGluu x No Flash",
    src: "on-god.mp3",
    art: "album-art.jpg"
  },
  {
    title: "TIME",
    meta: "SIXX FIGGAZ x HYPH LIFE",
    src: "time.mp3",
    art: "time-art.jpg"
  }
];

let points = Number(localStorage.getItem("hyphsworldCoolPoints") || 80);

function updateRank() {
  if (!coolPoints || !coolRank) return;

  coolPoints.textContent = points;

  if (points >= 500) {
    coolRank.textContent = "Legend";
  } else if (points >= 250) {
    coolRank.textContent = "Major";
  } else if (points >= 120) {
    coolRank.textContent = "Tapped In";
  } else {
    coolRank.textContent = "Rookie";
  }

  localStorage.setItem("hyphsworldCoolPoints", String(points));
}

function addPoints(amount) {
  points += amount;
  updateRank();
}

function safePlay() {
  if (!audio) return;
  audio.play().then(() => {
    addPoints(5);
    if (window.gtag) {
      window.gtag("event", "homepage_play", {
        event_category: "music",
        event_label: "HAM"
      });
    }
  }).catch(() => {
    showDuck("Tap play again — your browser blocked autoplay until you interact.");
  });
}

function safePause() {
  if (!audio) return;
  audio.pause();
}

function showDuck(message) {
  const old = document.querySelector(".duck-pop");
  if (old) old.remove();

  const pop = document.createElement("div");
  pop.className = "duck-pop";
  pop.textContent = message;
  document.body.appendChild(pop);

  setTimeout(() => pop.remove(), 3800);
}

if (playBtn) playBtn.addEventListener("click", safePlay);
if (pauseBtn) pauseBtn.addEventListener("click", safePause);
if (spotlightPlay) spotlightPlay.addEventListener("click", safePlay);

if (duckHelper) {
  duckHelper.addEventListener("click", () => {
    addPoints(10);
    showDuck("Duck Sauce says: keep tapping in. Codes active. Cool points up.");
  });
}

updateRank();
