const audio = document.getElementById("audio");
const volume = document.getElementById("volume");

function play() {
  audio.play();
}

function pause() {
  audio.pause();
}

function scrollToPlayer() {
  document.getElementById("player").scrollIntoView({
    behavior: "smooth"
  });
}

// FIXED VOLUME
if (volume) {
  volume.value = 1;

  volume.addEventListener("input", function () {
    audio.volume = this.value;
  });
}