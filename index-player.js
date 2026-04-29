(() => {
  'use strict';

  const POINT_KEY = 'HW_SESSION_COOL_POINTS_V3';
  const EARNED_KEY = 'HW_SESSION_EARNED_ACTIONS_V3';
  const LEGACY_KEYS = [
    'coolPoints',
    'cool_points',
    'hyphCoolPoints',
    'hyphsworld_points',
    'hyphsWorldCoolPoints',
    'HYPHSWORLD_COOL_POINTS',
    'hw_points',
    'points'
  ];

  const tracks = {
    ham: {
      title: 'HAM',
      meta: 'Hyph Life — prod by 1ManBand',
      chip: 'HAM',
      sources: ['audio/ham.mp3', 'music/ham.mp3', 'ham.mp3', 'HAM.mp3']
    },
    kiki: {
      title: 'KIKI',
      meta: 'Cuz Zaid x JCrown x Ruzzo — prod by Cuz Zaid',
      chip: 'KIKI',
      sources: ['audio/kiki.mp3', 'music/kiki.mp3', 'kiki.mp3', 'KIKI.mp3']
    },
    ongod: {
      title: 'ON GOD',
      meta: 'BooGotGluu x No Flash',
      chip: 'ON GOD',
      sources: ['audio/on-god.mp3', 'music/on-god.mp3', 'on-god.mp3', 'on_god.mp3', 'ON-GOD.mp3']
    },
    time: {
      title: 'TIME',
      meta: 'SIXX FIGGAZ x Hyph Life',
      chip: 'TIME',
      sources: ['audio/time.mp3', 'music/time.mp3', 'time.mp3', 'TIME.mp3']
    },
    tez258: {
      title: '25/8',
      meta: 'Young Tez — prod by Marty McPhresh',
      chip: '25/8',
      sources: ['audio/25-8.mp3', 'music/25-8.mp3', '25-8.mp3', '25_8.mp3', '258.mp3']
    }
  };

  const audio = document.getElementById('hyph-audio');
  const titleEl = document.getElementById('track-title');
  const metaEl = document.getElementById('track-meta');
  const chipEl = document.getElementById('active-track-chip');
  const statusEl = document.getElementById('player-status');
  const pointsEl = document.getElementById('cool-points');
  const progressEl = document.getElementById('track-progress');
  const currentTimeEl = document.getElementById('current-time');
  const durationTimeEl = document.getElementById('duration-time');

  if (!audio || !titleEl || !metaEl) return;

  let currentTrackId = getInitialTrackId();
  let sourceIndex = 0;
  let playRequested = false;

  function cleanLegacyPoints() {
    try {
      LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      // Private browsing can block localStorage. Session-only points still work in memory fallback.
    }
  }

  function getPoints() {
    const raw = sessionStorage.getItem(POINT_KEY);
    const value = Number.parseInt(raw || '0', 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function setPoints(value) {
    const safeValue = Math.max(0, Number.parseInt(value, 10) || 0);
    sessionStorage.setItem(POINT_KEY, String(safeValue));
    if (pointsEl) pointsEl.textContent = String(safeValue);
  }

  function getEarnedSet() {
    try {
      return new Set(JSON.parse(sessionStorage.getItem(EARNED_KEY) || '[]'));
    } catch (error) {
      return new Set();
    }
  }

  function award(actionId, amount) {
    const earned = getEarnedSet();
    if (earned.has(actionId)) return;
    earned.add(actionId);
    sessionStorage.setItem(EARNED_KEY, JSON.stringify([...earned]));
    setPoints(getPoints() + amount);
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
  }

  function getInitialTrackId() {
    const hash = window.location.hash.replace('#track-', '').trim();
    if (hash && tracks[hash]) return hash;
    return 'ham';
  }

  function setStatus(message) {
    if (statusEl) statusEl.textContent = message;
  }

  function updateTrackUI(trackId) {
    const track = tracks[trackId] || tracks.ham;
    titleEl.textContent = track.title;
    metaEl.textContent = track.meta;
    if (chipEl) chipEl.textContent = track.chip;

    document.querySelectorAll('[data-track-id]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.trackId === trackId);
    });
  }

  function loadSource(trackId) {
    const track = tracks[trackId] || tracks.ham;
    const source = track.sources[sourceIndex] || track.sources[0];
    if (!source) return;
    audio.src = source;
    audio.load();
  }

  function selectTrack(trackId, shouldPlay = false) {
    if (!tracks[trackId]) return;
    currentTrackId = trackId;
    sourceIndex = 0;
    playRequested = Boolean(shouldPlay);
    updateTrackUI(trackId);
    loadSource(trackId);
    setStatus(`${tracks[trackId].title} loaded.`);

    if (shouldPlay) playTrack();
  }

  async function playTrack() {
    const track = tracks[currentTrackId] || tracks.ham;
    if (!audio.src) loadSource(currentTrackId);
    playRequested = true;

    try {
      await audio.play();
      setStatus(`Playing ${track.title}.`);
      award(`played:${currentTrackId}`, currentTrackId === 'tez258' ? 8 : 5);
    } catch (error) {
      setStatus('Audio needs the track file uploaded or the browser needs one more tap.');
    }
  }

  function pauseTrack() {
    audio.pause();
    playRequested = false;
    setStatus('Paused.');
  }

  function tryNextSource() {
    const track = tracks[currentTrackId] || tracks.ham;
    sourceIndex += 1;

    if (sourceIndex < track.sources.length) {
      loadSource(currentTrackId);
      if (playRequested) playTrack();
      return;
    }

    setStatus(`Missing audio file for ${track.title}. Upload one of: ${track.sources.join(', ')}`);
    playRequested = false;
  }

  document.addEventListener('click', (event) => {
    const trackButton = event.target.closest('[data-track-id]');
    const actionButton = event.target.closest('[data-player-action]');

    if (actionButton) {
      const action = actionButton.dataset.playerAction;
      const trackId = actionButton.dataset.trackId;

      if (action === 'play-track' && trackId) {
        selectTrack(trackId, true);
        return;
      }

      if (action === 'play') {
        playTrack();
        return;
      }

      if (action === 'pause') {
        pauseTrack();
        return;
      }
    }

    if (trackButton && trackButton.dataset.trackId && !trackButton.dataset.playerAction) {
      selectTrack(trackButton.dataset.trackId, true);
    }
  });

  audio.addEventListener('error', tryNextSource);

  audio.addEventListener('loadedmetadata', () => {
    if (durationTimeEl) durationTimeEl.textContent = formatTime(audio.duration);
  });

  audio.addEventListener('timeupdate', () => {
    if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
    if (progressEl && Number.isFinite(audio.duration) && audio.duration > 0) {
      progressEl.value = String((audio.currentTime / audio.duration) * 100);
    }
  });

  audio.addEventListener('ended', () => {
    setStatus('Track finished. Pick the next one.');
    playRequested = false;
  });

  if (progressEl) {
    progressEl.addEventListener('input', () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = (Number(progressEl.value) / 100) * audio.duration;
      }
    });
  }

  cleanLegacyPoints();
  setPoints(getPoints());
  selectTrack(currentTrackId, false);
})();
