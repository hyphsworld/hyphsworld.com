(() => {
  'use strict';

  const LEGACY_KEYS = [
    'coolPoints', 'cool_points', 'hyphCoolPoints', 'hyphsworld_points',
    'hyphsWorldCoolPoints', 'HYPHSWORLD_COOL_POINTS', 'hw_points', 'points',
    'HW_SESSION_COOL_POINTS_V3', 'HW_SESSION_EARNED_ACTIONS_V3'
  ];

  const tracks = {
    ham: {
      title: 'HAM',
      meta: 'Hyph Life — prod by 1ManBand',
      chip: 'HAM',
      sources: ['audio/ham.mp3', 'music/ham.mp3', 'ham.mp3', 'HAM.mp3', ':audio:ham.mp3', '%3Aaudio%3Aham.mp3']
    },
    kiki: {
      title: 'KIKI',
      meta: 'Cuz Zaid x JCrown x Ruzzo — prod by Cuz Zaid',
      chip: 'KIKI',
      sources: ['audio/kiki.mp3', 'music/kiki.mp3', 'kiki.mp3', 'KIKI.mp3', ':audio:kiki.mp3', '%3Aaudio%3Akiki.mp3']
    },
    ongod: {
      title: 'ON GOD',
      meta: 'BooGotGluu x No Flash',
      chip: 'ON GOD',
      sources: ['audio/on-god.mp3', 'music/on-god.mp3', 'on-god.mp3', 'on_god.mp3', 'ON-GOD.mp3', ':audio:on-god.mp3', '%3Aaudio%3Aon-god.mp3']
    },
    time: {
      title: 'TIME',
      meta: 'SIXX FIGGAZ x Hyph Life',
      chip: 'TIME',
      sources: ['audio/time.mp3', 'music/time.mp3', 'time.mp3', 'TIME.mp3', ':audio:time.mp3', '%3Aaudio%3Atime.mp3']
    },
    tez258: {
      title: '25/8',
      meta: 'Young Tez — prod by Marty McPhresh',
      chip: '25/8',
      sources: ['audio/25-8.mp3', 'music/25-8.mp3', '25-8.mp3', '25_8.mp3', '258.mp3']
    }
  };

  const duckLines = [
    'Spotlight for the slap. Vault for the pressure. Full Player if you really listening. And stop asking Buck questions he do not work in customer service.',
    'Code clean? Transport opens. Code weak? Buck gone look at you like you brought sand to the beach.',
    'Don’t ask me for secrets in the lobby. I got a lightbulb, not a loose mouth.',
    'Level 1 got Quarantine Mixtape energy. Hidden era. Mask on. Pressure out.',
    'Press something. This is not a museum. The buttons are lit for a reason.',
    'If the MP4 is moving, the site is breathing. If the beat plays, the world is open.'
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const audio = $('#hyph-audio');
  const titleEl = $('#track-title');
  const metaEl = $('#track-meta');
  const chipEl = $('#active-track-chip');
  const statusEl = $('#player-status');
  const pointsEl = $('#cool-points');
  const progressEl = $('#track-progress');
  const currentTimeEl = $('#current-time');
  const durationTimeEl = $('#duration-time');
  const heroVideo = $('#hero-video');
  const heroToggle = $('[data-hero-toggle]');
  const heroStatus = $('#hero-video-status');
  const duckLine = $('#duck-line');
  const duckTipButton = $('[data-duck-tip]');
  const yearEl = $('#year');

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
      // Storage can be blocked. Points stay memory-only.
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

  function setStatus(message) {
    if (statusEl) statusEl.textContent = message;
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
  }

  function getInitialTrackId() {
    const params = new URLSearchParams(window.location.search);
    const queryTrack = params.get('track');
    if (queryTrack && tracks[queryTrack]) return queryTrack;
    const hash = window.location.hash.replace('#track-', '').trim();
    if (hash && tracks[hash]) return hash;
    return 'ham';
  }

  function updateTrackUI(trackId) {
    const track = tracks[trackId] || tracks.ham;
    if (titleEl) titleEl.textContent = track.title;
    if (metaEl) metaEl.textContent = track.meta;
    if (chipEl) chipEl.textContent = track.chip;
    $$('[data-track-id]').forEach((button) => button.classList.toggle('is-active', button.dataset.trackId === trackId));
  }

  function loadSource(trackId, index = 0) {
    if (!audio) return;
    const track = tracks[trackId] || tracks.ham;
    sourceIndex = index;
    const source = track.sources[sourceIndex];
    if (!source) {
      setStatus(`Duck Sauce: I tried every file name for ${track.title}. Check the MP3 name.`);
      return;
    }
    audio.src = source;
    audio.load();
    setStatus(`Loaded ${track.title}. Tap play if the browser is acting Hollywood.`);
  }

  async function playTrack(trackId = currentTrackId) {
    if (!tracks[trackId]) trackId = 'ham';
    currentTrackId = trackId;
    playRequested = true;
    updateTrackUI(trackId);
    if (!audio) return;
    if (!audio.src || !audio.src.includes(tracks[trackId].sources[sourceIndex] || '')) loadSource(trackId, 0);
    try {
      await audio.play();
      setStatus(`${tracks[trackId].title} playing. Duck Sauce said quit refreshing and listen.`);
      award(`play-${trackId}`, trackId === 'tez258' ? 15 : 10);
    } catch (error) {
      setStatus('Browser blocked autoplay. Tap Play one more time. Duck blamed Safari.');
    }
  }

  function pauseTrack() {
    if (!audio) return;
    audio.pause();
    setStatus('Paused. Buck still watching the door.');
  }

  function initAudio() {
    if (!audio || !titleEl || !metaEl) return;
    updateTrackUI(currentTrackId);
    loadSource(currentTrackId, 0);

    audio.addEventListener('error', () => {
      const track = tracks[currentTrackId] || tracks.ham;
      const nextIndex = sourceIndex + 1;
      if (nextIndex < track.sources.length) {
        loadSource(currentTrackId, nextIndex);
        if (playRequested) playTrack(currentTrackId);
      } else {
        setStatus(`MP3 not found for ${track.title}. Rename/upload the file or update index-player.js.`);
      }
    });

    audio.addEventListener('timeupdate', () => {
      if (!audio.duration || !progressEl) return;
      progressEl.value = String((audio.currentTime / audio.duration) * 100);
      if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
      if (durationTimeEl) durationTimeEl.textContent = formatTime(audio.duration);
    });

    audio.addEventListener('loadedmetadata', () => {
      if (durationTimeEl) durationTimeEl.textContent = formatTime(audio.duration);
    });

    if (progressEl) {
      progressEl.addEventListener('input', () => {
        if (!audio.duration) return;
        audio.currentTime = (Number(progressEl.value) / 100) * audio.duration;
      });
    }
  }

  function initButtons() {
    $$('[data-track-id]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        sourceIndex = 0;
        playTrack(button.dataset.trackId);
      });
    });

    $$('[data-player-action]').forEach((button) => {
      button.addEventListener('click', () => {
        if (button.dataset.playerAction === 'play') playTrack(currentTrackId);
        if (button.dataset.playerAction === 'pause') pauseTrack();
      });
    });
  }

  function initDuckGuide() {
    if (!duckTipButton || !duckLine) return;
    duckTipButton.addEventListener('click', () => {
      duckIndex = (duckIndex + 1) % duckLines.length;
      duckLine.textContent = duckLines[duckIndex];
      award('duck-tip', 5);
    });
  }

  function initHeroVideo() {
    if (!heroVideo) return;
    const sources = (heroVideo.dataset.heroSources || '')
      .split('|')
      .map((item) => item.trim())
      .filter(Boolean);

    if (!sources.length) return;

    let heroIndex = 0;
    const card = heroVideo.closest('.hero-video-card');

    function setHeroMessage(text) {
      if (heroStatus) heroStatus.textContent = text;
    }

    function tryHero(index) {
      if (index >= sources.length) {
        if (card) card.classList.add('is-video-missing');
        setHeroMessage('MP4 not found. Upload hyphsworld-hero.mp4 or keep delta-work.mp4 in root.');
        return;
      }
      heroIndex = index;
      heroVideo.src = sources[heroIndex];
      heroVideo.load();
      setHeroMessage(`Testing MP4: ${sources[heroIndex]}`);
      const playPromise = heroVideo.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => setHeroMessage('Hero video loaded. Browser may keep it muted until tap.'));
      }
    }

    heroVideo.addEventListener('loadeddata', () => {
      if (card) card.classList.add('is-video-live');
      setHeroMessage(`MP4 HERO LIVE: ${sources[heroIndex]}`);
    });

    heroVideo.addEventListener('error', () => tryHero(heroIndex + 1));

    if (heroToggle) {
      heroToggle.addEventListener('click', async () => {
        heroVideo.muted = !heroVideo.muted;
        heroToggle.textContent = heroVideo.muted ? 'Hero Sound: Off' : 'Hero Sound: On';
        try { await heroVideo.play(); } catch (error) { setHeroMessage('Tap again if Safari wants permission.'); }
      });
    }

    tryHero(0);
  }

  function init() {
    cleanLegacyPoints();
    setPoints(0);
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
    initHeroVideo();
    initAudio();
    initButtons();
    initDuckGuide();
  }

  init();
})();
