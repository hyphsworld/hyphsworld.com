/* Chase the Bag mobile audio-session bridge.
   Opens an audible HTMLMediaElement channel from the player's trusted tap before
   the compiled Web Audio engine resumes. This is intentionally isolated from
   gameplay, auth, scoring, leaderboards, and Cool Points. */
(function () {
  'use strict';

  var ua = navigator.userAgent || '';
  var needsCompatibilitySession = typeof window.Audio === 'function';
  var browser = /Instagram|FBAN|FBAV|FB_IAB/i.test(ua) ? 'social' :
    /GSA|CriOS|Chrome/i.test(ua) ? 'google' :
    /Safari|iPad|iPhone|iPod/i.test(ua) ? 'safari' : 'browser';
  var audioContexts = [];

  var state = {
    required: needsCompatibilitySession,
    primed: false,
    priming: false,
    error: '',
    browser: browser
  };

  window.HWCashRunAudioBridge = {
    getStatus: function () {
      return {
        required: state.required,
        primed: state.primed,
        priming: state.priming,
        error: state.error,
        browser: state.browser,
        contexts: audioContexts.map(function (context) { return context.state; })
      };
    },
    prime: prime
  };

  if (!needsCompatibilitySession) return;

  ['AudioContext', 'webkitAudioContext'].forEach(function (name) {
    var NativeContext = window[name];
    if (typeof NativeContext !== 'function' || NativeContext.__hwCashRunWrapped) return;
    function TrackedAudioContext() {
      var context = Reflect.construct(NativeContext, arguments, NativeContext);
      audioContexts.push(context);
      return context;
    }
    TrackedAudioContext.prototype = NativeContext.prototype;
    try { Object.setPrototypeOf(TrackedAudioContext, NativeContext); } catch (_) {}
    TrackedAudioContext.__hwCashRunWrapped = true;
    window[name] = TrackedAudioContext;
  });

  var activationAudio = new window.Audio(createActivationTone());
  activationAudio.preload = 'auto';
  activationAudio.volume = 0.22;
  activationAudio.setAttribute('playsinline', '');
  activationAudio.setAttribute('webkit-playsinline', '');

  function createActivationTone() {
    var sampleRate = 11025;
    var duration = 0.12;
    var sampleCount = Math.floor(sampleRate * duration);
    var bytes = new Uint8Array(44 + sampleCount * 2);
    var view = new DataView(bytes.buffer);

    function text(offset, value) {
      for (var index = 0; index < value.length; index += 1) {
        view.setUint8(offset + index, value.charCodeAt(index));
      }
    }

    text(0, 'RIFF');
    view.setUint32(4, 36 + sampleCount * 2, true);
    text(8, 'WAVE');
    text(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    text(36, 'data');
    view.setUint32(40, sampleCount * 2, true);

    for (var sample = 0; sample < sampleCount; sample += 1) {
      var progress = sample / sampleCount;
      var attack = Math.min(1, sample / 70);
      var release = Math.pow(1 - progress, 2);
      var wave = Math.sin(2 * Math.PI * 660 * sample / sampleRate);
      view.setInt16(44 + sample * 2, wave * attack * release * 10500, true);
    }

    var binary = '';
    for (var offset = 0; offset < bytes.length; offset += 32768) {
      binary += String.fromCharCode.apply(null, bytes.subarray(offset, offset + 32768));
    }
    return 'data:audio/wav;base64,' + window.btoa(binary);
  }

  function publish(name) {
    try {
      window.dispatchEvent(new CustomEvent('hw:cashrun:audio-session', {
        detail: {
          state: name,
          required: state.required,
          primed: state.primed,
          error: state.error
        }
      }));
    } catch (_) {}
  }

  function resumeContexts() {
    return Promise.all(audioContexts.map(function (context) {
      if (!context || context.state !== 'suspended' || typeof context.resume !== 'function') return true;
      return Promise.resolve(context.resume()).then(function () {
        return context.state === 'running';
      }).catch(function () { return false; });
    }));
  }

  function prime() {
    if (state.primed || state.priming) return Promise.resolve(state.primed);
    state.priming = true;
    state.error = '';
    activationAudio.currentTime = 0;
    resumeContexts();

    var result;
    try {
      result = activationAudio.play();
    } catch (error) {
      state.priming = false;
      state.error = String(error && error.message || error);
      publish('blocked');
      return Promise.resolve(false);
    }

    return Promise.resolve(result).then(function () {
      return resumeContexts();
    }).then(function () {
      state.primed = true;
      state.priming = false;
      publish('primed');
      window.setTimeout(function () {
        try {
          activationAudio.pause();
          activationAudio.currentTime = 0;
        } catch (_) {}
      }, 180);
      return true;
    }).catch(function (error) {
      state.priming = false;
      state.error = String(error && error.message || error);
      publish('blocked');
      return false;
    });
  }

  function shouldPrime(target) {
    if (!target || typeof target.closest !== 'function') return false;
    var control = target.closest(
      '[data-testid="menu-play-btn"],' +
      '[data-testid="menu-test-sound-btn"],' +
      '[data-testid="menu-mute-btn"],' +
      '[data-testid="game-mute-btn"]'
    );
    if (!control) return false;

    var label = String(control.getAttribute('aria-label') || control.textContent || '').toLowerCase();
    if (control.matches('[data-testid="menu-mute-btn"],[data-testid="game-mute-btn"]')) {
      return label.indexOf('unmute') !== -1 || label.indexOf('sound off') !== -1;
    }
    return true;
  }

  function onTrustedActivation(event) {
    if (shouldPrime(event.target)) prime();
  }

  window.addEventListener('pointerdown', onTrustedActivation, true);
  window.addEventListener('touchstart', onTrustedActivation, { capture: true, passive: true });
  window.addEventListener('click', onTrustedActivation, true);
  window.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' || event.key === ' ') onTrustedActivation(event);
  }, true);

  window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
      state.primed = false;
      state.priming = false;
      publish('waiting');
    }
  });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && state.primed) resumeContexts();
  });
})();
