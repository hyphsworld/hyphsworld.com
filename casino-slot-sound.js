/* HYPHSWORLD Casino Sound Suite — synthesized locally, with no audio downloads. */
(function () {
  'use strict';
  var STORAGE_KEY = 'hyphsworld:casino:sound:v1';
  var audioContext = null;
  var masterGain = null;
  var unlocked = false;
  var muted = false;
  var timers = [];
  try { muted = localStorage.getItem(STORAGE_KEY) === 'off'; } catch (error) {}

  function getAudioContext() {
    if (audioContext) return audioContext;
    var AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.72;
    masterGain.connect(audioContext.destination);
    return audioContext;
  }

  function unlockAudio() {
    var ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(function () {});
    unlocked = true;
  }

  function tone(freq, duration, type, gain, delay, endFreq) {
    var ctx = getAudioContext();
    if (!ctx || !unlocked || muted) return;
    var start = ctx.currentTime + (delay || 0);
    var stop = start + Math.max(0.03, duration || 0.1);
    var osc = ctx.createOscillator();
    var amp = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, stop);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain || 0.06), start + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, stop);
    osc.connect(amp);
    amp.connect(masterGain || ctx.destination);
    osc.start(start);
    osc.stop(stop + 0.02);
  }

  function noise(duration, gain, delay) {
    var ctx = getAudioContext();
    if (!ctx || !unlocked || muted) return;
    var length = Math.floor(ctx.sampleRate * (duration || 0.08));
    var buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * 0.32;
    var source = ctx.createBufferSource();
    var amp = ctx.createGain();
    source.buffer = buffer;
    amp.gain.value = gain || 0.025;
    source.connect(amp);
    amp.connect(masterGain || ctx.destination);
    source.start(ctx.currentTime + (delay || 0));
  }

  function later(callback, delay) {
    var timer = setTimeout(function () {
      timers = timers.filter(function (item) { return item !== timer; });
      if (!muted) callback();
    }, delay);
    timers.push(timer);
  }

  function clearSequence() { timers.forEach(clearTimeout); timers = []; }
  function playChip() { unlockAudio(); tone(760, 0.035, 'square', 0.035, 0, 520); tone(1080, 0.025, 'triangle', 0.025, 0.018, 800); }
  function playCard(count) {
    unlockAudio();
    var total = Math.max(1, Math.min(5, count || 1));
    for (var i = 0; i < total; i += 1) { noise(0.045, 0.028, i * 0.055); tone(330 + i * 22, 0.04, 'triangle', 0.025, i * 0.055, 250 + i * 18); }
  }
  function playSlotSpin() {
    unlockAudio(); clearSequence();
    for (var i = 0; i < 8; i += 1) (function (step) { later(function () { tone(190 + step * 28, 0.045, 'square', 0.026, 0, 145 + step * 24); }, step * 55); })(i);
    for (var reel = 0; reel < 5; reel += 1) (function (index) { later(function () { tone(510 + index * 55, 0.07, 'triangle', 0.045, 0, 370 + index * 35); noise(0.035, 0.022); }, 390 + index * 55); })(reel);
  }
  function playWheel() {
    unlockAudio(); clearSequence();
    [0, 55, 110, 170, 235, 305, 385, 480, 590, 720].forEach(function (delay, index) { later(function () { tone(880 - index * 22, 0.025, 'square', 0.022, 0, 650); }, delay); });
  }
  function playWin() { unlockAudio(); [523.25, 659.25, 783.99, 1046.5].forEach(function (freq, index) { tone(freq, index === 3 ? 0.2 : 0.1, index === 3 ? 'sine' : 'triangle', 0.07, index * 0.095); }); }
  function playJackpot() { playWin(); tone(1318.5, 0.22, 'sine', 0.075, 0.45); tone(1568, 0.25, 'triangle', 0.065, 0.58); }
  function playPush() { unlockAudio(); tone(392, 0.09, 'triangle', 0.04, 0); tone(392, 0.12, 'triangle', 0.035, 0.12); }
  function playMiss() { unlockAudio(); tone(220, 0.1, 'sawtooth', 0.04, 0, 185); tone(155, 0.18, 'sawtooth', 0.035, 0.11, 105); }
  function playSwitch() { unlockAudio(); tone(420, 0.045, 'triangle', 0.028, 0, 620); }

  function updateToggle() {
    var button = document.getElementById('casinoSoundToggle');
    if (!button) return;
    button.textContent = muted ? '🔇 SOUND OFF' : '🔊 SOUND ON';
    button.setAttribute('aria-pressed', muted ? 'true' : 'false');
    button.setAttribute('aria-label', muted ? 'Turn casino sound on' : 'Turn casino sound off');
  }
  function setMuted(nextMuted) {
    muted = Boolean(nextMuted);
    if (muted) clearSequence();
    try { localStorage.setItem(STORAGE_KEY, muted ? 'off' : 'on'); } catch (error) {}
    updateToggle();
    if (!muted) { unlockAudio(); playSwitch(); }
  }
  function classifyMessage(text) {
    var value = (text || '').toLowerCase();
    if (!value || value.includes('spinning') || value.includes('hand live') || value.includes('you hit')) return;
    if (value.includes('major') || value.includes('+100') || value.includes('slots hit')) playJackpot();
    else if (value.includes('you beat') || value.includes('reward') || value.includes('bonus') || value.includes('clue hit')) playWin();
    else if (value.includes('push')) playPush();
    else if (value.includes('bust') || value.includes('dealer wins') || value.includes('no match') || value.includes('miss')) playMiss();
  }
  function watchMessage(id) {
    var message = document.getElementById(id);
    if (!message || !window.MutationObserver) return;
    var lastText = message.textContent || '';
    new MutationObserver(function () { var nextText = message.textContent || ''; if (nextText !== lastText) { lastText = nextText; classifyMessage(nextText); } }).observe(message, { childList: true, characterData: true, subtree: true });
  }
  function bind() {
    updateToggle();
    ['pointerdown', 'touchstart', 'keydown'].forEach(function (eventName) { window.addEventListener(eventName, unlockAudio, { passive: true }); });
    document.addEventListener('click', function (event) {
      var closest = event.target.closest && event.target.closest.bind(event.target);
      if (!closest) return;
      if (closest('#casinoSoundToggle')) setMuted(!muted);
      else if (closest('#spinSlotsBtn')) playSlotSpin();
      else if (closest('#spinWheelBtn')) playWheel();
      else if (closest('#dealBtn, #hwDeal')) playCard(4);
      else if (closest('#hitBtn, #hwHit')) playCard(1);
      else if (closest('#standBtn, #hwStand')) playCard(2);
      else if (closest('.chip, .hw-casino-chip')) playChip();
      else if (closest('.game-tab')) playSwitch();
    });
    ['message', 'slotsMessage', 'wheelMessage', 'hwResult'].forEach(watchMessage);
  }

  window.HWCasinoSound = { unlock: unlockAudio, setMuted: setMuted, isMuted: function () { return muted; }, spin: playSlotSpin, wheel: playWheel, card: playCard, win: playWin, jackpot: playJackpot, push: playPush, miss: playMiss, click: playChip };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
})();
