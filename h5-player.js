(() => {
  'use strict';

  const POINTS_KEY = 'hyphsworld.coolPoints.total';
  const LEGACY_POINTS_KEY = 'coolPoints';

  const tracks = [
    { number: '01', title: 'Whats Hannin', artist: 'Hyph Life', meta: 'HYPHSWORLD 5 — Floor 2', sources: ['01_WHATS_HANNIN.MP3', '01_WHATS_HANNIN.mp3', 'whats-hannin.mp3', 'Whats Hannin.mp3', 'WHATS HANNIN.mp3'] },
    { number: '02', title: 'Bout You', artist: 'Hyph Life', meta: 'HYPHSWORLD 5 — Floor 2', sources: ['02_BOUT_YOU.MP3', '02_BOUT_YOU.mp3', 'bout-you.mp3', 'Bout You.mp3', 'BOUT YOU.mp3'] },
    { number: '03', title: 'Mula', artist: 'Hyph Life', meta: 'HYPHSWORLD 5 — Floor 2', sources: ['03_MULA.MP3', '03_MULA.mp3', 'mula.mp3', 'Mula.mp3', 'MULA.mp3'] },
    { number: '04', title: 'No Trace Snip', artist: 'Hyph Life', meta: 'HYPHSWORLD 5 — Floor 2', sources: ['04_NO_TRACE_SNIP.MP3', '04_NO_TRACE_SNIP.mp3', 'no-trace-snip.mp3', 'No Trace Snip.mp3', 'NO TRACE SNIP.mp3'] },
    { number: '05', title: 'Wikked Wayz', artist: 'Hyph Life', meta: 'HYPHSWORLD 5 — Floor 2', sources: ['05_WIKKED_WAYZ.MP3', '05_WIKKED_WAYZ.mp3', 'wikked-wayz.mp3', 'Wikked Wayz.mp3', 'WIKKED WAYZ.mp3'] },
    { number: '06', title: 'With Me', artist: 'Hyph Life', meta: 'HYPHSWORLD 5 — Floor 2', sources: ['06_WITH_ME.MP3', '06_WITH_ME.mp3', 'with-me.mp3', 'With Me.mp3', 'WITH ME.mp3', '01_WITH_ME.MP3'] }
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const audio = $('#h5Audio');
  const title = $('#h5Title');
  const meta = $('#h5Meta');
  const status = $('#h5Status');
  const trackList = $('#h5TrackList');
  const playButton = $('#h5Play');
  const pauseButton = $('#h5Pause');
  const nextButton = $('#h5Next');
  const progress = $('#h5Progress');
  const currentTime = $('#h5CurrentTime');
  const durationTime = $('#h5Duration');
  const sourceText = $('#h5Source');
  const cover = $('#h5Cover');

  let currentIndex = 0;
  let sourceIndex = 0;
  let playRequested = false;

  function safeGet(key) { try { return localStorage.getItem(key); } catch (error) { return null; } }
  function safeSet(key, value) { try { localStorage.setItem(key, String(value)); } catch (error) {} }
  function numberFrom(value) { const parsed = Number.parseInt(value, 10); return Number.isFinite(parsed) && parsed > 0 ? parsed : 0; }
  function getPoints() { return Math.max(numberFrom(safeGet(POINTS_KEY)), numberFrom(safeGet(LEGACY_POINTS_KEY))); }
  function setPoints(value) { const next = Math.max(0, Number.parseInt(value, 10) || 0); safeSet(POINTS_KEY, next); safeSet(LEGACY_POINTS_KEY, next); $$('.js-cool-points').forEach((el) => { el.textContent = String(next); }); return next; }
  function addPoints(amount) { return setPoints(getPoints() + amount); }
  function setStatus(message) { if (status) status.textContent = message; }
  function formatTime(seconds) { if (!Number.isFinite(seconds) || seconds < 0) return '0:00'; const minutes = Math.floor(seconds / 60); const secs = Math.floor(seconds % 60).toString().padStart(2, '0'); return `${minutes}:${secs}`; }

  function setupCoverFallback() {
    if (!cover) return;
    cover.addEventListener('error', () => {
      const zone = $('#h5CoverZone');
      if (zone) zone.innerHTML = '<strong>HYPHSWORLD</strong><b>5</b>';
      cover.remove();
    }, { once: true });
  }

  function renderTracks() {
    if (!trackList) return;
    trackList.innerHTML = tracks.map((track, index) => `
      <button class="h5-track-row" type="button" data-h5-index="${index}">
        <b>${track.number}</b>
        <span><strong>${track.title}</strong><em>${track.artist} · ${track.meta}</em></span>
        <small>Play</small>
      </button>
    `).join('');

    $$('[data-h5-index]').forEach((button) => {
      button.addEventListener('click', () => {
        loadTrack(Number(button.dataset.h5Index || 0), 0);
        playCurrent();
      });
    });
  }

  function markActive() {
    $$('[data-h5-index]').forEach((button) => {
      button.classList.toggle('is-active', Number(button.dataset.h5Index) === currentIndex);
    });
  }

  function updateCopy(track, source) {
    if (title) title.textContent = track.title;
    if (meta) meta.textContent = `${track.number} · ${track.artist} · ${track.meta}`;
    if (sourceText) sourceText.textContent = source ? `Source: ${source}` : 'Source waiting';
  }

  function loadTrack(index = currentIndex, attempt = 0) {
    const track = tracks[index] || tracks[0];
    currentIndex = index;
    sourceIndex = attempt;
    const source = (track.sources || [])[attempt];
    markActive();
    updateCopy(track, source);
    if (!source || !audio) { setStatus(`MP3 not found for ${track.title}. Confirm the uploaded filename.`); return false; }
    audio.src = source;
    audio.load();
    setStatus(`Loaded ${track.title}. Tap play if the browser asks for one more tap.`);
    return true;
  }

  async function playCurrent() {
    if (!audio) return;
    playRequested = true;
    if (!audio.src) loadTrack(currentIndex, sourceIndex);
    try {
      await audio.play();
      addPoints(3);
      setStatus(`${tracks[currentIndex].title} playing. HYPHSWORLD 5 Floor 2 is live. +3 Cool Points.`);
    } catch (error) {
      setStatus('Browser blocked play or the MP3 is missing. Tap again or confirm the filename in GitHub.');
    }
  }

  function pauseCurrent() { if (!audio) return; audio.pause(); setStatus('HYPHSWORLD 5 player paused.'); }
  function playNext() { const next = (currentIndex + 1) % tracks.length; loadTrack(next, 0); playCurrent(); }

  function bindAudio() {
    if (!audio) return;
    audio.addEventListener('loadedmetadata', () => { if (durationTime) durationTime.textContent = formatTime(audio.duration); });
    audio.addEventListener('timeupdate', () => {
      if (currentTime) currentTime.textContent = formatTime(audio.currentTime);
      if (durationTime) durationTime.textContent = formatTime(audio.duration);
      if (progress && audio.duration) progress.value = String((audio.currentTime / audio.duration) * 100);
    });
    audio.addEventListener('ended', playNext);
    audio.addEventListener('error', () => {
      const track = tracks[currentIndex];
      const nextSource = sourceIndex + 1;
      if (track && nextSource < track.sources.length) {
        loadTrack(currentIndex, nextSource);
        if (playRequested) playCurrent();
        return;
      }
      setStatus(`MP3 not found for ${track ? track.title : 'this track'}. Upload it to the repo root or send the exact filename.`);
    });
    if (progress) progress.addEventListener('input', () => { if (!audio.duration) return; audio.currentTime = (Number(progress.value) / 100) * audio.duration; });
  }

  function bindControls() {
    if (playButton) playButton.addEventListener('click', playCurrent);
    if (pauseButton) pauseButton.addEventListener('click', pauseCurrent);
    if (nextButton) nextButton.addEventListener('click', playNext);
  }

  function init() {
    setPoints(getPoints());
    setupCoverFallback();
    renderTracks();
    loadTrack(0, 0);
    bindAudio();
    bindControls();
    window.HYPHSWORLD_5_PLAYER_LIVE = true;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
