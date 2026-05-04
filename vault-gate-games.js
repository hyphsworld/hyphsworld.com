(() => {
  'use strict';

  const POINTS_KEY = 'hyphsworld.coolPoints.total';
  const LEGACY_POINTS_KEY = 'coolPoints';

  const LEVEL_ONE_DESTINATION = 'quarantine-mixtape.html';
  const LEVEL_ONE_TRANSPORT_READY_KEY = 'HW_LEVEL1_TRANSPORT_READY';
  const LEVEL_ONE_TRANSPORT_V6_KEY = 'HW_LEVEL1_TRANSPORT_V6';
  const LOBBY_UNLOCK_KEY = 'HW_LOBBY_BOUNCE_UNLOCKED';

  const lobbyTracks = {
    withMe: {
      title: 'WITH ME',
      meta: 'Hyph Life — prod by KMT',
      visible: true,
      sources: ['01_WITH_ME.MP3', '01_WITH_ME.mp3', 'with-me.mp3', 'WITH ME.mp3', 'With Me.mp3']
    },
    covidDose: {
      title: 'COVID DOSE',
      meta: 'BooGotGluu — Lobby Music',
      visible: true,
      sources: ['02_COVID_DOSE.MP3', '02_COVID_DOSE.mp3', 'covid-dose.mp3', 'COVID DOSE.mp3', 'Covid Dose.mp3']
    },
    newkie: {
      title: 'NEWKIE',
      meta: 'Hyph Life — prod by KMT',
      visible: true,
      sources: ['03_NEWKIE.MP3', '03_NEWKIE.mp3', 'newkie.mp3', 'NEWKIE.mp3', 'Newkie.mp3']
    },
    etg: {
      title: 'ETG',
      meta: 'BooGotGluu & Hyph Life',
      visible: true,
      sources: ['04_ETG.MP3', '04_ETG.mp3', 'etg.mp3', 'ETG.mp3']
    },
    on: {
      title: 'ON',
      meta: 'Hyph Life & KMT',
      visible: true,
      sources: ['05_ON.MP3', '05_ON.mp3', 'on.mp3', 'ON.mp3', 'On.mp3']
    },
    bounceOut: {
      title: 'BOUNCE OUT',
      meta: 'Hidden Track 06 — Level 1 unlock route',
      visible: false,
      sources: ['06_BOUNCE_OUT.MP3', '06_BOUNCE_OUT.mp3', 'bounce-out.mp3', 'BOUNCE OUT.mp3', 'Bounce Out.mp3']
    }
  };

  const visibleTrackIds = ['withMe', 'covidDose', 'newkie', 'etg', 'on'];
  const hiddenTrackId = 'bounceOut';

  const slotSymbols = ['🦆', '💎', '🎰', '🟢', '🔥', '🛡️', '🎵', '💰'];
  const cardValues = ['A♠', 'K♦', 'Q♣', 'J♥', '10♠', '7♦', '01', 'AMS', 'DUCK'];

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

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (error) { return null; }
  }

  function safeSet(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (error) {}
  }

  function safeSessionSet(key, value) {
    try { sessionStorage.setItem(key, String(value)); } catch (error) {}
  }

  function numberFrom(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function getPoints() {
    return Math.max(numberFrom(safeGet(POINTS_KEY)), numberFrom(safeGet(LEGACY_POINTS_KEY)));
  }

  function setPoints(value) {
    const next = Math.max(0, Number.parseInt(value, 10) || 0);
    safeSet(POINTS_KEY, next);
    safeSet(LEGACY_POINTS_KEY, next);
    if (pointsEl) pointsEl.textContent = String(next);
    return next;
  }

  function addPoints(amount) {
    return setPoints(getPoints() + amount);
  }

  function setSlotStatus(message) {
    if (slotStatus) slotStatus.textContent = message;
  }

  function setCardStatus(message) {
    if (cardStatus) cardStatus.textContent = message;
  }

  function setPlayerStatus(message) {
    if (playerStatus) playerStatus.textContent = message;
  }

  function setGateStatus(status, pad, message) {
    const gateStatus = $('#gateStatus');
    const padStatus = $('#padStatus');
    const consoleMessage = $('#consoleMessage');
    if (gateStatus) gateStatus.textContent = status;
    if (padStatus) padStatus.textContent = pad;
    if (consoleMessage) consoleMessage.textContent = message;
  }

  function randomSymbol() {
    return slotSymbols[Math.floor(Math.random() * slotSymbols.length)];
  }

  function spinSlot() {
    if (busySlot || !reels.length) return;
    busySlot = true;
    if (spinBtn) spinBtn.disabled = true;
    setSlotStatus('Duck Sauce is shaking the machine...');
    reels.forEach((reel) => reel.classList.add('is-spinning'));

    let ticks = 0;
    const ticker = setInterval(() => {
      reels.forEach((reel) => {
        reel.textContent = randomSymbol();
      });
      ticks += 1;
      if (ticks >= 16) {
        clearInterval(ticker);
        const jackpot = Math.random() > 0.72;
        const result = jackpot ? ['🦆', '🦆', '🦆'] : [randomSymbol(), randomSymbol(), randomSymbol()];
        reels.forEach((reel, index) => {
          reel.textContent = result[index];
          reel.classList.remove('is-spinning');
        });

        const payout = jackpot ? 25 : 5;
        addPoints(payout);
        setSlotStatus(jackpot ? `JACKPOT. Duck Sauce actually paid +${payout}.` : `Small hit. Buck approved +${payout}.`);
        busySlot = false;
        if (spinBtn) spinBtn.disabled = false;
      }
    }, 92);
  }

  function resetCards() {
    winningCardIndex = Math.floor(Math.random() * 3);
    cardButtons.forEach((button, index) => {
      button.classList.remove('is-revealed', 'is-miss');
      button.disabled = false;
      button.textContent = '?';
      button.setAttribute('aria-label', `Pick card ${index + 1}`);
    });
    setCardStatus('Pick the card Buck marked. Duck says it is definitely not rigged.');
  }

  function pickCard(button, index) {
    if (!button || button.disabled) return;
    cardButtons.forEach((card) => { card.disabled = true; });
    cardButtons.forEach((card, cardIndex) => {
      const value = cardValues[Math.floor(Math.random() * cardValues.length)];
      card.textContent = cardIndex === winningCardIndex ? '01' : value;
      card.classList.add(cardIndex === winningCardIndex ? 'is-revealed' : 'is-miss');
    });

    if (index === winningCardIndex) {
      addPoints(15);
      setCardStatus('Buck nodded. You found the 01 card. +15 Cool Points.');
    } else {
      addPoints(3);
      setCardStatus('Duck distracted you. Consolation +3 Cool Points.');
    }
  }

  function polishLobbyPanel() {
    if (!audio) return;
    const panel = audio.closest('.gate-game-panel');
    if (!panel) return;

    const heading = panel.querySelector('h3');
    const copy = panel.querySelector('p:not(.tagline):not(.gate-player-meta):not(.gate-game-status)');
    if (heading) heading.textContent = 'Lobby Music';
    if (copy) {
      copy.textContent = 'Exclusive lobby-only player. Tracks 1–5 show here. Hidden Track 06 wakes up after ON and opens Level 1 transport without exposing the private code.';
    }
  }

  function renderLobbyButtons() {
    const actions = playBtn ? playBtn.closest('.gate-mini-actions') : null;
    if (!actions) return;

    const trackButtonMarkup = visibleTrackIds.map((trackId, index) => {
      const track = lobbyTracks[trackId];
      return `<button class="gate-track-btn" type="button" data-gate-track="${trackId}">${String(index + 1).padStart(2, '0')} ${track.title}</button>`;
    }).join('');

    actions.innerHTML = `
      <button class="gate-game-btn" id="gatePlayBtn" type="button">Play</button>
      <button class="gate-track-btn" id="gatePauseBtn" type="button">Pause</button>
      ${trackButtonMarkup}
      <a class="gate-game-btn" id="lobbyLevelOneUnlock" href="${LEVEL_ONE_DESTINATION}" hidden>Enter Level 1</a>
    `;

    trackButtons = $$('.gate-track-btn[data-gate-track]', actions);
  }

  function currentTrack() {
    return lobbyTracks[activeTrackId] || lobbyTracks.withMe;
  }

  function highlightActiveButton() {
    trackButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.gateTrack === activeTrackId);
    });
  }

  function loadTrack(trackId, sourceAttempt = 0) {
    const track = lobbyTracks[trackId] || lobbyTracks.withMe;
    activeTrackId = trackId;
    activeSourceIndex = sourceAttempt;

    if (playerTitle) playerTitle.textContent = track.title;
    if (playerMeta) playerMeta.textContent = track.meta;
    highlightActiveButton();

    const source = (track.sources || [])[sourceAttempt];
    if (!source) {
      setPlayerStatus(`MP3 not found for ${track.title}. Upload it or update vault-gate-games.js.`);
      return false;
    }

    if (audio) {
      audio.src = source;
      audio.load();
    }

    const hiddenNote = track.visible === false ? ' Hidden Track 06 is active.' : '';
    setPlayerStatus(`Loaded ${track.title}.${hiddenNote} Tap play if Safari wants one more tap.`);
    return true;
  }

  async function playActiveTrack() {
    if (!audio) return;
    playRequested = true;
    if (!audio.src) loadTrack(activeTrackId, activeSourceIndex);

    try {
      await audio.play();
      addPoints(activeTrackId === hiddenTrackId ? 10 : 2);
      setPlayerStatus(`${currentTrack().title} playing in the Lobby. ${activeTrackId === hiddenTrackId ? 'Hidden unlock sequence live.' : '+2 Cool Points.'}`);
    } catch (error) {
      setPlayerStatus('Browser blocked autoplay. Tap play again. Duck blamed Safari.');
    }
  }

  function pauseTrack() {
    if (!audio) return;
    audio.pause();
    setPlayerStatus('Lobby Music paused. Scanner still live.');
  }

  function selectTrack(trackId) {
    hiddenTrackTriggered = false;
    loadTrack(trackId, 0);
  }

  function grantLevelOneFromHiddenTrack() {
    const grantedAt = Date.now();
    const nonce = Math.random().toString(36).slice(2);
    const transportReady = {
      level: 'level-one',
      route: LEVEL_ONE_DESTINATION,
      href: LEVEL_ONE_DESTINATION,
      grantedAt,
      nonce,
      source: 'lobby-hidden-track-bounce-out'
    };
    const transportV6 = {
      level: 'level-one',
      route: 'quarantine-mixtape',
      href: LEVEL_ONE_DESTINATION,
      grantedAt,
      nonce,
      source: 'lobby-hidden-track-bounce-out'
    };

    safeSessionSet('hyphsworld_vault_access', 'granted');
    safeSessionSet('hyphsworld_vault_access_time', String(grantedAt));
    safeSessionSet(LEVEL_ONE_TRANSPORT_READY_KEY, JSON.stringify(transportReady));
    safeSessionSet(LEVEL_ONE_TRANSPORT_V6_KEY, JSON.stringify(transportV6));
    safeSet(LOBBY_UNLOCK_KEY, 'true');
    safeSet('vault_level_1_unlocked', 'true');

    addPoints(25);
    setGateStatus('LEVEL 1 READY', 'UNLOCKED', 'Hidden Track 06 cleared the lobby route. Level 1 transport is ready.');
    setPlayerStatus('BOUNCE OUT finished. LEVEL 1 UNLOCKED — Enter Level 1 is live. +25 Cool Points.');

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
      setPlayerStatus('Track 05 complete. Duck Sauce found a hidden switch… loading BOUNCE OUT.');
      window.setTimeout(() => {
        playHiddenTrack();
      }, 900);
      return;
    }

    if (activeTrackId === hiddenTrackId) {
      grantLevelOneFromHiddenTrack();
      return;
    }

    const currentVisibleIndex = visibleTrackIds.indexOf(activeTrackId);
    const nextTrackId = visibleTrackIds[currentVisibleIndex + 1];
    if (nextTrackId) {
      selectTrack(nextTrackId);
      if (playRequested) playActiveTrack();
    } else {
      setPlayerStatus('Lobby Music run complete. Track 05 can trigger the hidden route when it plays through.');
    }
  }

  function initAudio() {
    if (!audio) return;

    audio.addEventListener('timeupdate', () => {
      if (!audio.duration || !progress) return;
      progress.value = String((audio.currentTime / audio.duration) * 100);
    });

    audio.addEventListener('ended', handleTrackEnded);

    audio.addEventListener('error', () => {
      const track = currentTrack();
      const nextSource = activeSourceIndex + 1;
      if (nextSource < (track.sources || []).length) {
        loadTrack(activeTrackId, nextSource);
        if (playRequested) playActiveTrack();
        return;
      }
      setPlayerStatus(`MP3 not found for ${track.title}. Upload/rename the file or update the Lobby Music source list.`);
    });

    if (progress) {
      progress.addEventListener('input', () => {
        if (!audio.duration) return;
        audio.currentTime = (Number(progress.value) / 100) * audio.duration;
      });
    }
  }

  function bindLobbyPlayer() {
    const freshPlayBtn = $('#gatePlayBtn');
    const freshPauseBtn = $('#gatePauseBtn');
    if (freshPlayBtn) freshPlayBtn.addEventListener('click', playActiveTrack);
    if (freshPauseBtn) freshPauseBtn.addEventListener('click', pauseTrack);
    trackButtons.forEach((button) => {
      button.addEventListener('click', () => selectTrack(button.dataset.gateTrack));
    });
  }

  function bindGames() {
    if (spinBtn) spinBtn.addEventListener('click', spinSlot);
    cardButtons.forEach((button, index) => {
      button.addEventListener('click', () => pickCard(button, index));
    });
    if (resetCardsBtn) resetCardsBtn.addEventListener('click', resetCards);
  }

  document.addEventListener('DOMContentLoaded', () => {
    setPoints(getPoints());
    resetCards();
    polishLobbyPanel();
    renderLobbyButtons();
    loadTrack(activeTrackId, 0);
    initAudio();
    bindGames();
    bindLobbyPlayer();
    window.HYPHSWORLD_LOBBY_MUSIC_LIVE = true;
    window.HYPHSWORLD_GATE_ARCADE_LIVE = true;
  });
})();
