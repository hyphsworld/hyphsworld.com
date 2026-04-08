document.addEventListener("DOMContentLoaded", () => {
  const tracks = [
    {
      title: "WHAT’S HANNIN",
      meta: "Hyph Life ft 3D The Capo, Thali — prod by Cuz Zaid",
      file: "whats-hannin.mp3"
    },
    {
      title: "WITH ME",
      meta: "Hyph Life — prod K.M.T.",
      file: "with-me.mp3"
    },
    {
      title: "BOUT YOU",
      meta: "Hyph Life",
      file: "bout-you.mp3"
    },
    {
      title: "NO TRACE SNIP",
      meta: "Hyph Life — prod by Cuz Zaid",
      file: "no-trace-snip.mp3"
    }
  ];

  const audio = document.getElementById("audio");
  const playBtn = document.getElementById("playBtn");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const progress = document.getElementById("progress");
  const volume = document.getElementById("volume");
  const currentTimeEl = document.getElementById("currentTime");
  const durationEl = document.getElementById("duration");
  const trackTitle = document.getElementById("trackTitle");
  const trackMeta = document.getElementById("trackMeta");
  const trackButtons = Array.from(document.querySelectorAll(".track-item"));

  let currentIndex = 0;
  let isSeeking = false;

  function formatTime(time) {
    if (!Number.isFinite(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function loadTrack(index) {
    currentIndex = index;
    const track = tracks[index];
    audio.pause();
    audio.src = track.file;
    audio.load();
    trackTitle.textContent = track.title;
    trackMeta.textContent = track.meta;
    trackButtons.forEach((btn, i) => btn.classList.toggle("active", i === index));
    progress.value = 0;
    currentTimeEl.textContent = "0:00";
    durationEl.textContent = "0:00";
  }

  async function playCurrentTrack() {
    try {
      await audio.play();
    } catch (err) {
      console.log("Playback blocked or file missing:", err);
    }
  }

  playBtn.addEventListener("click", async () => {
    if (audio.paused) {
      await playCurrentTrack();
    } else {
      audio.pause();
    }
  });

  prevBtn.addEventListener("click", async () => {
    const nextIndex = currentIndex === 0 ? tracks.length - 1 : currentIndex - 1;
    loadTrack(nextIndex);
    await playCurrentTrack();
  });

  nextBtn.addEventListener("click", async () => {
    const nextIndex = currentIndex === tracks.length - 1 ? 0 : currentIndex + 1;
    loadTrack(nextIndex);
    await playCurrentTrack();
  });

  trackButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      loadTrack(Number(btn.dataset.index));
      await playCurrentTrack();
    });
  });

  volume.addEventListener("input", (e) => {
    audio.volume = e.target.value;
  });

  audio.addEventListener("play", () => {
    playBtn.textContent = "⏸";
  });

  audio.addEventListener("pause", () => {
    playBtn.textContent = "▶";
  });

  audio.addEventListener("loadedmetadata", () => {
    durationEl.textContent = formatTime(audio.duration);
  });

  audio.addEventListener("timeupdate", () => {
    if (!isSeeking && Number.isFinite(audio.duration) && audio.duration > 0) {
      progress.value = (audio.currentTime / audio.duration) * 100;
    }
    currentTimeEl.textContent = formatTime(audio.currentTime);
  });

  progress.addEventListener("input", () => {
    isSeeking = true;
  });

  progress.addEventListener("change", () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = (progress.value / 100) * audio.duration;
    }
    isSeeking = false;
  });

  audio.addEventListener("ended", async () => {
    const nextIndex = currentIndex === tracks.length - 1 ? 0 : currentIndex + 1;
    loadTrack(nextIndex);
    await playCurrentTrack();
  });

  audio.volume = 1;
  loadTrack(0);if (volume) {
  volume.value = 1;
  volume.addEventListener("input", function () {
    audio.volume = parseFloat(this.value);
  });
}
});
