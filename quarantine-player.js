(() => {
  'use strict';

  const KEY = 'HW_LEVEL1_TRANSPORT_V6';
  const TRACKS = window.HW_QUARANTINE_TRACKS || [];
  const COVERS = window.HW_QUARANTINE_COVER_SOURCES || ['quarantine-mixtape.jpg','the-quarantine-mixtape.jpg','the-quarantine.jpg','album-art.jpg'];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const audio = $('#quarantine-audio');
  const cover = $('#quarantine-cover');
  const fallback = $('#coverFallback');
  const title = $('#quarantine-title');
  const meta = $('#quarantine-meta');
  const chip = $('#quarantine-chip');
  const status = $('#quarantine-status');
  const list = $('#quarantine-track-list');
  const order = $('#official-order-list');
  const progress = $('#quarantine-progress');
  const currentTime = $('#quarantine-current');
  const duration = $('#quarantine-duration');
  const play = $('#quarantine-play');
  const pause = $('#quarantine-pause');
  const next = $('#quarantine-next');
  const prev = $('#quarantine-prev');
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
      const token = JSON.parse(sessionStorage.getItem(KEY) || '{}');
      const age = Date.now() - Number(token.grantedAt || 0);
      return token.level === 'level-one' && token.route === 'quarantine-mixtape' && age >= 0 && age <= 30 * 60 * 1000;
    } catch {
      return false;
    }
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
        <button class="track-row" type="button" data-q-index="${index}" aria-label="Play ${track.title}">
          <b>${track.number}</b>
          <span><strong>${track.title}</strong><em>${track.artist}${track.meta ? ` — ${track.meta}` : ''}</em></span>
          <i>Play</i>
        </button>
      `).join('');

      $$('[data-q-index]').forEach((button) => {
        button.addEventListener('click', () => playTrack(Number(button.dataset.qIndex || 0)));
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

    $$('[data-q-index]').forEach((button) => {
      button.classList.toggle('is-active', Number(button.dataset.qIndex) === index);
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
      setStatus(`${TRACKS[index].title} playing. Level 1 active.`);
    } catch {
      setStatus('Safari blocked autoplay. Tap Play again. Duck blamed the phone.');
    }
  }

  function pauseTrack() {
    if (!audio) return;
    audio.pause();
    setStatus('Paused. Level 1 still open.');
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
        setStatus('MP3 not found after root/audio/music fallback paths. Rename/upload the file or update quarantine-tracks.js.');
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
