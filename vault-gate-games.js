(() => {
  'use strict';

  const POINTS_KEY = 'hyphsworld.coolPoints.total';
  const LEGACY_POINTS_KEY = 'coolPoints';
  const LEVEL_ONE_DESTINATION = 'quarantine-mixtape.html';
  const LEVEL_ONE_TRANSPORT_READY_KEY = 'HW_LEVEL1_TRANSPORT_READY';
  const LEVEL_ONE_TRANSPORT_V6_KEY = 'HW_LEVEL1_TRANSPORT_V6';
  const LOBBY_UNLOCK_KEY = 'HW_LOBBY_BOUNCE_UNLOCKED';
  const SOUND_KEY = 'hyphsworld.arcade.sound.enabled';

  const lobbyTracks = {
    withMe: { title: 'WITH ME', meta: 'Hyph Life — prod by KMT', visible: true, sources: ['01_WITH_ME.MP3', '01_WITH_ME.mp3', 'with-me.mp3', 'WITH ME.mp3', 'With Me.mp3'] },
    covidDose: { title: 'COVID DOSE', meta: 'BooGotGluu — Lobby Music', visible: true, sources: ['02_COVID_DOSE.MP3', '02_COVID_DOSE.mp3', 'covid-dose.mp3', 'COVID DOSE.mp3', 'Covid Dose.mp3'] },
    newkie: { title: 'NEWKIE', meta: 'Hyph Life — prod by KMT', visible: true, sources: ['03_NEWKIE.MP3', '03_NEWKIE.mp3', 'newkie.mp3', 'NEWKIE.mp3', 'Newkie.mp3'] },
    etg: { title: 'ETG', meta: 'BooGotGluu & Hyph Life', visible: true, sources: ['04_ETG.MP3', '04_ETG.mp3', 'etg.mp3', 'ETG.mp3'] },
    on: { title: 'ON', meta: 'Hyph Life & KMT', visible: true, sources: ['05_ON.MP3', '05_ON.mp3', 'on.mp3', 'ON.mp3', 'On.mp3'] },
    bounceOut: { title: 'BOUNCE OUT', meta: 'Hidden Track 06 — Level 1 unlock route', visible: false, sources: ['06_BOUNCE_OUT.MP3', '06_BOUNCE_OUT.mp3', 'bounce-out.mp3', 'BOUNCE OUT.mp3', 'Bounce Out.mp3'] }
  };

  const visibleTrackIds = ['withMe', 'covidDose', 'newkie', 'etg', 'on'];
  const hiddenTrackId = 'bounceOut';
  const slotSymbols = ['🦆', '💎', '🎰', '🟢', '🔥', '🛡️', '🎵', '💰'];
  const cardValues = ['01', 'AMS', 'DUCK', 'BUCK', 'VAULT', 'KEY', 'GATE', 'LEVEL 1', 'BONUS'];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  let audioCtx = null;
  let soundEnabled = false;
  let trackButtons = [];
  let activeTrackId = 'withMe';
  let activeSourceIndex = 0;
  let playRequested = false;
  let hiddenTrackTriggered = false;
  let busySlot = false;
  let winningCardIndex = Math.floor(Math.random() * 3);

  function safeGet(key) { try { return localStorage.getItem(key); } catch (error) { return null; } }
  function safeSet(key, value) { try { localStorage.setItem(key, String(value)); } catch (error) {} }
  function safeSessionSet(key, value) { try { sessionStorage.setItem(key, String(value)); } catch (error) {} }
  function numberFrom(value) { const parsed = Number.parseInt(value, 10); return Number.isFinite(parsed) && parsed > 0 ? parsed : 0; }
  function getPoints() { return Math.max(numberFrom(safeGet(POINTS_KEY)), numberFrom(safeGet(LEGACY_POINTS_KEY))); }
  function setPoints(value) { const next = Math.max(0, Number.parseInt(value, 10) || 0); safeSet(POINTS_KEY, next); safeSet(LEGACY_POINTS_KEY, next); const el = $('#gateCredits'); if (el) el.textContent = String(next); return next; }
  function addPoints(amount) { return setPoints(getPoints() + amount); }
  function setSlotStatus(message) { const el = $('#gateSlotStatus'); if (el) el.textContent = message; }
  function setCardStatus(message) { const el = $('#gateCardStatus'); if (el) el.textContent = message; }
  function setPlayerStatus(message) { const el = $('#gatePlayerStatus'); if (el) el.textContent = message; }
  function randomSymbol() { return slotSymbols[Math.floor(Math.random() * slotSymbols.length)]; }

  function setGateStatus(status, pad, message) {
    const gateStatus = $('#gateStatus');
    const padStatus = $('#padStatus');
    const consoleMessage = $('#consoleMessage');
    if (gateStatus) gateStatus.textContent = status;
    if (padStatus) padStatus.textContent = pad;
    if (consoleMessage) consoleMessage.textContent = message;
  }

  function ensureSound() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    soundEnabled = true;
    safeSet(SOUND_KEY, 'true');
  }

  function tone(freq, duration = 0.08, type = 'sine', gain = 0.035) {
    if (!soundEnabled || !window.AudioContext && !window.webkitAudioContext) return;
    try {
      if (!audioCtx) ensureSound();
      const osc = audioCtx.createOscillator();
      const vol = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      vol.gain.value = gain;
      osc.connect(vol);
      vol.connect(audioCtx.destination);
      osc.start();
      vol.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.stop(audioCtx.currentTime + duration);
    } catch (error) {}
  }

  function sound(name) {
    if (name === 'tap') tone(520, 0.05, 'triangle', 0.02);
    if (name === 'spin') tone(220 + Math.random() * 360, 0.035, 'square', 0.018);
    if (name === 'win') { tone(520, 0.08, 'triangle', 0.035); setTimeout(() => tone(720, 0.09, 'triangle', 0.035), 90); setTimeout(() => tone(940, 0.10, 'triangle', 0.035), 185); }
    if (name === 'miss') tone(150, 0.12, 'sawtooth', 0.018);
    if (name === 'unlock') { tone(420, 0.11, 'sine', 0.04); setTimeout(() => tone(840, 0.13, 'triangle', 0.04), 130); }
  }

  function injectSimplifiedStyles() {
    if ($('#gateSimpleStyles')) return;
    const style = document.createElement('style');
    style.id = 'gateSimpleStyles';
    style.textContent = `.gate-sound-toggle{border:0;border-radius:999px;padding:10px 13px;background:linear-gradient(135deg,#39ff14,#ffe600,#00e5ff);color:#050505;font-weight:1000;text-transform:uppercase;letter-spacing:.08em;cursor:pointer}.gate-simple-hint{margin:8px 0 0;color:#dfffe8;font-weight:850;font-size:.92rem}.gate-mini-actions{align-items:center}.gate-card,.gate-reel{transition:transform .18s ease,filter .18s ease}.gate-card:active,.gate-reel.is-spinning{transform:scale(.96);filter:brightness(1.25)}`;
    document.head.appendChild(style);
  }

  function addSoundToggle() {
    const arcadeHead = $('.gate-arcade-head');
    if (!arcadeHead || $('#gateSoundToggle')) return;
    const button = document.createElement('button');
    button.id = 'gateSoundToggle';
    button.className = 'gate-sound-toggle';
    button.type = 'button';
    button.textContent = 'Sound Off';
    button.addEventListener('click', () => {
      ensureSound();
      sound('unlock');
      button.textContent = 'Sound On';
      setGateStatus('ARCADE LIVE', 'SOUND ON', 'Simple arcade sounds are on. Tap, spin, win, and unlock cues are active.');
    });
    arcadeHead.appendChild(button);
    if (safeGet(SOUND_KEY) === 'true') {
      soundEnabled = true;
      button.textContent = 'Sound On';
    }
  }

  function simplifyCopy() {
    const slotPanel = $('#gateSpinBtn')?.closest('.gate-game-panel');
    if (slotPanel) {
      const title = slotPanel.querySelector('h3');
      const copy = slotPanel.querySelector('p:not(.tagline):not(.gate-game-status)');
      if (title) title.textContent = 'Simple Duck Slots';
      if (copy) copy.textContent = 'Tap Spin. Match symbols. Win Cool Points. Bigger choices can come later.';
      const btn = $('#gateSpinBtn');
      if (btn) btn.textContent = 'Spin';
    }
    const cardPanel = $('#gateResetCards')?.closest('.gate-game-panel');
    if (cardPanel) {
      const title = cardPanel.querySelector('h3');
      const copy = cardPanel.querySelector('p:not(.tagline):not(.gate-game-status)');
      if (title) title.textContent = 'Pick 1, 2, or 3';
      if (copy) copy.textContent = 'Pick a number. Find 01 for the bigger Cool Points hit.';
      const reset = $('#gateResetCards');
      if (reset) reset.textContent = 'Play Again';
    }
    setSlotStatus('Tap Spin to play. Match symbols to win Cool Points.');
    setCardStatus('Pick 1, 2, or 3. Find 01 for +25 Cool Points.');
  }

  function spinSlot() {
    const reels = $$('.gate-reel');
    const spinBtn = $('#gateSpinBtn');
    if (busySlot || !reels.length) return;
    ensureSound();
    busySlot = true;
    if (spinBtn) spinBtn.disabled = true;
    setSlotStatus('Spinning...');
    reels.forEach((reel) => reel.classList.add('is-spinning'));
    let ticks = 0;
    const ticker = setInterval(() => {
      reels.forEach((reel) => { reel.textContent = randomSymbol(); });
      sound('spin');
      ticks += 1;
      if (ticks >= 14) {
        clearInterval(ticker);
        const roll = Math.random();
        let result;
        let payout = 0;
        if (roll < 0.22) { result = ['🦆', '🦆', '🦆']; payout = 35; }
        else if (roll < 0.52) { const symbol = randomSymbol(); result = [symbol, symbol, randomSymbol()].sort(() => Math.random() - 0.5); payout = 12; }
        else { result = [randomSymbol(), randomSymbol(), randomSymbol()]; payout = 3; }
        reels.forEach((reel, index) => { reel.textContent = result[index]; reel.classList.remove('is-spinning'); });
        addPoints(payout);
        setSlotStatus(payout >= 35 ? `Duck Jackpot! +${payout} Cool Points.` : payout >= 12 ? `Nice match. +${payout} Cool Points.` : `Small play bonus. +${payout} Cool Points.`);
        sound(payout >= 12 ? 'win' : 'tap');
        setGateStatus('ARCADE LIVE', 'SIMPLE MODE', 'Simple games are active: tap, play, earn, repeat.');
        busySlot = false;
        if (spinBtn) spinBtn.disabled = false;
      }
    }, 82);
  }

  function resetCards() {
    winningCardIndex = Math.floor(Math.random() * 3);
    $$('.gate-card').forEach((button, index) => {
      button.classList.remove('is-revealed', 'is-miss');
      button.disabled = false;
      button.textContent = String(index + 1);
      button.setAttribute('aria-label', `Pick number ${index + 1}`);
    });
    setCardStatus('Pick 1, 2, or 3. Find 01 for +25 Cool Points.');
  }

  function pickCard(button, index) {
    if (!button || button.disabled) return;
    ensureSound();
    sound('tap');
    const cards = $$('.gate-card');
    cards.forEach((card) => { card.disabled = true; });
    cards.forEach((card, cardIndex) => {
      const value = cardValues[Math.floor(Math.random() * cardValues.length)];
      card.textContent = cardIndex === winningCardIndex ? '01' : value;
      card.classList.add(cardIndex === winningCardIndex ? 'is-revealed' : 'is-miss');
    });
    if (index === winningCardIndex) {
      addPoints(25);
      setCardStatus('You found 01. +25 Cool Points.');
      sound('win');
    } else {
      addPoints(5);
      setCardStatus('Not 01, but you still earned +5 Cool Points. Tap Play Again.');
      sound('miss');
    }
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
    try { await audio.play(); addPoints(activeTrackId === hiddenTrackId ? 10 : 2); setPlayerStatus(`${currentTrack().title} playing. +2 Cool Points.`); }
    catch (error) { setPlayerStatus('Browser blocked autoplay. Tap Play again.'); }
  }
  function pauseTrack() { const audio = $('#gateAudio'); if (audio) audio.pause(); setPlayerStatus('Lobby Music paused.'); }
  function selectTrack(trackId) { hiddenTrackTriggered = false; loadTrack(trackId, 0); }

  function grantLevelOneFromHiddenTrack() {
    const grantedAt = Date.now();
    const nonce = Math.random().toString(36).slice(2);
    safeSessionSet('hyphsworld_vault_access', 'granted');
    safeSessionSet('hyphsworld_vault_access_time', String(grantedAt));
    safeSessionSet(LEVEL_ONE_TRANSPORT_READY_KEY, JSON.stringify({ level: 'level-one', route: LEVEL_ONE_DESTINATION, href: LEVEL_ONE_DESTINATION, grantedAt, nonce, source: 'lobby-hidden-track-bounce-out' }));
    safeSessionSet(LEVEL_ONE_TRANSPORT_V6_KEY, JSON.stringify({ level: 'level-one', route: 'quarantine-mixtape', href: LEVEL_ONE_DESTINATION, grantedAt, nonce, source: 'lobby-hidden-track-bounce-out' }));
    safeSet(LOBBY_UNLOCK_KEY, 'true');
    safeSet('vault_level_1_unlocked', 'true');
    addPoints(25);
    sound('unlock');
    setGateStatus('LEVEL 1 READY', 'UNLOCKED', 'Hidden Track 06 cleared the lobby route. Level 1 transport is ready.');
    setPlayerStatus('BOUNCE OUT finished. LEVEL 1 UNLOCKED. +25 Cool Points.');
    const unlockLink = $('#lobbyLevelOneUnlock');
    if (unlockLink) unlockLink.hidden = false;
  }
  async function playHiddenTrack() { hiddenTrackTriggered = true; loadTrack(hiddenTrackId, 0); await playActiveTrack(); }
  function handleTrackEnded() {
    if (activeTrackId === 'on' && !hiddenTrackTriggered) { setPlayerStatus('Track 05 complete. Loading hidden BOUNCE OUT.'); window.setTimeout(() => playHiddenTrack(), 900); return; }
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
    audio.addEventListener('error', () => { const track = currentTrack(); const nextSource = activeSourceIndex + 1; if (nextSource < (track.sources || []).length) { loadTrack(activeTrackId, nextSource); if (playRequested) playActiveTrack(); return; } setPlayerStatus(`MP3 not found for ${track.title}.`); });
    if (progress) progress.addEventListener('input', () => { if (audio.duration) audio.currentTime = (Number(progress.value) / 100) * audio.duration; });
  }
  function bindLobbyPlayer() {
    const playBtn = $('#gatePlayBtn');
    const pauseBtn = $('#gatePauseBtn');
    if (playBtn) playBtn.addEventListener('click', playActiveTrack);
    if (pauseBtn) pauseBtn.addEventListener('click', pauseTrack);
    trackButtons.forEach((button) => button.addEventListener('click', () => selectTrack(button.dataset.gateTrack)));
  }
  function bindGames() {
    const spinBtn = $('#gateSpinBtn');
    const resetCardsBtn = $('#gateResetCards');
    if (spinBtn) spinBtn.addEventListener('click', spinSlot);
    $$('.gate-card').forEach((button, index) => button.addEventListener('click', () => pickCard(button, index)));
    if (resetCardsBtn) resetCardsBtn.addEventListener('click', resetCards);
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectSimplifiedStyles();
    setPoints(getPoints());
    resetCards();
    simplifyCopy();
    addSoundToggle();
    polishLobbyPanel();
    renderLobbyButtons();
    loadTrack(activeTrackId, 0);
    initAudio();
    bindGames();
    bindLobbyPlayer();
    window.HYPHSWORLD_GATE_SIMPLE_GAMES = true;
    window.HYPHSWORLD_GATE_AUDIO_FX = true;
  });
})();
