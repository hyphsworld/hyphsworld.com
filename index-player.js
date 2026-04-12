const audio = document.getElementById("audio");
const volume = document.getElementById("volume");

const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stickyPlay = document.getElementById("stickyPlay");

function playTrack() {
  if (!audio) return;
  audio.play().catch((err) => {
    console.log("Playback blocked:", err);
  });
}

function pauseTrack() {
  if (!audio) return;
  audio.pause();
}

function scrollToPlayer() {
  const player = document.getElementById("player");
  if (player) {
    player.scrollIntoView({ behavior: "smooth" });
  }
}

if (playBtn) {
  playBtn.addEventListener("click", playTrack);
}

if (pauseBtn) {
  pauseBtn.addEventListener("click", pauseTrack);
}

if (stickyPlay) {
  stickyPlay.addEventListener("click", () => {
    if (!audio) return;

    if (audio.paused) {
      playTrack();
      stickyPlay.textContent = "⏸";
    } else {
      pauseTrack();
      stickyPlay.textContent = "▶";
    }
  });
}

if (audio) {
  audio.addEventListener("play", () => {
    if (stickyPlay) stickyPlay.textContent = "⏸";
  });

  audio.addEventListener("pause", () => {
    if (stickyPlay) stickyPlay.textContent = "▶";
  });
}

if (volume && audio) {
  volume.value = audio.volume;

  volume.addEventListener("input", function () {
    audio.volume = parseFloat(this.value);
  });
}