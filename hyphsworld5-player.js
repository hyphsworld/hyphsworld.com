// HYPHSWORLD LEVEL 2 PLAYER — OFFICIAL HYPHSWORLD 5 TRACKLIST

(() => {
  'use strict';

  const ACCESS_KEYS = ['HW_LEVEL1_TRANSPORT_V6', 'hyphsworld_vault_access', 'HW_QUARANTINE_READY'];
  const TRACKS = window.HW_HYPHSWORLD5_TRACKS || [];
  const COVERS = window.HW_HYPHSWORLD5_COVER_SOURCES || ['hyphsworld-5.jpg','hyphsworld5.jpg','HYPHSWORLD5.jpg','hyphsworld-5-cover.jpg'];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const audio = $('#hyphsworld5-audio');
  const cover = $('#hyphsworld5-cover');
  const fallback = $('#coverFallback');
  const title = $('#hyphsworld5-title');
  const meta = $('#hyphsworld5-meta');
  const chip = $('#hyphsworld5-chip');
  const status = $('#hyphsworld5-status');
  const list = $('#hyphsworld5-track-list');
  const order = $('#official-order-list');
  const progress = $('#hyphsworld5-progress');
  const currentTime = $('#hyphsworld5-current');
  const duration = $('#hyphsworld5-duration');
  const play = $('#hyphsworld5-play');
  const pause = $('#hyphsworld5-pause');
  const next = $('#hyphsworld5-next');
  const prev = $('#hyphsworld5-prev');
  const main = $('.level-main');
  const denied = $('#access-denied');
  const year = $('#year');

  let currentIndex = 0;
  let sourceIndex = 0;
  let coverIndex = 0;
  let playRequested = false;

  if (year) year.textContent = String(new Date().getFullYear());

  function hasTransportAccess() {
    try {
      const v6 = JSON.parse(sessionStorage.getItem('HW_LEVEL1_TRANSPORT_V6') || '{}');
      const age = Date.now() - Number(v6.grantedAt || 0);
      if (v6.level === 'level-one' && age >= 0 && age <= 30 * 60 * 1000) return true;

      const legacy = JSON.parse(sessionStorage.getItem('hyphsworld_vault_access') || '{}');
      if (legacy.master || legacy.level1) return true;

      if (sessionStorage.getItem('HW_QUARANTINE_READY') === 'true') return true;

      const params = new URLSearchParams(window.location.search);
      if (params.get('transport') === 'granted') return true;
    } catch {
      return new URLSearchParams(window.location.search).get('transport') === 'granted';
    }

    return false;
  }

  function showDenied() {
    if (main) main.setAttribute('aria-hidden', 'true');
    if (denied) {
      denied.classList.add('is-active');
      denied.setAttribute('aria-hidden', 'false');
    }
  }

  function setStatus(text) {
    if (status) status.textContent = text;
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  }

  function render() {
    if (order) {
      order.innerHTML = TRACKS.map((track) => `
        <li><b>${track.number}</b><span><strong>${track.title}</strong><em>${track.artist}${track.meta ? ` — ${track.meta}` : ''}</em></span></li>
      `).join('');
    }

    if (list) {
      list.innerHTML = TRACKS.map((track, index) => `
        <button class="track-row" type="button" data-hw5-index="${index}" aria-label="Play ${track.title}">
          <b>${track.number}</b>
          <span><strong>${track.title}</strong><em>${track.artist}${track.meta ? ` — ${track.meta}` : ''}</em></span>
          <i>Play</i>
        </button>
      `).join('');

      $$('[data-hw5-index]').forEach((button) => {
        button.addEventListener('click', () => playTrack(Number(button.dataset.hw5Index || 0)));
      });
    }
  }

  function updateCover(track) {
    if (!cover) return;
    const sources = (track && track.art) || COVERS;
    coverIndex = 0;

    cover.onerror = () => {
      coverIndex += 1;
      if (coverIndex < sources.length) {
        cover.src = sources[coverIndex];
      } else {
        cover.hidden = true;
        if (fallback) fallback.hidden = false;
      }
    };

    if (fallback) fallback.hidden = true;
    cover.hidden = false;
    cover.src = sources[0];
  }

  function updateUI(index) {
    const track = TRACKS[index];
    if (!track) return;

    currentIndex = index;
    sourceIndex = 0;

    if (chip) chip.textContent = `TRACK ${track.number}`;
    if (title) title.textContent = track.title;
    if (meta) meta.textContent = `${track.artist}${track.meta ? ` — ${track.meta}` : ''}`;

    $$('[data-hw5-index]').forEach((button) => {
      button.classList.toggle('is-active', Number(button.dataset.hw5Index) === index);
    });

    updateCover(track);
  }

  function loadSource(index, attempt = 0) {
    const track = TRACKS[index];
    if (!audio || !track) return;

    const source = (track.sources || [])[attempt];
    if (!source) {
      setStatus(`Duck Sauce: I cannot find the MP3 for ${track.title}. Check the filename or folder.`);
      return;
    }

    sourceIndex = attempt;
    audio.src = source;
    audio.load();
    setStatus(`Loaded ${track.title}. Tap Play if Safari blocks it.`);
  }

  async function playTrack(index = currentIndex) {
    if (!TRACKS[index]) return;

    playRequested = true;
    updateUI(index);
    loadSource(index, 0);

    try {
      await audio.play();
      setStatus(`${TRACKS[index].title} playing. Level 2 active.`);
    } catch {
      setStatus('Safari blocked autoplay. Tap Play again. Duck blamed the phone.');
    }
  }

  function pauseTrack() {
    if (!audio) return;
    audio.pause();
    setStatus('Paused. Level 2 still open.');
  }

  function nextTrack() {
    playTrack(currentIndex + 1 < TRACKS.length ? currentIndex + 1 : 0);
  }

  function prevTrack() {
    playTrack(currentIndex - 1 >= 0 ? currentIndex - 1 : TRACKS.length - 1);
  }

  function initAudio() {
    if (!audio) return;

    audio.addEventListener('error', () => {
      const track = TRACKS[currentIndex];
      const nextSource = sourceIndex + 1;

      if (track && nextSource < (track.sources || []).length) {
        loadSource(currentIndex, nextSource);
        if (playRequested) {
          audio.play().catch(() => setStatus('Tap Play again. Browser blocked the fallback source.'));
        }
      } else {
        setStatus('MP3 not found after root/assets/audio/audio/music fallback paths. Rename/upload the file or update hyphsworld5-tracks.js.');
      }
    });

    audio.addEventListener('timeupdate', () => {
      if (!audio.duration || !progress) return;
      progress.value = String((audio.currentTime / audio.duration) * 100);
      if (currentTime) currentTime.textContent = formatTime(audio.currentTime);
      if (duration) duration.textContent = formatTime(audio.duration);
    });

    audio.addEventListener('loadedmetadata', () => {
      if (duration) duration.textContent = formatTime(audio.duration);
    });

    audio.addEventListener('ended', nextTrack);

    if (progress) {
      progress.addEventListener('input', () => {
        if (audio.duration) audio.currentTime = (Number(progress.value) / 100) * audio.duration;
      });
    }
  }

  function bindControls() {
    if (play) play.addEventListener('click', () => playTrack(currentIndex));
    if (pause) pause.addEventListener('click', pauseTrack);
    if (next) next.addEventListener('click', nextTrack);
    if (prev) prev.addEventListener('click', prevTrack);
  }

  function init() {
    if (!hasTransportAccess()) {
      showDenied();
      return;
    }

    if (main) main.removeAttribute('aria-hidden');
    render();

    if (TRACKS.length) {
      updateUI(0);
      loadSource(0, 0);
    }

    initAudio();
    bindControls();
  }

  init();
})();
