(() => {
  'use strict';

  const LEVEL_ONE_DESTINATION = 'quarantine-mixtape.html';
  const LEVEL_ONE_TRANSPORT_READY_KEY = 'HW_LEVEL1_TRANSPORT_READY';
  const LEVEL_ONE_TRANSPORT_V6_KEY = 'HW_LEVEL1_TRANSPORT_V6';
  const LOBBY_UNLOCK_KEY = 'HW_LOBBY_BOUNCE_UNLOCKED';

  const lobbyTracks = {
    withMe: { title: 'WITH ME', meta: 'Hyph Life — prod by KMT', sources: ['01_WITH_ME.MP3', '01_WITH_ME.mp3', 'with-me.mp3', 'WITH ME.mp3', 'With Me.mp3'] },
    covidDose: { title: 'COVID DOSE', meta: 'BooGotGluu — Lobby Music', sources: ['02_COVID_DOSE.MP3', '02_COVID_DOSE.mp3', 'covid-dose.mp3', 'COVID DOSE.mp3', 'Covid Dose.mp3'] },
    newkie: { title: 'NEWKIE', meta: 'Hyph Life — prod by KMT', sources: ['03_NEWKIE.MP3', '03_NEWKIE.mp3', 'newkie.mp3', 'NEWKIE.mp3', 'Newkie.mp3'] },
    etg: { title: 'ETG', meta: 'BooGotGluu & Hyph Life', sources: ['04_ETG.MP3', '04_ETG.mp3', 'etg.mp3', 'ETG.mp3'] },
    on: { title: 'ON', meta: 'Hyph Life & KMT', sources: ['05_ON.MP3', '05_ON.mp3', 'on.mp3', 'ON.mp3', 'On.mp3'] },
    bounceOut: { title: 'BOUNCE OUT', meta: 'Hidden Track 06 — Level 1 unlock route', sources: ['06_BOUNCE_OUT.MP3', '06_BOUNCE_OUT.mp3', 'bounce-out.mp3', 'BOUNCE OUT.mp3', 'Bounce Out.mp3'] }
  };

  const visibleTrackIds = ['withMe', 'covidDose', 'newkie', 'etg', 'on'];
  const hiddenTrackId = 'bounceOut';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  let trackButtons = [];
  let activeTrackId = 'withMe';
  let activeSourceIndex = 0;
  let playRequested = false;
  let hiddenTrackTriggered = false;

  function safeSet(key, value) { try { localStorage.setItem(key, String(value)); } catch (error) {} }
  function safeSessionSet(key, value) { try { sessionStorage.setItem(key, String(value)); } catch (error) {} }
  function setPlayerStatus(message) { const el = $('#gatePlayerStatus'); if (el) el.textContent = message; }
  function setGateStatus(status, pad, message) {
    const gateStatus = $('#gateStatus');
    const padStatus = $('#padStatus');
    const consoleMessage = $('#consoleMessage');
    if (gateStatus) gateStatus.textContent = status;
    if (padStatus) padStatus.textContent = pad;
    if (consoleMessage) consoleMessage.textContent = message;
  }

  function polishLobbyPanel() {
    const audio = $('#gateAudio');
    if (!audio) return;
    const panel = audio.closest('.gate-game-panel');
    if (!panel) return;
    const heading = panel.querySelector('h3');
    const copy = panel.querySelector('p:not(.tagline):not(.gate-player-meta):not(.gate-game-status)');
    if (heading) heading.textContent = 'Lobby Music';
    if (copy) copy.textContent = 'Play tracks in order. Hidden Track 06 can wake Level 1 after ON finishes.';
  }

  function renderLobbyButtons() {
    const actions = $('#gatePlayBtn')?.closest('.gate-mini-actions');
    if (!actions) return;
    const trackButtonMarkup = visibleTrackIds.map((trackId, index) => `<button class="gate-track-btn" type="button" data-gate-track="${trackId}">${String(index + 1).padStart(2, '0')} ${lobbyTracks[trackId].title}</button>`).join('');
    actions.innerHTML = `<button class="gate-game-btn" id="gatePlayBtn" type="button">Play</button><button class="gate-track-btn" id="gatePauseBtn" type="button">Pause</button>${trackButtonMarkup}<a class="gate-game-btn" id="lobbyLevelOneUnlock" href="${LEVEL_ONE_DESTINATION}" hidden>Enter Level 1</a>`;
    trackButtons = $$('.gate-track-btn[data-gate-track]', actions);
  }

  function currentTrack() { return lobbyTracks[activeTrackId] || lobbyTracks.withMe; }
  function highlightActiveButton() { trackButtons.forEach((button) => button.classList.toggle('is-active', button.dataset.gateTrack === activeTrackId)); }
  function loadTrack(trackId, sourceAttempt = 0) {
    const audio = $('#gateAudio');
    const title = $('#gatePlayerTitle');
    const meta = $('#gatePlayerMeta');
    const track = lobbyTracks[trackId] || lobbyTracks.withMe;
    activeTrackId = trackId;
    activeSourceIndex = sourceAttempt;
    if (title) title.textContent = track.title;
    if (meta) meta.textContent = track.meta;
    highlightActiveButton();
    const source = (track.sources || [])[sourceAttempt];
    if (!source) { setPlayerStatus(`MP3 not found for ${track.title}.`); return false; }
    if (audio) { audio.src = source; audio.load(); }
    setPlayerStatus(`Loaded ${track.title}. Tap Play.`);
    return true;
  }

  async function playActiveTrack() {
    const audio = $('#gateAudio');
    if (!audio) return;
    playRequested = true;
    if (!audio.src) loadTrack(activeTrackId, activeSourceIndex);
    try { await audio.play(); setPlayerStatus(`${currentTrack().title} playing.`); }
    catch (error) { setPlayerStatus('Browser blocked autoplay. Tap Play again.'); }
  }

  function pauseTrack() {
    const audio = $('#gateAudio');
    if (audio) audio.pause();
    setPlayerStatus('Lobby Music paused.');
  }

  function selectTrack(trackId) {
    hiddenTrackTriggered = false;
    loadTrack(trackId, 0);
  }

  function grantLevelOneFromHiddenTrack() {
    const grantedAt = Date.now();
    const nonce = Math.random().toString(36).slice(2);
    safeSessionSet('hyphsworld_vault_access', 'granted');
    safeSessionSet('hyphsworld_vault_access_time', String(grantedAt));
    safeSessionSet(LEVEL_ONE_TRANSPORT_READY_KEY, JSON.stringify({ level: 'level-one', route: LEVEL_ONE_DESTINATION, href: LEVEL_ONE_DESTINATION, grantedAt, nonce, source: 'lobby-hidden-track-bounce-out' }));
    safeSessionSet(LEVEL_ONE_TRANSPORT_V6_KEY, JSON.stringify({ level: 'level-one', route: 'quarantine-mixtape', href: LEVEL_ONE_DESTINATION, grantedAt, nonce, source: 'lobby-hidden-track-bounce-out' }));
    safeSet(LOBBY_UNLOCK_KEY, 'true');
    safeSet('vault_level_1_unlocked', 'true');
    setGateStatus('LEVEL 1 READY', 'UNLOCKED', 'Hidden Track 06 cleared the lobby route. Level 1 transport is ready.');
    setPlayerStatus('BOUNCE OUT finished. LEVEL 1 UNLOCKED.');
    const unlockLink = $('#lobbyLevelOneUnlock');
    if (unlockLink) unlockLink.hidden = false;
  }

  async function playHiddenTrack() {
    hiddenTrackTriggered = true;
    loadTrack(hiddenTrackId, 0);
    await playActiveTrack();
  }

  function handleTrackEnded() {
    if (activeTrackId === 'on' && !hiddenTrackTriggered) {
      setPlayerStatus('Track 05 complete. Loading hidden BOUNCE OUT.');
      window.setTimeout(() => playHiddenTrack(), 900);
      return;
    }
    if (activeTrackId === hiddenTrackId) { grantLevelOneFromHiddenTrack(); return; }
    const currentVisibleIndex = visibleTrackIds.indexOf(activeTrackId);
    const nextTrackId = visibleTrackIds[currentVisibleIndex + 1];
    if (nextTrackId) { selectTrack(nextTrackId); if (playRequested) playActiveTrack(); }
    else setPlayerStatus('Lobby Music run complete. Track 05 can trigger the hidden route when it plays through.');
  }

  function initAudio() {
    const audio = $('#gateAudio');
    const progress = $('#gatePlayerProgress');
    if (!audio) return;
    audio.addEventListener('timeupdate', () => { if (audio.duration && progress) progress.value = String((audio.currentTime / audio.duration) * 100); });
    audio.addEventListener('ended', handleTrackEnded);
    audio.addEventListener('error', () => {
      const track = currentTrack();
      const nextSource = activeSourceIndex + 1;
      if (nextSource < (track.sources || []).length) { loadTrack(activeTrackId, nextSource); if (playRequested) playActiveTrack(); return; }
      setPlayerStatus(`MP3 not found for ${track.title}.`);
    });
    if (progress) progress.addEventListener('input', () => { if (audio.duration) audio.currentTime = (Number(progress.value) / 100) * audio.duration; });
  }

  function bindLobbyPlayer() {
    const playBtn = $('#gatePlayBtn');
    const pauseBtn = $('#gatePauseBtn');
    if (playBtn) playBtn.addEventListener('click', playActiveTrack);
    if (pauseBtn) pauseBtn.addEventListener('click', pauseTrack);
    trackButtons.forEach((button) => button.addEventListener('click', () => selectTrack(button.dataset.gateTrack)));
  }

  document.addEventListener('DOMContentLoaded', () => {
    polishLobbyPanel();
    renderLobbyButtons();
    loadTrack(activeTrackId, 0);
    initAudio();
    bindLobbyPlayer();
    window.HYPHSWORLD_GATE_MUSIC_ONLY = true;
  });
})();
