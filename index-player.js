(() => {
  'use strict';

  const LEGACY_KEYS = [
    'coolPoints',
    'cool_points',
    'hyphCoolPoints',
    'hyphsworld_points',
    'hyphsWorldCoolPoints',
    'HYPHSWORLD_COOL_POINTS',
    'hw_points',
    'points',
    'HW_SESSION_COOL_POINTS_V3',
    'HW_SESSION_EARNED_ACTIONS_V3'
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

  const duckLines = [
    'Spotlight is for the slap. Vault is for the pressure. Full Player is where real listeners park.',
    'Do not ask me for every secret. Buck is literally standing by the door with no customer service training.',
    'Press play first. Then act important. That is the official HYPHSWORLD onboarding process.',
    'Vault codes are not lobby decorations. Run the scan and mind your business.',
    'If the hero video moves, the site is breathing. If the beat plays, the lobby is open.',
    'Create ID is coming soon. No fake login. We not doing pretend buttons in 2026.'
  ];

  const audio = document.getElementById('hyph-audio');
  const titleEl = document.getElementById('track-title');
  const metaEl = document.getElementById('track-meta');
  const chipEl = document.getElementById('active-track-chip');
  const statusEl = document.getElementById('player-status');
  const pointsEl = document.getElementById('cool-points');
  const progressEl = document.getElementById('track-progress');
  const currentTimeEl = document.getElementById('current-time');
  const durationTimeEl = document.getElementById('duration-time');
  const heroVideo = document.getElementById('hero-video');
  const heroToggle = document.querySelector('[data-hero-toggle]');
  const duckLine = document.getElementById('duck-line');
  const duckTipButton = document.querySelector('[data-duck-tip]');
  const yearEl = document.getElementById('year');

  let coolPoints = 0;
  let earnedActions = new Set();
  let currentTrackId = getInitialTrackId();
  let sourceIndex = 0;
  let playRequested = false;
  let duckIndex = 0;

  function cleanLegacyPoints() {
    try {
      LEGACY_KEYS.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    } catch (error) {
      // Storage can be blocked in private browsing. Points are memory-only now.
    }
  }

  function setPoints(value) {
    coolPoints = Math.max(0, Number.parseInt(value, 10) || 0);
    if (pointsEl) pointsEl.textContent = String(coolPoints);
  }

  function award(actionId, amount) {
    if (earnedActions.has(actionId)) return;
    earnedActions.add(actionId);
    setPoints(coolPoints + amount);
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
    if (titleEl) titleEl.textContent = track.title;
    if (metaEl) metaEl.textContent = track.meta;
    if (chipEl) chipEl.textContent = track.chip;

    document.querySelectorAll('[data-track-id]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.trackId === trackId);
    });
  }

  function loadSource(trackId) {
    if (!audio) return;
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
    if (!audio) return;
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
    if (!audio) return;
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

  function rotateDuckLine() {
    if (!duckLine) return;
    duckIndex = (duckIndex + 1) % duckLines.length;
    duckLine.textContent = duckLines[duckIndex];
    award(`duck-talk:${duckIndex}`, 1);
  }

  async function initHeroVideo() {
    if (!heroVideo) return;
    heroVideo.muted = true;
    heroVideo.playsInline = true;
    try {
      await heroVideo.play();
    } catch (error) {
      // Mobile browsers may wait for a tap. The poster remains visible.
    }
  }

  function toggleHeroSound() {
    if (!heroVideo) return;
    heroVideo.muted = !heroVideo.muted;
    if (heroToggle) heroToggle.textContent = heroVideo.muted ? 'Hero Sound' : 'Mute Hero';
    heroVideo.play().catch(() => {});
    award('hero:sound-toggle', 2);
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

  if (audio) {
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
  }

  if (progressEl) {
    progressEl.addEventListener('input', () => {
      if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = (Number(progressEl.value) / 100) * audio.duration;
      }
    });
  }

  heroToggle?.addEventListener('click', toggleHeroSound);
  duckTipButton?.addEventListener('click', rotateDuckLine);

  cleanLegacyPoints();
  setPoints(0);
  if (audio && titleEl && metaEl) selectTrack(currentTrackId, false);
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  initHeroVideo();
})();
