document.addEventListener("DOMContentLoaded", () => {
  const audio = document.getElementById("main-audio");
  const progress = document.getElementById("homeProgress");
  const currentTimeEl = document.getElementById("homeCurrentTime");
  const durationEl = document.getElementById("homeDuration");
  const playBtn = document.getElementById("playBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const stickyPlayBtn = document.getElementById("stickyPlayBtn");
  const stickyPauseBtn = document.getElementById("stickyPauseBtn");
  const trackedLinks = document.querySelectorAll(".track-click");

  function formatTime(time) {
    if (!Number.isFinite(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }

  async function playAudio() {
    if (!audio) return;
    try {
      await audio.play();
      if (typeof gtag === "function") {
        gtag("event", "play_song", {
          event_category: "music",
          event_label: "whats_hannin_homepage"
        });
      }
    } catch (err) {
      console.log("Playback blocked:", err);
    }
  }

  function pauseAudio() {
    if (!audio) return;
    audio.pause();
    if (typeof gtag === "function") {
      gtag("event", "pause_song", {
        event_category: "music",
        event_label: "whats_hannin_homepage"
      });
    }
  }

  if (playBtn) playBtn.addEventListener("click", playAudio);
  if (pauseBtn) pauseBtn.addEventListener("click", pauseAudio);
  if (stickyPlayBtn) stickyPlayBtn.addEventListener("click", playAudio);
  if (stickyPauseBtn) stickyPauseBtn.addEventListener("click", pauseAudio);

  if (audio) {
    audio.addEventListener("loadedmetadata", () => {
      if (durationEl) durationEl.textContent = formatTime(audio.duration);
    });

    audio.addEventListener("timeupdate", () => {
      if (progress && Number.isFinite(audio.duration) && audio.duration > 0) {
        progress.value = (audio.currentTime / audio.duration) * 100;
      }
      if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
    });
  }

  if (progress && audio) {
    progress.addEventListener("input", () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = (progress.value / 100) * audio.duration;
      }
    });
  }

  trackedLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const label = link.dataset.trackLink || "site_link";
      if (typeof gtag === "function") {
        gtag("event", "click", {
          event_category: "engagement",
          event_label: label
        });
      }
    });
  });
});