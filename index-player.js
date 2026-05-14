(() => {
  'use strict';

  function loadSharedAnalytics() {
    if (window.__HYPHSWORLD_ANALYTICS_BOOTSTRAP__) return;
    window.__HYPHSWORLD_ANALYTICS_BOOTSTRAP__ = true;
    const script = document.createElement('script');
    script.src = 'site-analytics.js';
    script.defer = true;
    document.head.appendChild(script);
  }

  loadSharedAnalytics();

  const LEGACY_KEYS = [
    'coolPoints', 'cool_points', 'hyphCoolPoints', 'hyphsworld_points',
    'hyphsWorldCoolPoints', 'HYPHSWORLD_COOL_POINTS', 'hw_points', 'points',
    'HW_SESSION_COOL_POINTS_V3', 'HW_SESSION_EARNED_ACTIONS_V3'
  ];

  const POINTS_KEY = 'hyphsworld.coolPoints.total';
  const REWARD_STATE_KEY = 'hyphsworld.rewards.songPlays.v1';
  const MIN_PLAY_SECONDS = 18;
  const MIN_PLAY_RATIO = 0.35;
  const PLAY_REWARD_COOLDOWN_MS = 45 * 1000;
  const BASE_PLAY_POINTS = 3;

  const tracks = {
    ham: { title: 'HAM', meta: 'Hyph Life — prod by 1ManBand', chip: 'HAM', sources: ['ham.mp3'] },
    coviddose: { title: 'COVID DOSE', meta: 'BooGotGluu — AMS WEST debut artist from Richmond, CA', chip: 'COVID DOSE', sources: ['02_COVID_DOSE.mp3', 'covid-dose.mp3', 'boogotgluu-covid-dose.mp3'] },
    kiki: { title: 'KIKI', meta: 'Cuz Zaid x JCrown x Ruzzo — prod by Cuz Zaid', chip: 'KIKI', sources: ['kiki.mp3'] },
    ongod: { title: 'ON GOD', meta: 'BooGotGluu x No Flash', chip: 'ON GOD', sources: ['on-god.mp3'] },
    time: { title: 'TIME', meta: 'SIXX FIGGAZ x Hyph Life', chip: 'TIME', sources: ['time.mp3'] },
    tez258: { title: '25/8', meta: 'Young Tez — prod by Marty McPhresh', chip: '25/8', sources: ['25-8.mp3'] }
  };

  const songMilestones = [
    { count: 3, points: 10, label: '3-play warmup' },
    { count: 5, points: 20, label: '5-play repeat runner' },
    { count: 10, points: 50, label: '10x song loyalty bonus' },
    { count: 25, points: 125, label: '25x heavy rotation bonus' },
    { count: 50, points: 300, label: '50x anthem bonus' },
    { count: 100, points: 750, label: '100x HYPHSWORLD certified bonus' }
  ];

  const totalMilestones = [
    { count: 10, points: 25, label: '10 total plays' },
    { count: 25, points: 75, label: '25 total plays' },
    { count: 50, points: 175, label: '50 total plays' },
    { count: 100, points: 400, label: '100 total plays' },
    { count: 250, points: 1200, label: '250 total plays' },
    { count: 500, points: 3000, label: '500 total plays' }
  ];

  const duckLines = [
    'Spotlight for the slap. Vault for the pressure. Full Player if you really listening. And stop asking Buck questions he do not work in customer service.',
    'BooGotGluu in the spotlight now. Richmond got another speaker shaking. Duck Sauce stamped it with a greasy wingprint.',
    'Code clean? Transport opens. Code weak? Buck gone look at you like you brought sand to the beach.',
    'Don’t ask me for secrets in the lobby. I got a lightbulb, not a loose mouth.',
    'Level 1 got Quarantine Mixtape energy. Hidden era. Mask on. Pressure out.',
    'Press something. This is not a museum. The buttons are lit for a reason.',
    'Cool Points keep going now. Play songs, repeat songs, hit milestones. Duck Sauce built a treadmill for your ears.'
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
  const duckLine = $('#duck-line');
  const duckTipButton = $('[data-duck-tip]');
  const yearEl = $('#year');

  let coolPoints = 0;
  let currentTrackId = getInitialTrackId();
  let sourceIndex = 0;
  let duckIndex = 0;
  let playStartMs = 0;
  let playStartTime = 0;
  let lastRewardAtByTrack = {};

  function readJSON(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (error) { return fallback; }
  }
  function writeJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) {} }
  function readNumber(key, fallback = 0) { try { const value = Number.parseInt(localStorage.getItem(key), 10); return Number.isFinite(value) ? value : fallback; } catch (error) { return fallback; } }
  function writeNumber(key, value) { try { localStorage.setItem(key, String(Math.max(0, Number.parseInt(value, 10) || 0))); } catch (error) {} }

  function cleanLegacyPoints() {
    try { LEGACY_KEYS.forEach((key) => { localStorage.removeItem(key); sessionStorage.removeItem(key); }); } catch (error) {}
  }

  function rewardState() {
    const base = readJSON(REWARD_STATE_KEY, {});
    return { version: 1, totalPlays: Number.parseInt(base.totalPlays, 10) || 0, tracks: base.tracks && typeof base.tracks === 'object' ? base.tracks : {}, totalMilestones: base.totalMilestones && typeof base.totalMilestones === 'object' ? base.totalMilestones : {} };
  }
  function saveRewardState(state) { writeJSON(REWARD_STATE_KEY, state); }
  function trackState(state, trackId) {
    if (!state.tracks[trackId]) state.tracks[trackId] = { plays: 0, milestones: {} };
    if (!state.tracks[trackId].milestones || typeof state.tracks[trackId].milestones !== 'object') state.tracks[trackId].milestones = {};
    state.tracks[trackId].plays = Number.parseInt(state.tracks[trackId].plays, 10) || 0;
    return state.tracks[trackId];
  }

  function setPoints(value) {
    coolPoints = Math.max(0, Number.parseInt(value, 10) || 0);
    writeNumber(POINTS_KEY, coolPoints);
    if (pointsEl) pointsEl.textContent = String(coolPoints);
    document.dispatchEvent(new CustomEvent('hyph:points-updated', { detail: { points: coolPoints } }));
  }

  async function addPoints(amount, reason) {
    const n = Number.parseInt(amount, 10) || 0;
    if (!n) return coolPoints;
    const next = coolPoints + n;
    setPoints(next);
    if (window.HWAuth && typeof window.HWAuth.addPoints === 'function') {
      try { await window.HWAuth.addPoints(n, reason || 'song_reward'); } catch (error) {}
    }
    return next;
  }

  function setStatus(message) { if (statusEl) statusEl.textContent = message; }
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
    if (!source) { setStatus(`Duck Sauce: I tried every file name for ${track.title}. Check the MP3 upload name.`); return; }
    audio.src = source;
    audio.load();
    setStatus(`Loaded ${track.title}. Listen long enough and Cool Points keep moving.`);
  }
  async function playTrack(trackId = currentTrackId) {
    if (!tracks[trackId]) trackId = 'ham';
    currentTrackId = trackId;
    updateTrackUI(trackId);
    if (!audio) return;
    if (!audio.src || !audio.src.includes(tracks[trackId].sources[sourceIndex] || '')) loadSource(trackId, 0);
    try {
      await audio.play();
      playStartMs = Date.now();
      playStartTime = audio.currentTime || 0;
      setStatus(`${tracks[trackId].title} playing. Stay on it for rewards — Duck Sauce counts repeats now.`);
    } catch (error) { setStatus('Browser blocked autoplay or the audio file is not uploaded yet. Tap Play again after the file lands.'); }
  }
  function pauseTrack() {
    if (!audio) return;
    maybeRewardListen('pause');
    audio.pause();
    setStatus('Paused. Progress counted if you listened long enough. Buck still watching the door.');
  }
  function listenedEnough() {
    if (!audio) return false;
    const elapsedWall = (Date.now() - playStartMs) / 1000;
    const elapsedMedia = Math.max(0, (audio.currentTime || 0) - playStartTime);
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const needed = duration > 0 ? Math.min(MIN_PLAY_SECONDS, Math.max(8, duration * MIN_PLAY_RATIO)) : MIN_PLAY_SECONDS;
    return Math.max(elapsedWall, elapsedMedia) >= needed;
  }
  async function maybeRewardListen(trigger) {
    if (!audio || !currentTrackId || !tracks[currentTrackId]) return;
    if (!playStartMs || !listenedEnough()) return;
    const now = Date.now();
    const lastRewardAt = lastRewardAtByTrack[currentTrackId] || 0;
    if (now - lastRewardAt < PLAY_REWARD_COOLDOWN_MS && trigger !== 'ended') return;
    lastRewardAtByTrack[currentTrackId] = now;
    playStartMs = Date.now();
    playStartTime = audio.currentTime || 0;
    const state = rewardState();
    const tState = trackState(state, currentTrackId);
    tState.plays += 1;
    state.totalPlays += 1;
    let earned = BASE_PLAY_POINTS;
    const notes = [`+${BASE_PLAY_POINTS} play`];
    songMilestones.forEach((milestone) => { const key = String(milestone.count); if (tState.plays >= milestone.count && !tState.milestones[key]) { tState.milestones[key] = true; earned += milestone.points; notes.push(`+${milestone.points} ${milestone.label}`); } });
    totalMilestones.forEach((milestone) => { const key = String(milestone.count); if (state.totalPlays >= milestone.count && !state.totalMilestones[key]) { state.totalMilestones[key] = true; earned += milestone.points; notes.push(`+${milestone.points} ${milestone.label}`); } });
    saveRewardState(state);
    await addPoints(earned, `song_play:${currentTrackId}:${trigger}`);
    const trackTitle = tracks[currentTrackId].title;
    setStatus(`${trackTitle} play #${tState.plays} counted. ${notes.join(' • ')}. Total plays: ${state.totalPlays}.`);
  }
  function initAudio() {
    if (!audio || !titleEl || !metaEl) return;
    updateTrackUI(currentTrackId);
    loadSource(currentTrackId, 0);
    audio.addEventListener('error', () => {
      const track = tracks[currentTrackId] || tracks.ham;
      const nextIndex = sourceIndex + 1;
      if (track.sources[nextIndex]) loadSource(currentTrackId, nextIndex);
      else setStatus(`Audio file missing for ${track.title}. Upload one of: ${track.sources.join(', ')}`);
    });
    audio.addEventListener('timeupdate', () => {
      if (!audio || !progressEl) return;
      const duration = audio.duration || 0;
      if (duration > 0) progressEl.value = String(Math.min(100, (audio.currentTime / duration) * 100));
      if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime || 0);
      if (durationTimeEl) durationTimeEl.textContent = formatTime(duration);
    });
    audio.addEventListener('play', () => { playStartMs = Date.now(); playStartTime = audio.currentTime || 0; });
    audio.addEventListener('pause', () => maybeRewardListen('pause'));
    audio.addEventListener('ended', () => maybeRewardListen('ended'));
    if (progressEl) progressEl.addEventListener('input', () => { if (!audio || !audio.duration) return; audio.currentTime = (Number(progressEl.value) / 100) * audio.duration; });
  }
  function initButtons() {
    $$('[data-track-id]').forEach((button) => {
      button.addEventListener('click', (event) => { event.preventDefault(); sourceIndex = 0; playTrack(button.dataset.trackId); });
    });
    $$('[data-player-action]').forEach((button) => {
      button.addEventListener('click', (event) => { event.preventDefault(); const action = button.dataset.playerAction; if (action === 'play') playTrack(currentTrackId); if (action === 'pause') pauseTrack(); });
    });
  }
  function initDuckGuide() {
    if (!duckTipButton || !duckLine) return;
    duckTipButton.addEventListener('click', () => { duckIndex = (duckIndex + 1) % duckLines.length; duckLine.textContent = duckLines[duckIndex]; addPoints(2, 'duck_tip'); });
  }
  async function restorePoints() {
    const localPoints = readNumber(POINTS_KEY, 0);
    setPoints(localPoints);
    if (window.HWAuth && typeof window.HWAuth.getPoints === 'function') {
      try { const accountPoints = await window.HWAuth.getPoints(); if (Number.isFinite(Number(accountPoints))) setPoints(Math.max(localPoints, Number(accountPoints))); } catch (error) {}
    }
  }
  function init() {
    cleanLegacyPoints();
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
    restorePoints();
    initAudio();
    initButtons();
    initDuckGuide();
  }
  init();
})();
