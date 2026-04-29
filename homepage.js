const userEmail = localStorage.getItem("hyphUserEmail");

if (!userEmail) {
  // guest mode → wipe points on reload
  localStorage.removeItem("hyphsworldCoolPoints");
} else {
  // restore saved points
  const saved = localStorage.getItem("hyphUserPoints");
  if (saved) {
    localStorage.setItem("hyphsworldCoolPoints", saved);
  }
}const tracks = [
  {
    title: "HAM",
    meta: "Hyph Life — prod by 1ManBand",
    key: "ham",
    sources: [
      "ham.mp3",
      "audio/ham.mp3",
      "%3Aaudio%3Aham.mp3",
      ":audio:ham.mp3",
      "HAM.mp3",
      "audio/HAM.mp3"
    ]
  },
  {
    title: "KIKI",
    meta: "Cuz Zaid x JCrown x Ruzzo — prod by Cuz Zaid",
    key: "kiki",
    sources: [
      "kiki.mp3",
      "audio/kiki.mp3",
      "%3Aaudio%3Akiki.mp3",
      ":audio:kiki.mp3",
      "KIKI.mp3",
      "audio/KIKI.mp3"
    ]
  },
  {
    title: "ON GOD",
    meta: "BooGotGluu x No Flash",
    key: "on-god",
    sources: [
      "on-god.mp3",
      "audio/on-god.mp3",
      "%3Aaudio%3Aon-god.mp3",
      ":audio:on-god.mp3",
      "on god.mp3",
      "audio/on god.mp3",
      "ON GOD.mp3",
      "audio/ON GOD.mp3"
    ]
  },
  {
    title: "TIME",
    meta: "SIXX FIGGAZ x HYPH LIFE",
    key: "time",
    sources: [
      "time.mp3",
      "audio/time.mp3",
      "%3Aaudio%3Atime.mp3",
      ":audio:time.mp3",
      "TIME.mp3",
      "audio/TIME.mp3"
    ]
  },
  {
    title: "25/8",
    meta: "Young Tez — prod by Marty McPhresh",
    key: "25-8",
    sources: [
      "25-8.mp3",
      "audio/25-8.mp3",
      "%3Aaudio%3A25-8.mp3",
      ":audio:25-8.mp3",
      "young-tez-25-8.mp3",
      "audio/young-tez-25-8.mp3",
      "%3Aaudio%3Ayoung-tez-25-8.mp3",
      ":audio:young-tez-25-8.mp3",
      "25_8.mp3",
      "audio/25_8.mp3",
      "Young Tez - 25-8.mp3",
      "audio/Young Tez - 25-8.mp3",
      "Young Tez 25-8.mp3",
      "audio/Young Tez 25-8.mp3"
    ]
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
let sourceIndex = 0;
let pendingAutoplay = false;
let coolPoints = Number(localStorage.getItem("hyphsworldCoolPoints") || "195");
let decisionShown = false;

const LISTEN_REWARD_SECONDS = 20;
const LISTEN_REWARD_POINTS = 2;
const COMPLETE_REWARD_POINTS = 10;
const LISTEN_COOLDOWN_MS = 60 * 60 * 1000;
const COMPLETE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${mins}:${secs}`;
}

function getCurrentTrack() {
  return tracks[currentIndex];
}

function getRewardKey(reason, trackKey) {
  return `hyphsworldReward_${reason}_${trackKey}`;
}

function canAward(reason, trackKey, cooldownMs) {
  const key = getRewardKey(reason, trackKey);
  const lastAward = Number(localStorage.getItem(key) || "0");
  return Date.now() - lastAward >= cooldownMs;
}

function awardCoolPoints(amount, reason, trackKey, cooldownMs) {
  if (!canAward(reason, trackKey, cooldownMs)) return false;

  coolPoints += amount;
  localStorage.setItem("hyphsworldCoolPoints", String(coolPoints));
  localStorage.setItem(getRewardKey(reason, trackKey), String(Date.now()));

  if (coolPointsEl) coolPointsEl.textContent = coolPoints;

  if (window.gtag) {
    gtag("event", "cool_points_awarded", {
      amount,
      reason,
      track: trackKey,
      total: coolPoints
    });
  }

  return true;
}

function setActivePill(index) {
  if (!quickTracks) return;
  quickTracks.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.track) === index);
  });
}

function updateTrackText(track) {
  if (trackTitle) trackTitle.textContent = track.title;
  if (trackMeta) trackMeta.textContent = track.meta;
}

function loadTrack(index, autoplay = false) {
  currentIndex = (index + tracks.length) % tracks.length;
  sourceIndex = 0;
  pendingAutoplay = autoplay;

  const track = getCurrentTrack();
  updateTrackText(track);
  setActivePill(currentIndex);

  if (seekBar) seekBar.value = "0";
  if (currentTimeEl) currentTimeEl.textContent = "0:00";
  if (durationEl) durationEl.textContent = "0:00";
  if (playBtn) playBtn.textContent = "▶ Play";

  setAudioSource();

  if (window.gtag) {
    gtag("event", "select_track", {
      track_title: track.title,
      track_meta: track.meta
    });
  }
}

function setAudioSource() {
  if (!audio) return;

  const track = getCurrentTrack();
  const src = track.sources[sourceIndex];

  if (!src) {
    showAudioError();
    return;
  }

  audio.src = src;
  audio.load();
}

function tryNextSource() {
  const track = getCurrentTrack();
  sourceIndex += 1;

  if (sourceIndex < track.sources.length) {
    setAudioSource();
    return;
  }

  showAudioError();
}

function showAudioError() {
  const track = getCurrentTrack();
  const tried = track.sources.join(", ");

  if (trackMeta) {
    trackMeta.textContent = `Could not find ${track.title}. Tried: ${tried}`;
  }

  if (playBtn) {
    playBtn.textContent = "Check Audio";
  }
}

function playCurrent() {
  if (!audio || !audio.src) return;

  audio.play().then(() => {
    if (playBtn) playBtn.textContent = "⏸ Playing";
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

if (pauseBtn) {
  pauseBtn.addEventListener("click", pauseCurrent);
}

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
  audio.addEventListener("canplay", () => {
    if (trackMeta) trackMeta.textContent = getCurrentTrack().meta;

    if (pendingAutoplay) {
      pendingAutoplay = false;
      playCurrent();
    }
  });

  audio.addEventListener("loadedmetadata", () => {
    if (durationEl) durationEl.textContent = formatTime(audio.duration);
  });

  audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return;

    if (seekBar) seekBar.value = String((audio.currentTime / audio.duration) * 100);
    if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);

    const track = getCurrentTrack();
    if (audio.currentTime >= LISTEN_REWARD_SECONDS) {
      const awarded = awardCoolPoints(
        LISTEN_REWARD_POINTS,
        "listen20",
        track.key,
        LISTEN_COOLDOWN_MS
      );

      if (awarded && trackMeta) {
        trackMeta.textContent = `${track.meta} • +${LISTEN_REWARD_POINTS} Cool Points`;
        setTimeout(() => {
          if (getCurrentTrack().key === track.key && trackMeta) {
            trackMeta.textContent = track.meta;
          }
        }, 1800);
      }
    }
  });

  audio.addEventListener("ended", () => {
    const track = getCurrentTrack();

    const awarded = awardCoolPoints(
      COMPLETE_REWARD_POINTS,
      "complete",
      track.key,
      COMPLETE_COOLDOWN_MS
    );

    if (awarded && trackMeta) {
      trackMeta.textContent = `${track.meta} • +${COMPLETE_REWARD_POINTS} completion bonus`;
    }

    loadTrack(currentIndex + 1, true);
  });

  audio.addEventListener("error", () => {
    tryNextSource();
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
