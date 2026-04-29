(() => {
  'use strict';

  const ACCESS_KEY = 'HW_VAULT_ACCESS_V4';
  const TRACKS = window.HW_QUARANTINE_TRACKS || [];
  const COVER_SOURCES = window.HW_QUARANTINE_COVER_SOURCES || ['quarantine-mixtape.jpg', 'the-quarantine-mixtape.jpg', 'album-art.jpg'];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const audio = $('#quarantine-audio');
  const titleEl = $('#quarantine-title');
  const metaEl = $('#quarantine-meta');
  const chipEl = $('#quarantine-chip');
  const statusEl = $('#quarantine-status');
  const listEl = $('#quarantine-track-list');
  const progressEl = $('#quarantine-progress');
  const currentEl = $('#quarantine-current');
  const durationEl = $('#quarantine-duration');
  const playBtn = $('#quarantine-play');
  const pauseBtn = $('#quarantine-pause');
  const coverEl = $('#quarantine-cover');
  const denied = $('#access-denied');
  const yearEl = $('#year');

  let currentIndex = 0;
  let sourceIndex = 0;
  let playRequested = false;
  let coverIndex = 0;

  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  function hasAccess() {
    try {
      return sessionStorage.getItem(ACCESS_KEY) === 'level-one' || sessionStorage.getItem('HW_QUARANTINE_READY') === 'true';
    } catch (error) {
      return new URLSearchParams(window.location.search).get('transport') === 'granted';
    }
  }

  function showDenied() {
    if (denied) {
      denied.classList.add('is-active');
      denied.setAttribute('aria-hidden', 'false');
    }
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
  }

  function renderTracks() {
    if (!listEl) return;
    listEl.innerHTML = TRACKS.map((track, index) => `
      <button class="track-row" type="button" data-q-index="${index}">
        <b>${track.number || String(index + 1).padStart(2, '0')}</b>
        <span><strong>${track.title}</strong><br>${track.artist || 'Hyph Life'}</span>
        <span class="btn btn-soft">Play</span>
      </button>
    `).join('');

    $$('[data-q-index]').forEach((button) => {
      button.addEventListener('click', () => playTrack(Number(button.dataset.qIndex || 0)));
    });
  }

  function updateUI(index) {
    const track = TRACKS[index];
    if (!track) return;
    currentIndex = index;
    sourceIndex = 0;
    if (chipEl) chipEl.textContent = `TRACK ${track.number || String(index + 1).padStart(2, '0')}`;
    if (titleEl) titleEl.textContent = track.title;
    if (metaEl) metaEl.textContent = `${track.artist || 'Hyph Life'} — ${track.meta || 'Quarantine Mixtape'}`;
    $$('[data-q-index]').forEach((button) => button.classList.toggle('is-active', Number(button.dataset.qIndex) === index));
    updateCover(track);
  }

  function updateCover(track) {
    if (!coverEl) return;
    const artSources = track.art || COVER_SOURCES;
    let index = 0;
    coverEl.onerror = () => {
      index += 1;
      if (index < artSources.length) coverEl.src = artSources[index];
    };
    coverEl.src = artSources[0] || COVER_SOURCES[0];
  }

  function loadSource(index, sourceAttempt = 0) {
    const track = TRACKS[index];
    if (!audio || !track) return;
    const source = (track.sources || [])[sourceAttempt];
    if (!source) {
      setStatus(`Duck Sauce: I cannot find the MP3 for ${track.title}. Check quarantine-tracks.js.`);
      return;
    }
    sourceIndex = sourceAttempt;
    audio.src = source;
    audio.load();
    setStatus(`Loaded ${track.title}. Tap play if Safari blocks it.`);
  }

  async function playTrack(index = currentIndex) {
    if (!TRACKS[index]) return;
    playRequested = true;
    updateUI(index);
    loadSource(index, 0);
    try {
      await audio.play();
      setStatus(`${TRACKS[index].title} playing. Level 1 active.`);
    } catch (error) {
      setStatus('Browser blocked autoplay. Tap Play again. Duck blamed the phone.');
    }
  }

  function pauseTrack() {
    if (!audio) return;
    audio.pause();
    setStatus('Paused. Transport room still open.');
  }

  function initAudio() {
    if (!audio) return;
    audio.addEventListener('error', () => {
      const track = TRACKS[currentIndex];
      const nextSource = sourceIndex + 1;
      if (track && nextSource < (track.sources || []).length) {
        loadSource(currentIndex, nextSource);
        if (playRequested) playTrack(currentIndex);
      } else {
        setStatus('MP3 not found after all fallback paths. Rename/upload the file or update quarantine-tracks.js.');
      }
    });

    audio.addEventListener('timeupdate', () => {
      if (!audio.duration || !progressEl) return;
      progressEl.value = String((audio.currentTime / audio.duration) * 100);
      if (currentEl) currentEl.textContent = formatTime(audio.currentTime);
      if (durationEl) durationEl.textContent = formatTime(audio.duration);
    });

    audio.addEventListener('loadedmetadata', () => {
      if (durationEl) durationEl.textContent = formatTime(audio.duration);
    });

    audio.addEventListener('ended', () => {
      const next = currentIndex + 1;
      if (next < TRACKS.length) playTrack(next);
      else setStatus('Mixtape run complete. Duck Sauce said run it back.');
    });

    if (progressEl) {
      progressEl.addEventListener('input', () => {
        if (!audio.duration) return;
        audio.currentTime = (Number(progressEl.value) / 100) * audio.duration;
      });
    }
  }

  function initButtons() {
    if (playBtn) playBtn.addEventListener('click', () => playTrack(currentIndex));
    if (pauseBtn) pauseBtn.addEventListener('click', pauseTrack);
  }

  function initCoverFallback() {
    if (!coverEl) return;
    coverEl.onerror = () => {
      coverIndex += 1;
      if (coverIndex < COVER_SOURCES.length) coverEl.src = COVER_SOURCES[coverIndex];
    };
    coverEl.src = COVER_SOURCES[0];
  }

  function init() {
    if (!hasAccess()) {
      showDenied();
      return;
    }
    initCoverFallback();
    renderTracks();
    updateUI(0);
    loadSource(0, 0);
    initAudio();
    initButtons();
  }

  init();
})();
