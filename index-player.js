const audio = document.getElementById("main-audio");
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");

if (playBtn) {
  playBtn.onclick = () => {
    audio.play();
  };
}

if (pauseBtn) {
  pauseBtn.onclick = () => {
    audio.pause();
  };
}

/* sticky player */
const stickyPlay = document.getElementById("stickyPlayBtn");
const stickyPause = document.getElementById("stickyPauseBtn");

if (stickyPlay) {
  stickyPlay.onclick = () => audio.play();
}

if (stickyPause) {
  stickyPause.onclick = () => audio.pause();
}