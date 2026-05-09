(() => {
  'use strict';

  const POINTS_KEY = 'hyphsworld.coolPoints.total';
  const LEGACY_POINTS_KEY = 'coolPoints';

  const LEVEL_ONE_DESTINATION = 'quarantine-mixtape.html';
  const LEVEL_ONE_TRANSPORT_READY_KEY = 'HW_LEVEL1_TRANSPORT_READY';
  const LEVEL_ONE_TRANSPORT_V6_KEY = 'HW_LEVEL1_TRANSPORT_V6';
  const LOBBY_UNLOCK_KEY = 'HW_LOBBY_BOUNCE_UNLOCKED';

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

  const pointsEl = $('#gateCredits');
  const reels = $$('.gate-reel');
  const slotStatus = $('#gateSlotStatus');
  const spinBtn = $('#gateSpinBtn');
  const cardStatus = $('#gateCardStatus');
  const cardButtons = $$('.gate-card');
  const resetCardsBtn = $('#gateResetCards');
  const audio = $('#gateAudio');
  const playerTitle = $('#gatePlayerTitle');
  const playerMeta = $('#gatePlayerMeta');
  const playerStatus = $('#gatePlayerStatus');
  const progress = $('#gatePlayerProgress');
  const playBtn = $('#gatePlayBtn');

  let trackButtons = [];
  let activeTrackId = 'withMe';
  let activeSourceIndex = 0;
  let playRequested = false;
  let hiddenTrackTriggered = false;
  let busySlot = false;
  let winningCardIndex = Math.floor(Math.random() * 3);
  let pendingSlotMode = null;
  let duckChoiceOpen = false;

  function safeGet(key) { try { return localStorage.getItem(key); } catch (error) { return null; } }
  function safeSet(key, value) { try { localStorage.setItem(key, String(value)); } catch (error) {} }
  function safeSessionSet(key, value) { try { sessionStorage.setItem(key, String(value)); } catch (error) {} }
  function numberFrom(value) { const parsed = Number.parseInt(value, 10); return Number.isFinite(parsed) && parsed > 0 ? parsed : 0; }
  function getPoints() { return Math.max(numberFrom(safeGet(POINTS_KEY)), numberFrom(safeGet(LEGACY_POINTS_KEY))); }
  function setPoints(value) { const next = Math.max(0, Number.parseInt(value, 10) || 0); safeSet(POINTS_KEY, next); safeSet(LEGACY_POINTS_KEY, next); if (pointsEl) pointsEl.textContent = String(next); return next; }
  function addPoints(amount) { return setPoints(getPoints() + amount); }
  function setSlotStatus(message) { if (slotStatus) slotStatus.textContent = message; }
  function setCardStatus(message) { if (cardStatus) cardStatus.textContent = message; }
  function setPlayerStatus(message) { if (playerStatus) playerStatus.textContent = message; }

  function setGateStatus(status, pad, message) {
    const gateStatus = $('#gateStatus');
    const padStatus = $('#padStatus');
    const consoleMessage = $('#consoleMessage');
    if (gateStatus) gateStatus.textContent = status;
    if (padStatus) padStatus.textContent = pad;
    if (consoleMessage) consoleMessage.textContent = message;
  }

  function randomSymbol() { return slotSymbols[Math.floor(Math.random() * slotSymbols.length)]; }

  function ensureDuckDecisionStyles() {
    if ($('#gateDuckDecisionStyles')) return;
    const style = document.createElement('style');
    style.id = 'gateDuckDecisionStyles';
    style.textContent = `
      .gate-duck-decision{position:fixed;inset:0;z-index:2147482500;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.58);backdrop-filter:blur(8px)}
      .gate-duck-decision.is-open{display:flex}.gate-duck-card{width:min(94vw,520px);border:2px solid rgba(57,255,20,.72);border-radius:28px;padding:18px;background:radial-gradient(circle at 18% 16%,rgba(57,255,20,.22),transparent 30%),linear-gradient(135deg,#071108,#17001f 62%,#050505);box-shadow:0 26px 70px rgba(0,0,0,.56),0 0 32px rgba(57,255,20,.22);color:#fff;font-family:Arial,sans-serif}.gate-duck-top{display:flex;align-items:center;gap:14px;margin-bottom:12px}.gate-duck-top img{width:74px;height:74px;object-fit:contain;border-radius:50%;background:#050505;border:2px solid rgba(255,255,255,.76);box-shadow:0 0 18px rgba(255,238,0,.35)}.gate-duck-kicker{display:block;color:#39ff14;font-size:.72rem;font-weight:1000;letter-spacing:.16em;text-transform:uppercase}.gate-duck-card h3{margin:2px 0 4px;font-size:clamp(1.55rem,7vw,2.7rem);line-height:.9;text-transform:uppercase;letter-spacing:-.05em}.gate-duck-card p{margin:0;color:#eaffef;font-weight:850;line-height:1.38}.gate-duck-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:16px}.gate-duck-actions button{border:0;border-radius:16px;padding:12px 10px;cursor:pointer;font-weight:1000;text-transform:uppercase;letter-spacing:.05em;color:#050505;background:linear-gradient(135deg,#39ff14,#ffe600,#00e5ff);box-shadow:0 10px 22px rgba(0,0,0,.24)}.gate-duck-actions button[data-duck-choice='risk'],.gate-duck-actions button[data-duck-choice='duck']{background:linear-gradient(135deg,#ff2bd6,#ffe600,#39ff14)}.gate-duck-actions button[data-duck-choice='close']{grid-column:1/-1;color:#fff;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.18)}@media(max-width:560px){.gate-duck-actions{grid-template-columns:1fr}.gate-duck-top img{width:62px;height:62px}}
    `;
    document.head.appendChild(style);
  }

  function ensureDuckDecision() {
    ensureDuckDecisionStyles();
    let modal = $('#gateDuckDecision');
    if (modal) return modal;
    modal = document.createElement('section');
    modal.id = 'gateDuckDecision';
    modal.className = 'gate-duck-decision';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <article class="gate-duck-card" role="dialog" aria-modal="true" aria-labelledby="gateDuckTitle">
        <div class="gate-duck-top">
          <img src="duck-sauce.png?v=gate-choice-20260509" alt="Duck Sauce" onerror="this.onerror=null;this.src='duck-sauce.jpg?v=gate-choice-20260509';" />
          <div><span class="gate-duck-kicker">Duck Sauce Choice</span><h3 id="gateDuckTitle">How you playing it?</h3></div>
        </div>
        <p id="gateDuckText">Pick a lane before the machine moves.</p>
        <div class="gate-duck-actions" id="gateDuckActions"></div>
      </article>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (event) => { if (event.target === modal) closeDuckDecision(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDuckDecision(); });
    return modal;
  }

  function openDuckDecision(kind) {
    if (busySlot || duckChoiceOpen) return;
    duckChoiceOpen = true;
    const modal = ensureDuckDecision();
    const title = $('#gateDuckTitle', modal);
    const text = $('#gateDuckText', modal);
    const actions = $('#gateDuckActions', modal);
    if (kind === 'slot') {
      title.textContent = 'Choose Your Spin';
      text.textContent = 'Duck Sauce popped up at the slot machine. Pick safe points, risk for a bigger hit, ask Duck for a wild spin, or let Buck protect the play.';
      actions.innerHTML = `
        <button type="button" data-duck-choice="safe">Play Safe</button>
        <button type="button" data-duck-choice="risk">Risk It</button>
        <button type="button" data-duck-choice="duck">Ask Duck</button>
        <button type="button" data-duck-choice="buck">Buck Safe Play</button>
        <button type="button" data-duck-choice="close">Cancel</button>`;
    } else {
      title.textContent = 'Pick A Number';
      text.textContent = 'Choose how you want to read the table. Buck gives safer odds. Duck gives bigger drama. The 01 card is still the clean win.';
      actions.innerHTML = `
        <button type="button" data-duck-choice="1">Pick 1</button>
        <button type="button" data-duck-choice="2">Pick 2</button>
        <button type="button" data-duck-choice="3">Pick 3</button>
        <button type="button" data-duck-choice="hint">Ask Duck Hint</button>
        <button type="button" data-duck-choice="close">Cancel</button>`;
    }
    actions.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', () => handleDuckChoice(kind, button.dataset.duckChoice));
    });
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeDuckDecision() {
    const modal = $('#gateDuckDecision');
    if (modal) { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); }
    duckChoiceOpen = false;
  }

  function handleDuckChoice(kind, choice) {
    if (choice === 'close') { closeDuckDecision(); return; }
    closeDuckDecision();
    if (kind === 'slot') {
      pendingSlotMode = choice;
      spinSlot(choice);
      return;
    }
    if (choice === 'hint') {
      const hint = Math.random() > 0.42 ? winningCardIndex + 1 : Math.floor(Math.random() * 3) + 1;
      setCardStatus(`Duck Sauce hint: try number ${hint}. He might be right, he might be Duck.`);
      window.setTimeout(() => openDuckDecision('card'), 850);
      return;
    }
    const index = Math.max(0, Math.min(2, Number(choice) - 1));
    pickCard(cardButtons[index], index);
  }

  function spinSlot(mode = 'safe') {
    if (busySlot || !reels.length) return;
    busySlot = true;
    if (spinBtn) spinBtn.disabled = true;
    const labelMap = { safe: 'safe spin', risk: 'risk spin', duck: 'Duck Sauce wild spin', buck: 'Buck safe play' };
    setSlotStatus(`Duck Sauce locked a ${labelMap[mode] || 'spin'}...`);
    reels.forEach((reel) => reel.classList.add('is-spinning'));

    let ticks = 0;
    const ticker = setInterval(() => {
      reels.forEach((reel) => { reel.textContent = randomSymbol(); });
      ticks += 1;
      if (ticks >= 18) {
        clearInterval(ticker);
        const roll = Math.random();
        let jackpotChance = .24;
        let twoMatchChance = .46;
        let basePayout = 5;
        if (mode === 'risk') { jackpotChance = .36; twoMatchChance = .55; basePayout = 0; }
        if (mode === 'duck') { jackpotChance = .42; twoMatchChance = .60; basePayout = Math.random() > .5 ? 8 : 0; }
        if (mode === 'buck') { jackpotChance = .18; twoMatchChance = .68; basePayout = 10; }

        let result;
        let payout = basePayout;
        let message;
        if (roll < jackpotChance) {
          result = ['🦆', '🦆', '🦆'];
          payout = mode === 'risk' ? 65 : mode === 'duck' ? 75 : 35;
          message = `DUCK JACKPOT +${payout}.`;
        } else if (roll < twoMatchChance) {
          const symbol = randomSymbol();
          result = [symbol, symbol, randomSymbol()].sort(() => Math.random() - .5);
          payout = mode === 'risk' ? 22 : mode === 'buck' ? 18 : 15;
          message = `Two-match hit +${payout}.`;
        } else {
          result = [randomSymbol(), randomSymbol(), randomSymbol()];
          message = payout > 0 ? `Safe bonus +${payout}.` : 'No hit this round. Try another lane.';
        }

        reels.forEach((reel, index) => { reel.textContent = result[index]; reel.classList.remove('is-spinning'); });
        if (payout > 0) addPoints(payout);
        setSlotStatus(`${message} Choice: ${labelMap[mode] || 'spin'}.`);
        setGateStatus('ARCADE LIVE', 'CHOICE MODE', 'Duck Sauce Slots now use choice-based spins with different odds and payouts.');
        busySlot = false;
        pendingSlotMode = null;
        if (spinBtn) spinBtn.disabled = false;
      }
    }, 86);
  }

  function resetCards() {
    winningCardIndex = Math.floor(Math.random() * 3);
    cardButtons.forEach((button, index) => { button.classList.remove('is-revealed', 'is-miss'); button.disabled = false; button.textContent = String(index + 1); button.setAttribute('aria-label', `Pick number ${index + 1}`); });
    setCardStatus('Pick a number: 1, 2, or 3. Ask Duck for a hint if you want extra drama.');
  }

  function pickCard(button, index) {
    if (!button || button.disabled) return;
    cardButtons.forEach((card) => { card.disabled = true; });
    cardButtons.forEach((card, cardIndex) => { const value = cardValues[Math.floor(Math.random() * cardValues.length)]; card.textContent = cardIndex === winningCardIndex ? '01' : value; card.classList.add(cardIndex === winningCardIndex ? 'is-revealed' : 'is-miss'); });
    if (index === winningCardIndex) { addPoints(25); setCardStatus('Number hit. You found the 01 card. +25 Cool Points.'); }
    else { addPoints(5); setCardStatus('Missed the 01, but Buck gave a safe +5 Cool Points.'); }
  }

  function polishLobbyPanel() {
    if (!audio) return;
    const panel = audio.closest('.gate-game-panel');
    if (!panel) return;
    const heading = panel.querySelector('h3');
    const copy = panel.querySelector('p:not(.tagline):not(.gate-player-meta):not(.gate-game-status)');
    if (heading) heading.textContent = 'Lobby Music';
    if (copy) copy.textContent = 'Exclusive lobby-only player. Tracks 1–5 show here. Hidden Track 06 wakes up after ON and opens Level 1 transport without exposing the private code.';
  }

  function renderLobbyButtons() {
    const actions = playBtn ? playBtn.closest('.gate-mini-actions') : null;
    if (!actions) return;
    const trackButtonMarkup = visibleTrackIds.map((trackId, index) => `<button class="gate-track-btn" type="button" data-gate-track="${trackId}">${String(index + 1).padStart(2, '0')} ${lobbyTracks[trackId].title}</button>`).join('');
    actions.innerHTML = `<button class="gate-game-btn" id="gatePlayBtn" type="button">Play</button><button class="gate-track-btn" id="gatePauseBtn" type="button">Pause</button>${trackButtonMarkup}<a class="gate-game-btn" id="lobbyLevelOneUnlock" href="${LEVEL_ONE_DESTINATION}" hidden>Enter Level 1</a>`;
    trackButtons = $$('.gate-track-btn[data-gate-track]', actions);
  }

  function currentTrack() { return lobbyTracks[activeTrackId] || lobbyTracks.withMe; }
  function highlightActiveButton() { trackButtons.forEach((button) => button.classList.toggle('is-active', button.dataset.gateTrack === activeTrackId)); }
  function loadTrack(trackId, sourceAttempt = 0) { const track = lobbyTracks[trackId] || lobbyTracks.withMe; activeTrackId = trackId; activeSourceIndex = sourceAttempt; if (playerTitle) playerTitle.textContent = track.title; if (playerMeta) playerMeta.textContent = track.meta; highlightActiveButton(); const source = (track.sources || [])[sourceAttempt]; if (!source) { setPlayerStatus(`MP3 not found for ${track.title}. Upload it or update vault-gate-games.js.`); return false; } if (audio) { audio.src = source; audio.load(); } setPlayerStatus(`Loaded ${track.title}.${track.visible === false ? ' Hidden Track 06 is active.' : ''} Tap play if mobile needs one more tap.`); return true; }
  async function playActiveTrack() { if (!audio) return; playRequested = true; if (!audio.src) loadTrack(activeTrackId, activeSourceIndex); try { await audio.play(); addPoints(activeTrackId === hiddenTrackId ? 10 : 2); setPlayerStatus(`${currentTrack().title} playing in the Lobby. ${activeTrackId === hiddenTrackId ? 'Hidden unlock sequence live.' : '+2 Cool Points.'}`); } catch (error) { setPlayerStatus('Browser blocked autoplay. Tap play again.'); } }
  function pauseTrack() { if (!audio) return; audio.pause(); setPlayerStatus('Lobby Music paused. Scanner still live.'); }
  function selectTrack(trackId) { hiddenTrackTriggered = false; loadTrack(trackId, 0); }

  function grantLevelOneFromHiddenTrack() { const grantedAt = Date.now(); const nonce = Math.random().toString(36).slice(2); safeSessionSet('hyphsworld_vault_access', 'granted'); safeSessionSet('hyphsworld_vault_access_time', String(grantedAt)); safeSessionSet(LEVEL_ONE_TRANSPORT_READY_KEY, JSON.stringify({ level: 'level-one', route: LEVEL_ONE_DESTINATION, href: LEVEL_ONE_DESTINATION, grantedAt, nonce, source: 'lobby-hidden-track-bounce-out' })); safeSessionSet(LEVEL_ONE_TRANSPORT_V6_KEY, JSON.stringify({ level: 'level-one', route: 'quarantine-mixtape', href: LEVEL_ONE_DESTINATION, grantedAt, nonce, source: 'lobby-hidden-track-bounce-out' })); safeSet(LOBBY_UNLOCK_KEY, 'true'); safeSet('vault_level_1_unlocked', 'true'); addPoints(25); setGateStatus('LEVEL 1 READY', 'UNLOCKED', 'Hidden Track 06 cleared the lobby route. Level 1 transport is ready.'); setPlayerStatus('BOUNCE OUT finished. LEVEL 1 UNLOCKED — Enter Level 1 is live. +25 Cool Points.'); const unlockLink = $('#lobbyLevelOneUnlock'); if (unlockLink) unlockLink.hidden = false; }
  async function playHiddenTrack() { hiddenTrackTriggered = true; loadTrack(hiddenTrackId, 0); await playActiveTrack(); }
  function handleTrackEnded() { if (activeTrackId === 'on' && !hiddenTrackTriggered) { setPlayerStatus('Track 05 complete. Duck Sauce found a hidden switch… loading BOUNCE OUT.'); window.setTimeout(() => playHiddenTrack(), 900); return; } if (activeTrackId === hiddenTrackId) { grantLevelOneFromHiddenTrack(); return; } const currentVisibleIndex = visibleTrackIds.indexOf(activeTrackId); const nextTrackId = visibleTrackIds[currentVisibleIndex + 1]; if (nextTrackId) { selectTrack(nextTrackId); if (playRequested) playActiveTrack(); } else setPlayerStatus('Lobby Music run complete. Track 05 can trigger the hidden route when it plays through.'); }
  function initAudio() { if (!audio) return; audio.addEventListener('timeupdate', () => { if (!audio.duration || !progress) return; progress.value = String((audio.currentTime / audio.duration) * 100); }); audio.addEventListener('ended', handleTrackEnded); audio.addEventListener('error', () => { const track = currentTrack(); const nextSource = activeSourceIndex + 1; if (nextSource < (track.sources || []).length) { loadTrack(activeTrackId, nextSource); if (playRequested) playActiveTrack(); return; } setPlayerStatus(`MP3 not found for ${track.title}. Upload/rename the file or update the Lobby Music source list.`); }); if (progress) progress.addEventListener('input', () => { if (!audio.duration) return; audio.currentTime = (Number(progress.value) / 100) * audio.duration; }); }
  function bindLobbyPlayer() { const freshPlayBtn = $('#gatePlayBtn'); const freshPauseBtn = $('#gatePauseBtn'); if (freshPlayBtn) freshPlayBtn.addEventListener('click', playActiveTrack); if (freshPauseBtn) freshPauseBtn.addEventListener('click', pauseTrack); trackButtons.forEach((button) => button.addEventListener('click', () => selectTrack(button.dataset.gateTrack))); }
  function bindGames() { if (spinBtn) spinBtn.addEventListener('click', () => openDuckDecision('slot')); cardButtons.forEach((button, index) => button.addEventListener('click', () => pickCard(button, index))); if (resetCardsBtn) resetCardsBtn.addEventListener('click', resetCards); if (cardStatus) cardStatus.addEventListener('click', () => openDuckDecision('card')); }

  document.addEventListener('DOMContentLoaded', () => { setPoints(getPoints()); resetCards(); polishLobbyPanel(); renderLobbyButtons(); loadTrack(activeTrackId, 0); initAudio(); bindGames(); bindLobbyPlayer(); window.HYPHSWORLD_LOBBY_MUSIC_LIVE = true; window.HYPHSWORLD_GATE_ARCADE_LIVE = true; window.HYPHSWORLD_GATE_CHOICE_GAMES = true; });
})();
