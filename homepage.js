/* HYPHSWORLD homepage player
   Drop this file in the repo root as homepage.js.
   Audio files expected in /audio/:
   - ham.mp3
   - kiki.mp3
   - on-god.mp3
   - time.mp3
   - young-tez-25-8.mp3
*/

(() => {
  const tracks = [
    {
      title: "HAM",
      meta: "Hyph Life — prod by Hyph Life",
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
  const currentTime = document.getElementById("currentTime");
  const duration = document.getElementById("duration");
  const quickTracks = document.getElementById("quickTracks");
  const coolPoints = document.getElementById("coolPoints");
  const spotlightPlay = document.getElementById("spotlightPlayBtn");
  const playerStatus = document.getElementById("playerStatus");

  if (!audio || !trackTitle || !trackMeta || !playBtn || !pauseBtn || !seekBar) return;

  let currentIndex = 0;
  let points = Number(localStorage.getItem("hyphsworldCoolPoints") || "195");

  function formatTime(value) {
    if (!Number.isFinite(value)) return "0:00";
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function setStatus(message) {
    if (playerStatus) playerStatus.textContent = message;
  }

  function addPoints(amount) {
    points += amount;
    localStorage.setItem("hyphsworldCoolPoints", String(points));
    if (coolPoints) coolPoints.textContent = String(points);
  }

  function updateButtons(isPlaying) {
    playBtn.textContent = isPlaying ? "▶ Playing" : "▶ Play";
    pauseBtn.textContent = "⏸ Pause";
  }

  function highlightActiveTrack() {
    if (!quickTracks) return;
    quickTracks.querySelectorAll("button[data-track]").forEach((button) => {
      button.classList.toggle("active", Number(button.dataset.track) === currentIndex);
    });
  }

  function loadTrack(index, shouldAutoplay = false) {
    currentIndex = ((index % tracks.length) + tracks.length) % tracks.length;
    const track = tracks[currentIndex];

    trackTitle.textContent = track.title;
    trackMeta.textContent = track.meta;
    audio.src = track.src;
    audio.load();
    seekBar.value = "0";
    if (currentTime) currentTime.textContent = "0:00";
    if (duration) duration.textContent = "0:00";
    highlightActiveTrack();
    updateButtons(false);
    setStatus(`Loaded: ${track.title}`);

    if (window.gtag) {
      gtag("event", "homepage_select_track", {
        track_title: track.title,
        track_meta: track.meta
      });
    }

    if (shouldAutoplay) playCurrentTrack();
  }

  async function playCurrentTrack() {
    const track = tracks[currentIndex];
    if (!audio.src) audio.src = track.src;

    try {
      await audio.play();
      updateButtons(true);
      addPoints(5);
      setStatus(`Now playing: ${track.title}`);

      if (window.gtag) {
        gtag("event", "homepage_play", {
          track_title: track.title,
          track_meta: track.meta
        });
      }
    } catch (error) {
      updateButtons(false);
      setStatus(`Add ${track.src} to your repo to activate this track.`);
      console.warn("HYPHSWORLD player could not play:", error);
    }
  }

  playBtn.addEventListener("click", playCurrentTrack);

  pauseBtn.addEventListener("click", () => {
    audio.pause();
    updateButtons(false);
    setStatus("Paused");
  });

  if (quickTracks) {
    quickTracks.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-track]");
      if (!button) return;
      loadTrack(Number(button.dataset.track), true);
    });
  }

  if (spotlightPlay) {
    spotlightPlay.addEventListener("click", (event) => {
      event.preventDefault();
      loadTrack(4, true);
      document.getElementById("music")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  audio.addEventListener("loadedmetadata", () => {
    if (duration) duration.textContent = formatTime(audio.duration);
  });

  audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return;
    seekBar.value = String((audio.currentTime / audio.duration) * 100);
    if (currentTime) currentTime.textContent = formatTime(audio.currentTime);
  });

  seekBar.addEventListener("input", () => {
    if (!audio.duration) return;
    audio.currentTime = (Number(seekBar.value) / 100) * audio.duration;
  });

  audio.addEventListener("ended", () => {
    addPoints(10);
    loadTrack(currentIndex + 1, true);
  });

  audio.addEventListener("error", () => {
    const track = tracks[currentIndex];
    updateButtons(false);
    setStatus(`Missing audio file: ${track.src}`);
  });


  const o1PreviewVideo = document.getElementById("o1PreviewVideo");
  const o1ChoiceOverlay = document.getElementById("o1ChoiceOverlay");
  const keepWatchingBtn = document.getElementById("keepWatchingBtn");

  if (o1PreviewVideo && o1ChoiceOverlay) {
    let overlayShown = false;

    o1PreviewVideo.addEventListener("timeupdate", () => {
      if (!overlayShown && o1PreviewVideo.currentTime >= 9) {
        overlayShown = true;
        o1ChoiceOverlay.classList.add("show");
        addPoints(3);

        if (window.gtag) {
          gtag("event", "o1_preview_choice_overlay", {
            video_title: "O1 BOYZ — Live From The World"
          });
        }
      }
    });

    o1PreviewVideo.addEventListener("play", () => {
      addPoints(2);
      if (window.gtag) {
        gtag("event", "o1_preview_play", {
          video_title: "O1 BOYZ — Live From The World"
        });
      }
    });

    if (keepWatchingBtn) {
      keepWatchingBtn.addEventListener("click", () => {
        o1ChoiceOverlay.classList.remove("show");
        o1PreviewVideo.play().catch(() => {});
      });
    }
  }

  if (coolPoints) coolPoints.textContent = String(points);
  loadTrack(0, false);
})();
