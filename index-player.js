// File: script.js
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
  const REMINDER_INTERVAL_MS = 30000;
  const REMINDER_CHANCE = 0.07;
  const TOAST_LIFETIME_MS = 2600;
  const PLAY_REWARD_COOLDOWN_MS = 15000;

  const $ = (id) => document.getElementById(id);
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

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
    duckHost: $("duck-helper"),
    pointsHost: $("cool-points-widget"),
  };

  const songButtons = Array.from(document.querySelectorAll(".home-song"));
  const earnButtons = Array.from(document.querySelectorAll(".earn-points"));

  let current = 0;
  let points = getStoredNumber(STORAGE_KEY, 0);
  let finishAwarded = false;
  let lastPlayRewardAt = 0;
  let lastSelectedTrack = -1;
  let reminderTimer = null;

  const state = {
    toastContainer: null,
    pointsCard: null,
    pointsValue: null,
    pointsLevel: null,
    lastRenderedTime: "",
    lastRenderedDuration: "",
    lastRenderedProgress: -1,
  };

  function getStoredNumber(key, fallback) {
    const raw = localStorage.getItem(key);
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  }

  function safeTrack(index) {
    current = ((index % TRACKS.length) + TRACKS.length) % TRACKS.length;
    return TRACKS[current];
  }

  function fmt(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${mins}:${secs}`;
  }

  function levelTitle() {
    let title = LEVELS[0].title;
    for (const level of LEVELS) {
      if (points >= level.score) title = level.title;
    }
    return title;
  }

  function savePoints() {
    localStorage.setItem(STORAGE_KEY, String(points));
  }

  function trackEvent(name, params = {}) {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", name, params);
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
    if (state.pointsValue) state.pointsValue.textContent = String(points);
    if (state.pointsLevel) state.pointsLevel.textContent = levelTitle();
  }

  function addPoints(amount, reason = "") {
    if (!Number.isFinite(amount) || amount <= 0) return;
    points += amount;
    savePoints();
    renderPoints();
    showToast(`+${amount} COOL POINTS • ${levelTitle()}`);
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

    buck(sayings[Math.floor(Math.random() * sayings.length)]);
  }

  function updateTrackUI(track) {
    if (els.title) els.title.textContent = track.title;
    if (els.meta) els.meta.textContent = track.meta;
    if (els.art && els.art.src !== track.art) els.art.src = track.art;

    if (els.stickyTitle) els.stickyTitle.textContent = track.title;
    if (els.stickyMeta) els.stickyMeta.textContent = track.meta;
    if (els.stickyArt && els.stickyArt.src !== track.art) {
      els.stickyArt.src = track.art;
    }

    songButtons.forEach((button, index) => {
      button.classList.toggle("active", index === current);
      button.setAttribute("aria-pressed", String(index === current));
    });
  }

  function setTrack(index, { autoplay = false, awardSelection = false } = {}) {
    const track = safeTrack(index);
    finishAwarded = false;
    state.lastRenderedDuration = "";
    state.lastRenderedTime = "";
    state.lastRenderedProgress = -1;

    if (audio.src !== new URL(track.file, window.location.href).href) {
      audio.src = track.file;
      audio.load();
    }

    updateTrackUI(track);

    if (awardSelection && lastSelectedTrack !== current) {
      lastSelectedTrack = current;
      addPoints(5, "select_track");
    }

    if (autoplay) {
      void playTrack();
    } else {
      syncProgressUI();
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
    const currentTimeText = fmt(audio.currentTime);
    if (els.current && state.lastRenderedTime !== currentTimeText) {
      state.lastRenderedTime = currentTimeText;
      els.current.textContent = currentTimeText;
    }

    const durationText = fmt(audio.duration);
    if (els.duration && state.lastRenderedDuration !== durationText) {
      state.lastRenderedDuration = durationText;
      els.duration.textContent = durationText;
    }

    if (els.progress && Number.isFinite(audio.duration) && audio.duration > 0) {
      const progressValue = Math.round((audio.currentTime / audio.duration) * 1000) / 10;
      if (progressValue !== state.lastRenderedProgress) {
        state.lastRenderedProgress = progressValue;
        els.progress.value = String(progressValue);
      }
    } else if (els.progress && state.lastRenderedProgress !== 0) {
      state.lastRenderedProgress = 0;
      els.progress.value = "0";
    }
  }

  function maybeAwardFinish() {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0 || finishAwarded) return;
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

    earnButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const value = Number(button.dataset.points || 5);
        if (Number.isFinite(value) && value > 0) {
          addPoints(value, "engagement_click");
        }
      });
    });

    els.play?.addEventListener("click", () => void playTrack());
    els.pause?.addEventListener("click", pauseTrack);
    els.stickyPlay?.addEventListener("click", () => void playTrack());
    els.stickyPause?.addEventListener("click", pauseTrack);
  }

  function bindAudio() {
    audio.preload = "metadata";

    audio.addEventListener("loadedmetadata", syncProgressUI);
    audio.addEventListener("durationchange", syncProgressUI);
    audio.addEventListener("timeupdate", () => {
      syncProgressUI();
      maybeAwardFinish();
    });

    els.progress?.addEventListener("input", () => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
      const rawValue = Number(els.progress.value);
      const safeValue = clamp(rawValue, 0, 100);
      audio.currentTime = (safeValue / 100) * audio.duration;
      syncProgressUI();
    });

    audio.addEventListener("ended", nextTrack);
  }

  function dailyVisit() {
    const today = new Date().toDateString();
    const lastVisit = localStorage.getItem(VISIT_KEY);

    if (lastVisit === today) return;

    localStorage.setItem(VISIT_KEY, today);
    addPoints(25, "daily_login");
    duck("DAILY CHECK IN +25");
  }

  function analyticsPage() {
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
    if (reminderTimer) {
      window.clearInterval(reminderTimer);
      reminderTimer = null;
    }
  }

  function init() {
    renderPoints();
    setTrack(0);
    bindButtons();
    bindAudio();
    dailyVisit();
    analyticsPage();
    randomBuck();
    startReminders();

    window.addEventListener("beforeunload", stopReminders, { once: true });
  }

  init();
})();
