(() => {
  'use strict';

  const POINTS_KEY = 'hyphsworld.coolPoints.total';
  const LEGACY_POINTS_KEY = 'coolPoints';

  const tracks = {
    ham: {
      title: 'HAM',
      meta: 'Hyph Life — prod by 1ManBand',
      src: 'ham.mp3'
    },
    time: {
      title: 'TIME',
      meta: 'SIXX FIGGAZ x Hyph Life',
      src: 'time.mp3'
    },
    tez: {
      title: '25/8',
      meta: 'Young Tez — prod by Marty McPhresh',
      src: '25-8.mp3'
    }
  };

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
  const pauseBtn = $('#gatePauseBtn');
  const trackButtons = $$('.gate-track-btn');

  let activeTrack = 'ham';
  let busySlot = false;
  let winningCardIndex = Math.floor(Math.random() * 3);

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (error) { return null; }
  }

  function safeSet(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (error) {}
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
      button.textContent = index === 0 ? '?' : index === 1 ? '?' : '?';
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

  function updateTrack(trackId) {
    const track = tracks[trackId] || tracks.ham;
    activeTrack = trackId;
    if (playerTitle) playerTitle.textContent = track.title;
    if (playerMeta) playerMeta.textContent = track.meta;
    if (audio) {
      audio.src = track.src;
      audio.load();
    }
    trackButtons.forEach((button) => button.classList.toggle('is-active', button.dataset.gateTrack === trackId));
    setPlayerStatus(`Loaded ${track.title}. Tap play if Safari wants one more tap.`);
  }

  async function playTrack() {
    if (!audio) return;
    if (!audio.src) updateTrack(activeTrack);
    try {
      await audio.play();
      addPoints(2);
      setPlayerStatus(`${tracks[activeTrack].title} playing in the gate. +2 Cool Points.`);
    } catch (error) {
      setPlayerStatus('Browser blocked autoplay. Tap play again. Duck blamed Safari.');
    }
  }

  function pauseTrack() {
    if (!audio) return;
    audio.pause();
    setPlayerStatus('Gate player paused. Scanner still live.');
  }

  function initAudio() {
    if (!audio) return;
    audio.addEventListener('timeupdate', () => {
      if (!audio.duration || !progress) return;
      progress.value = String((audio.currentTime / audio.duration) * 100);
    });
    audio.addEventListener('error', () => {
      setPlayerStatus('MP3 not found. Upload/rename the file or pick another gate track.');
    });
    if (progress) {
      progress.addEventListener('input', () => {
        if (!audio.duration) return;
        audio.currentTime = (Number(progress.value) / 100) * audio.duration;
      });
    }
  }

  function bind() {
    if (spinBtn) spinBtn.addEventListener('click', spinSlot);
    cardButtons.forEach((button, index) => {
      button.addEventListener('click', () => pickCard(button, index));
    });
    if (resetCardsBtn) resetCardsBtn.addEventListener('click', resetCards);
    trackButtons.forEach((button) => {
      button.addEventListener('click', () => updateTrack(button.dataset.gateTrack));
    });
    if (playBtn) playBtn.addEventListener('click', playTrack);
    if (pauseBtn) pauseBtn.addEventListener('click', pauseTrack);
  }

  document.addEventListener('DOMContentLoaded', () => {
    setPoints(getPoints());
    resetCards();
    updateTrack(activeTrack);
    initAudio();
    bind();
    window.HYPHSWORLD_GATE_ARCADE_LIVE = true;
  });
})();
