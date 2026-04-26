// File: index-player.js
(() => {
  const TRACKS = [
    {
      title: "HAM",
      artist: "Hyph Life",
      meta: "Hyph Life — prod by 1ManBand",
      file: "music/ham.mp3",
      art: "album-art.jpg",
    },
    {
      title: "KIKI",
      artist: "Cuz Zaid x JCrown x Ruzzo",
      meta: "Cuz Zaid x JCrown x Ruzzo — prod by Cuz Zaid",
      file: "music/kiki.mp3",
      art: "kiki-art.jpg",
    },
    {
      title: "ON GOD",
      artist: "BooGotGluu x No Flash",
      meta: "BooGotGluu x No Flash",
      file: "music/on-god.mp3",
      art: "album-art.jpg",
    },
    {
      title: "TIME",
      artist: "SIXX FIGGAZ x Hyph Life",
      meta: "SIXX FIGGAZ x Hyph Life",
      file: "music/time.mp3",
      art: "time-art.jpg",
    },
  ];

  const LEVELS = [
    { score: 0, title: "Rookie" },
    { score: 100, title: "Active" },
    { score: 250, title: "Respectable" },
    { score: 500, title: "Certified" },
    { score: 1000, title: "Real One" },
    { score: 2500, title: "HYPHSWORLD Elite" },
  ];

  const STORAGE_KEY = "hyphsworld_points";
  const VISIT_KEY = "hyphsworld_last_visit";
  const PLAY_REWARD_COOLDOWN_MS = 15000;
  const TOAST_LIFETIME_MS = 2600;
  const REMINDER_INTERVAL_MS = 30000;
  const REMINDER_CHANCE = 0.07;

  const $ = (id) => document.getElementById(id);
  const audio = $("main-audio");

  if (!audio) return;

  const els = {
    title: $("homeTrackTitle"),
    meta: $("homeTrackMeta"),
    art: $("homeTrackArt"),
    play: $("playBtn"),
    pause: $("pauseBtn"),
    progress: $("homeProgress"),
    current: $("homeCurrentTime"),
    duration: $("homeDuration"),
    stickyTitle: $("stickyTrackTitle"),
    stickyMeta: $("stickyTrackMeta"),
    stickyArt: $("stickyArt"),
    stickyPlay: $("stickyPlayBtn"),
    stickyPause: $("stickyPauseBtn"),
    pointsHost: $("cool-points-widget"),
  };

  const songButtons = Array.from(document.querySelectorAll(".home-song"));

  let current = 0;
  let points = getStoredNumber(STORAGE_KEY, 0);
  let finishAwarded = false;
  let lastPlayRewardAt = 0;
  let reminderTimer = null;

  const state = {
    toastContainer: null,
    pointsCard: null,
    pointsValue: null,
    pointsLevel: null,
    lastCurrentText: "",
    lastDurationText: "",
    lastProgressValue: -1,
  };

  function getStoredNumber(key, fallback) {
    const raw = localStorage.getItem(key);
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return "0:00";
    }

    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");

    return `${minutes}:${secs}`;
  }

  function getLevelTitle() {
    let result = LEVELS[0].title;

    for (const level of LEVELS) {
      if (points >= level.score) {
        result = level.title;
      }
    }

    return result;
  }

  function savePoints() {
    localStorage.setItem(STORAGE_KEY, String(points));
  }

  function trackEvent(name, payload = {}) {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", name, payload);
  }

  function ensureToastContainer() {
    if (state.toastContainer) return state.toastContainer;

    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.right = "16px";
    container.style.bottom = "100px";
    container.style.zIndex = "9999";
    container.style.display = "grid";
    container.style.gap = "10px";
    container.style.pointerEvents = "none";

    document.body.appendChild(container);
    state.toastContainer = container;

    return container;
  }

  function showToast(message, tone = "gold") {
    const container = ensureToastContainer();
    const toast = document.createElement("div");

    toast.textContent = message;
    toast.style.padding = "12px 16px";
    toast.style.borderRadius = "14px";
    toast.style.fontWeight = "900";
    toast.style.letterSpacing = ".04em";
    toast.style.maxWidth = "280px";
    toast.style.color = "#111";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    toast.style.transition = "opacity 180ms ease, transform 180ms ease";
    toast.style.boxShadow = "0 20px 40px rgba(0,0,0,.45)";
    toast.style.background =
      tone === "red"
        ? "linear-gradient(180deg,#ffb3b3,#d83b3b)"
        : "linear-gradient(180deg,#f1d28a,#c9a34a)";

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });

    window.setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(8px)";
      window.setTimeout(() => toast.remove(), 180);
    }, TOAST_LIFETIME_MS);
  }

  function ensurePointsCard() {
    if (!els.pointsHost || state.pointsCard) return;

    const card = document.createElement("div");
    card.style.position = "fixed";
    card.style.left = "14px";
    card.style.bottom = "96px";
    card.style.zIndex = "9998";
    card.style.background = "rgba(0,0,0,.88)";
    card.style.color = "#fff";
    card.style.border = "1px solid rgba(255,255,255,.12)";
    card.style.borderRadius = "18px";
    card.style.padding = "12px 14px";
    card.style.minWidth = "170px";
    card.style.fontFamily = "Arial,sans-serif";
    card.style.backdropFilter = "blur(8px)";

    const label = document.createElement("div");
    label.textContent = "COOL POINTS";
    label.style.fontSize = "11px";
    label.style.letterSpacing = ".18em";
    label.style.color = "#f1d28a";

    const value = document.createElement("div");
    value.style.fontSize = "24px";
    value.style.fontWeight = "900";
    value.style.marginTop = "4px";

    const level = document.createElement("div");
    level.style.fontSize = "12px";
    level.style.color = "#bdbdbd";

    card.append(label, value, level);
    els.pointsHost.replaceChildren(card);

    state.pointsCard = card;
    state.pointsValue = value;
    state.pointsLevel = level;
  }

  function renderPoints() {
    if (!els.pointsHost) return;

    ensurePointsCard();

    if (state.pointsValue) {
      state.pointsValue.textContent = String(points);
    }

    if (state.pointsLevel) {
      state.pointsLevel.textContent = getLevelTitle();
    }
  }

  function addPoints(amount, reason = "") {
    if (!Number.isFinite(amount) || amount <= 0) return;

    points += amount;
    savePoints();
    renderPoints();
    showToast(`+${amount} COOL POINTS • ${getLevelTitle()}`);

    if (reason) {
      trackEvent("cool_points", {
        points_added: amount,
        reason,
      });
    }
  }

  function buck(message = "DENIED BLOOD") {
    showToast(message, "red");
  }

  function duck(message = "RUN IT UP 😈") {
    showToast(message);
  }

  function randomBuck() {
    if (Math.random() <= 0.82) return;

    const sayings = [
      "DENIED BLOOD",
      "I NEED YOU LEAVE",
      "MOVE AROUND",
      "YOU AIN'T CLEARED",
      "NOT TODAY BLOOD",
    ];

    const choice = sayings[Math.floor(Math.random() * sayings.length)];
    buck(choice);
  }

  function getTrack(index) {
    current = ((index % TRACKS.length) + TRACKS.length) % TRACKS.length;
    return TRACKS[current];
  }

  function updateTrackButtons() {
    songButtons.forEach((button, index) => {
      const isActive = index === current;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function updateTrackUI(track) {
    if (els.title) {
      els.title.textContent = track.title;
    }

    if (els.meta) {
      els.meta.textContent = track.meta;
    }

    if (els.art) {
      els.art.src = track.art;
      els.art.alt = `${track.title} artwork`;
    }

    if (els.stickyTitle) {
      els.stickyTitle.textContent = track.title;
    }

    if (els.stickyMeta) {
      els.stickyMeta.textContent = track.meta;
    }

    if (els.stickyArt) {
      els.stickyArt.src = track.art;
      els.stickyArt.alt = `${track.title} artwork`;
    }

    updateTrackButtons();
  }

  function setTrack(index, options = {}) {
    const { autoplay = false, awardSelection = false } = options;
    const track = getTrack(index);

    finishAwarded = false;
    state.lastCurrentText = "";
    state.lastDurationText = "";
    state.lastProgressValue = -1;

    audio.src = track.file;
    audio.load();

    updateTrackUI(track);
    syncProgressUI();

    if (awardSelection) {
      addPoints(5, "select_track");
    }

    if (autoplay) {
      void playTrack();
    }
  }

  async function playTrack() {
    try {
      await audio.play();

      const now = Date.now();
      if (now - lastPlayRewardAt >= PLAY_REWARD_COOLDOWN_MS) {
        lastPlayRewardAt = now;
        addPoints(10, "play_song");
        duck("MOTION +10");
      }

      trackEvent("play_song", {
        track: TRACKS[current]?.title ?? "",
      });
    } catch {
      buck("PRESS PLAY AGAIN");
    }
  }

  function pauseTrack() {
    audio.pause();
  }

  function nextTrack() {
    setTrack(current + 1, { autoplay: true });
  }

  function syncProgressUI() {
    const currentText = formatTime(audio.currentTime);
    if (els.current && currentText !== state.lastCurrentText) {
      state.lastCurrentText = currentText;
      els.current.textContent = currentText;
    }

    const durationText = formatTime(audio.duration);
    if (els.duration && durationText !== state.lastDurationText) {
      state.lastDurationText = durationText;
      els.duration.textContent = durationText;
    }

    if (!els.progress) return;

    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      const progressValue = Math.round((audio.currentTime / audio.duration) * 1000) / 10;
      if (progressValue !== state.lastProgressValue) {
        state.lastProgressValue = progressValue;
        els.progress.value = String(progressValue);
      }
      return;
    }

    if (state.lastProgressValue !== 0) {
      state.lastProgressValue = 0;
      els.progress.value = "0";
    }
  }

  function maybeAwardFinish() {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    if (finishAwarded) return;
    if (audio.currentTime / audio.duration < 0.92) return;

    finishAwarded = true;
    addPoints(20, "song_finish");
    duck("SONG FINISHED +20");
  }

  function bindButtons() {
    songButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.index || 0);
        setTrack(index, { awardSelection: true });
      });
    });

    els.play?.addEventListener("click", () => {
      void playTrack();
    });

    els.pause?.addEventListener("click", pauseTrack);

    els.stickyPlay?.addEventListener("click", () => {
      void playTrack();
    });

    els.stickyPause?.addEventListener("click", pauseTrack);
  }

  function bindAudio() {
    audio.addEventListener("loadedmetadata", syncProgressUI);
    audio.addEventListener("durationchange", syncProgressUI);

    audio.addEventListener("timeupdate", () => {
      syncProgressUI();
      maybeAwardFinish();
    });

    audio.addEventListener("ended", nextTrack);

    els.progress?.addEventListener("input", () => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;

      const nextValue = clamp(Number(els.progress.value), 0, 100);
      audio.currentTime = (nextValue / 100) * audio.duration;
      syncProgressUI();
    });
  }

  function handleDailyVisit() {
    const today = new Date().toDateString();
    const lastVisit = localStorage.getItem(VISIT_KEY);

    if (lastVisit === today) return;

    localStorage.setItem(VISIT_KEY, today);
    addPoints(25, "daily_login");
    duck("DAILY CHECK IN +25");
  }

  function sendPageAnalytics() {
    trackEvent("homepage_loaded", { page: "index" });
  }

  function startReminders() {
    stopReminders();

    reminderTimer = window.setInterval(() => {
      if (Math.random() < REMINDER_CHANCE) {
        duck("ONE MORE SONG = MORE POINTS");
      }
    }, REMINDER_INTERVAL_MS);
  }

  function stopReminders() {
    if (!reminderTimer) return;
    window.clearInterval(reminderTimer);
    reminderTimer = null;
  }

  function init() {
    renderPoints();
    setTrack(0);
    bindButtons();
    bindAudio();
    handleDailyVisit();
    sendPageAnalytics();
    randomBuck();
    startReminders();

    window.addEventListener("beforeunload", stopReminders, { once: true });
  }

  init();
})();
