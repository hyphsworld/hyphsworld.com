document.addEventListener("DOMContentLoaded", () => {
  const tracks = [
    {
      title: "WHAT'S HANNIN",
      artist: "Hyph Life ft 3D The Capo, Thali — prod by Cuz Zaid",
      src: "whats-hannin.mp3",
      cover: "album-art.jpg"
    },
    {
      title: "WITH ME",
      artist: "Hyph Life — prod K.M.T.",
      src: "with-me.mp3",
      cover: "album-art.jpg"
    },
    {
      title: "BOUT YOU",
      artist: "Hyph Life",
      src: "bout-you.mp3",
      cover: "album-art.jpg"
    },
    {
      title: "NO TRACE SNIP",
      artist: "Hyph Life — prod by Cuz Zaid",
      src: "no-trace-snip.mp3",
      cover: "album-art.jpg"
    }
  ];

  const triviaItems = [
    {
      question: "Which song on the homepage says 'prod by Cuz Zaid' and starts the rotation?",
      answers: ["WHATS HANNIN", "WHATS HANNIN", "WHAT'S HANNIN"],
      code: "CUZZAID",
      success: "Code accepted. You know the motion."
    },
    {
      question: "What is the one-word title of track 02 on the homepage?",
      answers: ["WITH ME", "WITHME"],
      code: "WITHME",
      success: "Correct. Track 02 is locked in."
    },
    {
      question: "Which homepage song includes the word TRACE in the title?",
      answers: ["NO TRACE SNIP", "NOTRACE", "NO TRACE"],
      code: "NOTRACE",
      success: "You got it. No Trace Snip stays in rotation."
    },
    {
      question: "What world are you entering right now?",
      answers: ["HYPHSWORLD"],
      code: "HYPHSWORLD",
      success: "Welcome deeper into HYPHSWORLD."
    }
  ];

  let currentTrack = 0;
  let currentTrivia = 0;

  const audio = document.getElementById("main-audio");
  const playBtn = document.getElementById("playBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const progress = document.getElementById("homeProgress");
  const currentTimeEl = document.getElementById("homeCurrentTime");
  const durationEl = document.getElementById("homeDuration");
  const trackTitle = document.getElementById("homeTrackTitle");
  const trackMeta = document.getElementById("homeTrackMeta");
  const coverArt = document.getElementById("coverArt");
  const queueList = document.getElementById("homeSongList");

  const stickyPlayBtn = document.getElementById("stickyPlayBtn");
  const stickyPauseBtn = document.getElementById("stickyPauseBtn");
  const stickyTrackTitle = document.getElementById("stickyTrackTitle");
  const stickyTrackMeta = document.getElementById("stickyTrackMeta");

  const triviaQuestion = document.getElementById("triviaQuestion");
  const triviaForm = document.getElementById("triviaForm");
  const triviaInput = document.getElementById("triviaInput");
  const triviaFeedback = document.getElementById("triviaFeedback");

  if (!audio) {
    return;
  }

  function formatTime(time) {
    if (!Number.isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function safeTrackEvent(eventName, details = {}) {
    if (typeof gtag === "function") {
      gtag("event", eventName, {
        section: "homepage_player",
        ...details
      });
    }
  }

  function normalizeAnswer(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function setTriviaQuestion(index) {
    currentTrivia = index % triviaItems.length;
    const item = triviaItems[currentTrivia];

    if (triviaQuestion) {
      triviaQuestion.textContent = item.question;
    }

    if (triviaFeedback) {
      triviaFeedback.textContent = "";
      triviaFeedback.className = "trivia-feedback";
    }

    if (triviaInput) {
      triviaInput.value = "";
    }
  }

  function renderQueue() {
    if (!queueList) return;

    queueList.querySelectorAll(".home-song").forEach((button) => {
      const index = Number(button.dataset.index);
      button.classList.toggle("active", index === currentTrack);
    });
  }

  function loadTrack(index, shouldAutoplay = false) {
    currentTrack = index;
    const track = tracks[currentTrack];

    audio.src = track.src;

    if (trackTitle) trackTitle.textContent = track.title;
    if (trackMeta) trackMeta.textContent = track.artist;
    if (coverArt) coverArt.src = track.cover;
    if (stickyTrackTitle) stickyTrackTitle.textContent = track.title;
    if (stickyTrackMeta) stickyTrackMeta.textContent = track.artist;
    if (currentTimeEl) currentTimeEl.textContent = "0:00";
    if (durationEl) durationEl.textContent = "0:00";
    if (progress) progress.value = 0;

    audio._tracked25 = false;
    audio._tracked50 = false;
    audio._tracked75 = false;

    renderQueue();

    safeTrackEvent("vault_track_select", {
      track_title: track.title,
      track_artist: track.artist,
      track_file: track.src
    });

    if (shouldAutoplay) {
      audio.play().catch(() => {});
    }
  }

  function playTrack() {
    audio.play().catch(() => {});
  }

  function pauseTrack() {
    audio.pause();
  }

  function bindSongButtons() {
    if (!queueList) return;

    queueList.querySelectorAll(".home-song").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.index);
        if (Number.isNaN(index)) return;
        loadTrack(index, true);
      });
    });
  }

  if (playBtn) {
    playBtn.addEventListener("click", playTrack);
  }

  if (pauseBtn) {
    pauseBtn.addEventListener("click", pauseTrack);
  }

  if (stickyPlayBtn) {
    stickyPlayBtn.addEventListener("click", playTrack);
  }

  if (stickyPauseBtn) {
    stickyPauseBtn.addEventListener("click", pauseTrack);
  }

  if (progress) {
    progress.addEventListener("input", () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = (Number(progress.value) / 100) * audio.duration;
      }
    });
  }

  audio.addEventListener("loadedmetadata", () => {
    if (durationEl) {
      durationEl.textContent = formatTime(audio.duration);
    }
  });

  audio.addEventListener("timeupdate", () => {
    if (currentTimeEl) {
      currentTimeEl.textContent = formatTime(audio.currentTime);
    }

    if (progress && Number.isFinite(audio.duration) && audio.duration > 0) {
      const percent = (audio.currentTime / audio.duration) * 100;
      progress.value = percent;

      if (percent >= 25 && !audio._tracked25) {
        audio._tracked25 = true;
        safeTrackEvent("vault_progress", {
          track_title: tracks[currentTrack].title,
          progress: "25%"
        });
      }

      if (percent >= 50 && !audio._tracked50) {
        audio._tracked50 = true;
        safeTrackEvent("vault_progress", {
          track_title: tracks[currentTrack].title,
          progress: "50%"
        });
      }

      if (percent >= 75 && !audio._tracked75) {
        audio._tracked75 = true;
        safeTrackEvent("vault_progress", {
          track_title: tracks[currentTrack].title,
          progress: "75%"
        });
      }
    }
  });

  audio.addEventListener("play", () => {
    safeTrackEvent("vault_play", {
      track_title: tracks[currentTrack].title,
      track_artist: tracks[currentTrack].artist
    });
  });

  audio.addEventListener("pause", () => {
    if (!audio.ended) {
      safeTrackEvent("vault_pause", {
        track_title: tracks[currentTrack].title,
        current_time: Math.floor(audio.currentTime || 0)
      });
    }
  });

  audio.addEventListener("ended", () => {
    safeTrackEvent("vault_complete", {
      track_title: tracks[currentTrack].title,
      track_artist: tracks[currentTrack].artist
    });

    const nextIndex = (currentTrack + 1) % tracks.length;
    loadTrack(nextIndex, true);
  });

  if (triviaForm) {
    triviaForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const item = triviaItems[currentTrivia];
      const guess = normalizeAnswer(triviaInput ? triviaInput.value : "");
      const validAnswers = [...item.answers, item.code].map(normalizeAnswer);
      const isCorrect = validAnswers.includes(guess);

      if (!triviaFeedback) return;

      if (isCorrect) {
        triviaFeedback.textContent = `${item.success} CODE: ${item.code}`;
        triviaFeedback.className = "trivia-feedback success";

        safeTrackEvent("trivia_code_success", {
          trivia_question: item.question,
          trivia_code: item.code
        });

        setTriviaQuestion((currentTrivia + 1) % triviaItems.length);
        triviaFeedback.textContent = `${item.success} CODE: ${item.code}`;
        triviaFeedback.className = "trivia-feedback success";
      } else {
        triviaFeedback.textContent = "Not yet. Tap back in and try another code.";
        triviaFeedback.className = "trivia-feedback error";

        safeTrackEvent("trivia_code_fail", {
          trivia_question: item.question
        });
      }
    });
  }

  loadTrack(currentTrack, false);
  bindSongButtons();
  renderQueue();
  setTriviaQuestion(0);
});