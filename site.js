/* HYPHSWORLD clean shared player system.
   One audio instance per page. No duplicate handlers. No saved anonymous points.
*/

(() => {
  "use strict";

  const DEFAULT_POINTS = 203;

  const TRACKS = {
    ham: {
      title: "HAM",
      meta: "Hyph Life — prod by 1ManBand",
      src: "assets/audio/ham.mp3",
      cover: "HAM"
    },
    kiki: {
      title: "KIKI",
      meta: "Cuz Zaid x JCrown x Ruzzo — prod by Cuz Zaid",
      src: "assets/audio/kiki.mp3",
      cover: "KIKI"
    },
    ongod: {
      title: "ON GOD",
      meta: "BooGotGluu x No Flash",
      src: "assets/audio/on-god.mp3",
      cover: "ON GOD"
    },
    time: {
      title: "TIME",
      meta: "Sixx Figgaz x Hyph Life",
      src: "assets/audio/time.mp3",
      cover: "TIME"
    },
    youngtez258: {
      title: "25/8",
      meta: "Young Tez — prod by Marty McPhresh",
      src: "assets/audio/young-tez-25-8.mp3",
      cover: "25/8"
    }
  };

  const OLD_POINT_KEYS = [
    "points",
    "coolPoints",
    "hyphCoolPoints",
    "hyphsworldPoints",
    "hwPoints",
    "savedPoints"
  ];

  OLD_POINT_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      // Storage can be blocked in private mode. Ignore safely.
    }
  });

  let activeTrackId = "ham";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const audio = $("#audioPlayer");
  const status = $("#playerStatus");

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function setPoints() {
    $$("#coolPoints").forEach((node) => {
      node.textContent = String(DEFAULT_POINTS);
    });
  }

  function updateNowPlaying(trackId) {
    const track = TRACKS[trackId] || TRACKS.ham;
    activeTrackId = trackId in TRACKS ? trackId : "ham";

    $$("[data-now-title]").forEach((node) => {
      node.textContent = track.title;
    });

    $$("[data-now-meta]").forEach((node) => {
      node.textContent = track.meta;
    });

    $$("[data-now-cover]").forEach((node) => {
      node.textContent = track.cover;
    });

    document.title = `${track.title} | HYPHSWORLD`;
  }

  async function playTrack(trackId) {
    const track = TRACKS[trackId];

    if (!track) {
      setStatus("Duck Sauce: I do not see that track in the system.");
      return;
    }

    updateNowPlaying(trackId);

    if (!audio) {
      setStatus("Player not found on this page.");
      return;
    }

    if (!audio.src || !audio.src.endsWith(track.src)) {
      audio.src = track.src;
      audio.load();
    }

    try {
      await audio.play();
      setStatus(`Now playing: ${track.title}`);
      if (typeof window.gtag === "function") {
        window.gtag("event", "play_track", {
          event_category: "audio",
          event_label: track.title
        });
      }
    } catch (error) {
      setStatus(`Upload the audio file here: ${track.src}`);
    }
  }

  function pauseTrack() {
    if (!audio) return;
    audio.pause();
    setStatus("Paused.");
  }

  function savePointsMessage() {
    setStatus("Cool Points are not being saved until login is real. No more mystery points on refresh.");
    const join = $("#join");
    if (join) join.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function duckScan() {
    const lines = [
      "Duck Sauce: Scan clean. Buttons hitting. Buck says nobody skipping the line.",
      "Duck Sauce: Level 1 public. Vault pressure behind the door.",
      "Duck Sauce: No random colors. These are strategic fun colors, p.",
      "Duck Sauce: The scanner says the homepage is alive."
    ];

    const line = lines[Math.floor(Math.random() * lines.length)];
    const duckLine = $("#duckLine");

    if (duckLine) duckLine.textContent = line;
    setStatus(line);
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const trackButton = event.target.closest("[data-track]");
      const actionButton = event.target.closest("[data-action]");

      if (trackButton) {
        event.preventDefault();
        playTrack(trackButton.dataset.track);
        return;
      }

      if (!actionButton) return;

      const action = actionButton.dataset.action;

      if (action === "play-current") {
        event.preventDefault();
        playTrack(activeTrackId);
      }

      if (action === "pause") {
        event.preventDefault();
        pauseTrack();
      }

      if (action === "save-points") {
        event.preventDefault();
        savePointsMessage();
      }

      if (action === "duck-scan") {
        event.preventDefault();
        duckScan();
      }
    });

    if (audio) {
      audio.addEventListener("error", () => {
        const track = TRACKS[activeTrackId] || TRACKS.ham;
        setStatus(`Audio file missing or blocked: ${track.src}`);
      });

      audio.addEventListener("ended", () => {
        setStatus("Track ended. Pick the next one.");
      });
    }
  }

  function init() {
    setPoints();
    updateNowPlaying(activeTrackId);
    bindEvents();
  }

  window.HYPHSWORLD = {
    playTrack,
    pauseTrack,
    tracks: TRACKS
  };

  init();
})();
