/* HYPHSWORLD Casino Slot Sound Layer
   Browser-safe synthesized sounds. No MP3 files required.
*/
(function () {
  'use strict';

  var audioContext = null;
  var unlocked = false;

  function getAudioContext() {
    if (audioContext) return audioContext;
    var AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
    return audioContext;
  }

  function unlockAudio() {
    var ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(function () {});
    unlocked = true;
  }

  function tone(freq, duration, type, gain, delay) {
    var ctx = getAudioContext();
    if (!ctx || !unlocked) return;

    var start = ctx.currentTime + (delay || 0);
    var osc = ctx.createOscillator();
    var amp = ctx.createGain();

    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, start);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain || 0.08), start + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(0.03, duration || 0.12));

    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + Math.max(0.04, duration || 0.12) + 0.02);
  }

  function noise(duration, gain) {
    var ctx = getAudioContext();
    if (!ctx || !unlocked) return;

    var length = Math.floor(ctx.sampleRate * (duration || 0.12));
    var buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * 0.35;

    var source = ctx.createBufferSource();
    var amp = ctx.createGain();
    source.buffer = buffer;
    amp.gain.value = gain || 0.04;
    source.connect(amp);
    amp.connect(ctx.destination);
    source.start();
  }

  function playSpin() {
    unlockAudio();
    tone(180, 0.08, 'square', 0.035, 0);
    tone(240, 0.08, 'square', 0.035, 0.08);
    tone(320, 0.08, 'square', 0.035, 0.16);
    tone(430, 0.09, 'square', 0.035, 0.24);
    noise(0.18, 0.025);
  }

  function playWin() {
    unlockAudio();
    tone(523.25, 0.10, 'triangle', 0.08, 0);
    tone(659.25, 0.10, 'triangle', 0.08, 0.10);
    tone(783.99, 0.12, 'triangle', 0.09, 0.20);
    tone(1046.5, 0.18, 'sine', 0.075, 0.34);
  }

  function playMiss() {
    unlockAudio();
    tone(220, 0.10, 'sawtooth', 0.045, 0);
    tone(155, 0.18, 'sawtooth', 0.04, 0.11);
  }

  function playClick() {
    unlockAudio();
    tone(620, 0.04, 'square', 0.035, 0);
  }

  function watchSlotMessages() {
    var message = document.getElementById('slotsMessage');
    if (!message || !window.MutationObserver) return;

    var observer = new MutationObserver(function () {
      var text = (message.textContent || '').toLowerCase();
      if (text.includes('slots hit') || text.includes('major') || text.includes('reward')) playWin();
      else if (text.includes('no match') || text.includes('miss')) playMiss();
    });

    observer.observe(message, { childList: true, characterData: true, subtree: true });
  }

  function bind() {
    ['pointerdown', 'touchstart', 'keydown'].forEach(function (eventName) {
      window.addEventListener(eventName, unlockAudio, { once: false, passive: true });
    });

    document.addEventListener('click', function (event) {
      var spinSlots = event.target.closest && event.target.closest('#spinSlotsBtn');
      var spinWheel = event.target.closest && event.target.closest('#spinWheelBtn');
      var chip = event.target.closest && event.target.closest('.chip');

      if (spinSlots) playSpin();
      else if (spinWheel) {
        playClick();
        tone(280, 0.08, 'triangle', 0.04, 0.08);
        tone(480, 0.08, 'triangle', 0.04, 0.18);
      } else if (chip) playClick();
    });

    watchSlotMessages();
  }

  window.HWCasinoSound = {
    unlock: unlockAudio,
    spin: playSpin,
    win: playWin,
    miss: playMiss,
    click: playClick
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
