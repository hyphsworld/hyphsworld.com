/* Chase the Bag artist soundtrack. Loaded before the game engine.
   One media element; no generated-music fallback or gameplay/economy access. */
(function () {
  'use strict';
  var tracks = [
    { title: 'CERTIFIED ft YOUNG TEZ', file: '01-certified-ft-young-tez.mp3' },
    { title: 'DO YOU LOVE ME ft YOUNG TEZ', file: '02-do-you-love-me-ft-young-tez.mp3' },
    { title: 'LATE NIGHTS', file: '03-late-nights.mp3' },
    { title: 'ISSA CAP ft YOUNG TEZ', file: '04-issa-cap-ft-young-tez.mp3' },
    { title: 'ITS GOOD ft SIXX FIGGAZ', file: '05-its-good-ft-sixx-figgaz.mp3' }
  ];
  var audio = new window.Audio();
  audio.preload = 'none';
  audio.volume = 0.42;
  audio.setAttribute('playsinline', '');
  var index = 0, wanted = false, paused = false, pending = false;
  var error = '', failedTracks = 0, generation = 0;

  function canPlay() { return wanted && !paused && !document.hidden; }
  function loadTrack() {
    audio.src = '/games/cash-run/assets/soundtrack/' + tracks[index].file;
  }
  function attempt() {
    if (!canPlay() || pending || !audio.paused || failedTracks >= tracks.length) return;
    if (!audio.getAttribute('src')) loadTrack();
    pending = true;
    var currentGeneration = generation;
    var result;
    try { result = audio.play(); }
    catch (failure) { result = Promise.reject(failure); }
    Promise.resolve(result).then(function () {
      if (currentGeneration !== generation) return;
      error = '';
      failedTracks = 0;
      if (!canPlay()) audio.pause();
    }).catch(function (failure) {
      if (currentGeneration !== generation) return;
      error = String(failure && failure.message || failure);
    }).finally(function () { if (currentGeneration === generation) pending = false; });
  }
  function advance() {
    audio.pause();
    generation += 1;
    pending = false;
    index = (index + 1) % tracks.length;
    loadTrack();
    attempt();
  }
  audio.addEventListener('ended', advance);
  audio.addEventListener('error', function () {
    error = 'Track unavailable: ' + tracks[index].title;
    failedTracks += 1;
    if (wanted && failedTracks < tracks.length) advance();
  });
  window.HWCashRunSoundtrack = {
    start: function () { wanted = true; attempt(); },
    stop: function () { wanted = false; audio.pause(); },
    setPaused: function (value) {
      paused = Boolean(value);
      if (paused) audio.pause(); else attempt();
    },
    getStatus: function () {
      return { title: tracks[index].title, index: index, count: tracks.length,
        wanted: wanted, paused: paused, playing: !audio.paused, error: error };
    },
    tracks: tracks.map(function (track) { return { title: track.title, file: track.file }; })
  };
  // Retry autoplay denial only after a player gesture; never start menu music.
  window.addEventListener('pointerdown', attempt, { capture: true, passive: true });
  window.addEventListener('touchend', attempt, { capture: true, passive: true });
  window.addEventListener('keydown', attempt, true);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) audio.pause(); else attempt();
  });
  window.addEventListener('pagehide', function () { audio.pause(); });
  window.addEventListener('pageshow', attempt);
})();
