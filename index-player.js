// HYPHSWORLD OFFICIAL FULL PLAYER
// Full replacement for index-player.js

(() => {
  'use strict';

  const TRACKS = [
  {
    "number": "01",
    "title": "Youngan Remix",
    "artist": "Hyph Life",
    "meta": "Full Player",
    "code": "YR",
    "sources": [
      "younga-remix.mp3",
      "assets/audio/younga-remix.mp3",
      "audio/younga-remix.mp3",
      "music/younga-remix.mp3",
      "you ngan-remix.mp3",
      "assets/audio/you ngan-remix.mp3",
      "audio/you ngan-remix.mp3",
      "music/you ngan-remix.mp3",
      "younga_remix.mp3",
      "assets/audio/younga_remix.mp3",
      "audio/younga_remix.mp3",
      "music/younga_remix.mp3",
      "Youngan Remix.mp3",
      "assets/audio/Youngan Remix.mp3",
      "audio/Youngan Remix.mp3",
      "music/Youngan Remix.mp3",
      "youngan-remix.mp3",
      "assets/audio/youngan-remix.mp3",
      "audio/youngan-remix.mp3",
      "music/youngan-remix.mp3",
      "youngn-remix.mp3",
      "assets/audio/youngn-remix.mp3",
      "audio/youngn-remix.mp3",
      "music/youngn-remix.mp3",
      "youngin-remix.mp3",
      "assets/audio/youngin-remix.mp3",
      "audio/youngin-remix.mp3",
      "music/youngin-remix.mp3",
      "youngin_remix.mp3",
      "assets/audio/youngin_remix.mp3",
      "audio/youngin_remix.mp3",
      "music/youngin_remix.mp3"
    ]
  },
  {
    "number": "02",
    "title": "Time",
    "artist": "SIXX FIGGAZ x HYPH LIFE",
    "meta": "Full Player",
    "code": "TIME",
    "sources": [
      "time.mp3",
      "assets/audio/time.mp3",
      "audio/time.mp3",
      "music/time.mp3",
      "Time.mp3",
      "assets/audio/Time.mp3",
      "audio/Time.mp3",
      "music/Time.mp3",
      "TIME.mp3",
      "assets/audio/TIME.mp3",
      "audio/TIME.mp3",
      "music/TIME.mp3"
    ]
  },
  {
    "number": "03",
    "title": "On God",
    "artist": "BooGotGluu x No Flash",
    "meta": "Full Player",
    "code": "OG",
    "sources": [
      "on-god.mp3",
      "assets/audio/on-god.mp3",
      "audio/on-god.mp3",
      "music/on-god.mp3",
      "On God.mp3",
      "assets/audio/On God.mp3",
      "audio/On God.mp3",
      "music/On God.mp3",
      "ON GOD.mp3",
      "assets/audio/ON GOD.mp3",
      "audio/ON GOD.mp3",
      "music/ON GOD.mp3",
      "on_god.mp3",
      "assets/audio/on_god.mp3",
      "audio/on_god.mp3",
      "music/on_god.mp3"
    ]
  },
  {
    "number": "04",
    "title": "Bout That",
    "artist": "Hyph Life x Young Tez",
    "meta": "Full Player",
    "code": "BT",
    "sources": [
      "bout-that.mp3",
      "assets/audio/bout-that.mp3",
      "audio/bout-that.mp3",
      "music/bout-that.mp3",
      "Bout That.mp3",
      "assets/audio/Bout That.mp3",
      "audio/Bout That.mp3",
      "music/Bout That.mp3",
      "BOUT THAT.mp3",
      "assets/audio/BOUT THAT.mp3",
      "audio/BOUT THAT.mp3",
      "music/BOUT THAT.mp3",
      "bout_that.mp3",
      "assets/audio/bout_that.mp3",
      "audio/bout_that.mp3",
      "music/bout_that.mp3"
    ]
  },
  {
    "number": "05",
    "title": "KIKI",
    "artist": "Cuz Zaid x JCrown x Ruzzo",
    "meta": "Full Player",
    "code": "KIKI",
    "sources": [
      "kiki.mp3",
      "assets/audio/kiki.mp3",
      "audio/kiki.mp3",
      "music/kiki.mp3",
      "KIKI.mp3",
      "assets/audio/KIKI.mp3",
      "audio/KIKI.mp3",
      "music/KIKI.mp3",
      "Kiki.mp3",
      "assets/audio/Kiki.mp3",
      "audio/Kiki.mp3",
      "music/Kiki.mp3"
    ]
  },
  {
    "number": "06",
    "title": "25/8",
    "artist": "Young Tez",
    "meta": "Prod. Marty McPhresh",
    "code": "25/8",
    "sources": [
      "young-tez-25-8.mp3",
      "assets/audio/young-tez-25-8.mp3",
      "audio/young-tez-25-8.mp3",
      "music/young-tez-25-8.mp3",
      "25-8.mp3",
      "assets/audio/25-8.mp3",
      "audio/25-8.mp3",
      "music/25-8.mp3",
      "25_8.mp3",
      "assets/audio/25_8.mp3",
      "audio/25_8.mp3",
      "music/25_8.mp3",
      "258.mp3",
      "assets/audio/258.mp3",
      "audio/258.mp3",
      "music/258.mp3",
      "25 8.mp3",
      "assets/audio/25 8.mp3",
      "audio/25 8.mp3",
      "music/25 8.mp3"
    ]
  }
];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const audio = $('#mainAudio');
  const playBtn = $('#playTrack');
  const prevBtn = $('#prevTrack');
  const nextBtn = $('#nextTrack');
  const titleEl = $('#playerTitle');
  const artistEl = $('#playerArtist');
  const statusEl = $('#playerStatus');
  const fileEl = $('#playerFile');
  const artText = $('#playerArtText');
  const trackList = $('#trackList');
  const progress = $('#playerProgress');
  const currentTime = $('#playerCurrent');
  const duration = $('#playerDuration');

  let active = 0;
  let sourceIndex = 0;
  let playRequested = false;

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  }

  function renderList() {
    if (!trackList) return;

    trackList.innerHTML = TRACKS.map((track, index) => `
      <button class="quick-card button-card js-track" type="button" data-index="${index}">
        <span>${track.number}</span>
        <strong>${track.title}</strong>
        <small>${track.artist}${track.meta ? ' • ' + track.meta : ''}</small>
      </button>
    `).join('');

    $$('[data-index]').forEach((button) => {
      button.addEventListener('click', () => playTrack(Number(button.dataset.index || 0)));
    });
  }

  function setInfo(index) {
    const track = TRACKS[index];
    if (!track) return;

    active = index;
    sourceIndex = 0;

    if (titleEl) titleEl.textContent = track.title;
    if (artistEl) artistEl.textContent = `${track.artist}${track.meta ? ' • ' + track.meta : ''}`;
    if (fileEl) fileEl.textContent = (track.sources || [])[0] || '';
    if (artText) artText.textContent = track.code || track.number;

    $$('[data-index]').forEach((button) => {
      button.classList.toggle('is-active', Number(button.dataset.index) === index);
    });
  }

  function loadSource(index, attempt = 0) {
    const track = TRACKS[index];
    if (!track || !audio) return;

    const source = (track.sources || [])[attempt];

    if (!source) {
      setStatus(`Duck Sauce: I cannot find the MP3 for ${track.title}. Check the filename/folder.`);
      return;
    }

    sourceIndex = attempt;
    audio.src = source;
    audio.load();

    if (fileEl) fileEl.textContent = source;
    setStatus(`Loaded ${track.title}. Tap Play if Safari blocks it.`);
  }

  async function playTrack(index = active) {
    const track = TRACKS[index];
    if (!track || !audio) return;

    playRequested = true;
    setInfo(index);
    loadSource(index, 0);

    try {
      await audio.play();
      setStatus(`Playing ${track.title}`);
      if (playBtn) playBtn.textContent = '❚❚';
    } catch {
      setStatus('Safari blocked autoplay or file was not found. Tap Play again.');
      if (playBtn) playBtn.textContent = '▶';
    }
  }

  async function togglePlay() {
    if (!audio) return;

    if (!audio.src) {
      playTrack(active);
      return;
    }

    try {
      if (audio.paused) {
        await audio.play();
        setStatus(`Playing ${TRACKS[active].title}`);
        if (playBtn) playBtn.textContent = '❚❚';
      } else {
        audio.pause();
        setStatus('Paused');
        if (playBtn) playBtn.textContent = '▶';
      }
    } catch {
      setStatus('Audio file not found after fallback. Check assets/audio, audio, music, or root.');
    }
  }

  function nextTrack() {
    playTrack(active + 1 < TRACKS.length ? active + 1 : 0);
  }

  function prevTrack() {
    playTrack(active - 1 >= 0 ? active - 1 : TRACKS.length - 1);
  }

  function initAudio() {
    if (!audio) return;

    audio.addEventListener('error', () => {
      const track = TRACKS[active];
      const next = sourceIndex + 1;

      if (track && next < (track.sources || []).length) {
        loadSource(active, next);
        if (playRequested) {
          audio.play().catch(() => setStatus('Tap Play again. Browser blocked fallback source.'));
        }
      } else {
        setStatus('MP3 not found after all fallback paths. Rename/upload the file or update index-player.js.');
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

  document.addEventListener('DOMContentLoaded', () => {
    renderList();
    setInfo(0);
    loadSource(0, 0);
    initAudio();

    if (playBtn) playBtn.addEventListener('click', togglePlay);
    if (nextBtn) nextBtn.addEventListener('click', nextTrack);
    if (prevBtn) prevBtn.addEventListener('click', prevTrack);
  });
})();
