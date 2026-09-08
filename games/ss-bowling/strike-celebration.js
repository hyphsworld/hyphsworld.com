(function () {
  'use strict';

  var CLASS_NAME = 'hw-strike-celebration';
  var STYLE_ID = 'hw-strike-celebration-styles';
  var OVERLAY_ID = 'hw-strike-overlay';
  var lastStrikeAt = 0;

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;

    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '@keyframes hwStrikePop{0%{opacity:0;transform:scale(.2) rotate(-10deg)}42%{opacity:1;transform:scale(1.26) rotate(2deg)}68%{transform:scale(.94) rotate(-1deg)}100%{opacity:1;transform:scale(1) rotate(0)}}',
      '@keyframes hwStrikeGlow{0%,100%{filter:drop-shadow(0 0 8px #fff) drop-shadow(0 0 18px #20f6ff)}50%{filter:drop-shadow(0 0 14px #fff) drop-shadow(0 0 34px #39ff14) drop-shadow(0 0 56px #ff2dff)}}',
      '@keyframes hwStrikeOverlayIn{0%{opacity:0;transform:scale(.45)}18%{opacity:1;transform:scale(1.12)}32%{transform:scale(.96)}48%{transform:scale(1.03)}72%{opacity:1}100%{opacity:0;transform:scale(1.08)}}',
      '@keyframes hwStrikeBurst{0%{opacity:0;transform:scale(.25) rotate(0deg)}25%{opacity:.95}100%{opacity:0;transform:scale(1.9) rotate(28deg)}}',
      '@keyframes hwStrikeSweep{0%{transform:translateX(-140%) skewX(-18deg);opacity:0}18%{opacity:.9}65%{opacity:.55}100%{transform:translateX(150%) skewX(-18deg);opacity:0}}',
      '.' + CLASS_NAME + '{color:#fff!important;background:linear-gradient(90deg,#39ff14 0%,#20f6ff 28%,#fff36a 52%,#ff8a00 72%,#ff2dff 100%)!important;background-clip:text!important;-webkit-background-clip:text!important;-webkit-text-fill-color:transparent!important;font-weight:1000!important;text-shadow:none!important;-webkit-text-stroke:1px rgba(255,255,255,.18)!important;animation:hwStrikePop .58s cubic-bezier(.16,.84,.24,1.18),hwStrikeGlow .72s ease-in-out 3!important;transform-origin:center!important;will-change:transform,filter,opacity}',
      '#' + OVERLAY_ID + '{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;pointer-events:none;overflow:hidden;background:radial-gradient(circle at center,rgba(57,255,20,.18) 0,rgba(32,246,255,.10) 24%,rgba(255,45,255,.06) 44%,transparent 68%);animation:hwStrikeOverlayIn 1.65s cubic-bezier(.2,.8,.2,1) forwards}',
      '#' + OVERLAY_ID + '::before{content:"";position:absolute;width:min(78vw,720px);aspect-ratio:1;border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(57,255,20,.95) 0 3deg,transparent 3deg 11deg,rgba(32,246,255,.95) 11deg 14deg,transparent 14deg 22deg,rgba(255,45,255,.9) 22deg 25deg,transparent 25deg 34deg);-webkit-mask:radial-gradient(circle,transparent 0 28%,#000 30% 100%);mask:radial-gradient(circle,transparent 0 28%,#000 30% 100%);animation:hwStrikeBurst 1.35s ease-out forwards}',
      '#' + OVERLAY_ID + '::after{content:"";position:absolute;inset:34% -20%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.95),rgba(57,255,20,.92),rgba(32,246,255,.88),transparent);filter:blur(5px);animation:hwStrikeSweep .72s ease-out .08s both}',
      '#' + OVERLAY_ID + ' .hw-strike-word{position:relative;z-index:2;font-family:Impact,Haettenschweiler,"Arial Black",sans-serif;font-size:clamp(4.5rem,20vw,12rem);line-height:.82;letter-spacing:.02em;text-transform:uppercase;color:#fff;background:linear-gradient(180deg,#fff 0%,#fff36a 18%,#39ff14 42%,#20f6ff 66%,#ff2dff 100%);background-clip:text;-webkit-background-clip:text;-webkit-text-fill-color:transparent;-webkit-text-stroke:clamp(1px,.55vw,4px) rgba(4,6,8,.86);filter:drop-shadow(0 4px 0 #061318) drop-shadow(0 0 12px #fff) drop-shadow(0 0 28px #39ff14) drop-shadow(0 0 48px #20f6ff) drop-shadow(0 0 72px #ff2dff);transform:rotate(-2deg)}',
      '#' + OVERLAY_ID + ' .hw-strike-sub{position:absolute;z-index:3;top:calc(50% + clamp(2.7rem,11vw,6.5rem));left:50%;transform:translateX(-50%);white-space:nowrap;font-family:"Arial Black",Arial,sans-serif;font-weight:1000;font-size:clamp(.78rem,3vw,1.35rem);letter-spacing:.28em;color:#fff;text-shadow:0 0 10px #20f6ff,0 0 24px #39ff14}',
      '@media(prefers-reduced-motion:reduce){.' + CLASS_NAME + '{animation:none!important;filter:drop-shadow(0 0 14px #20f6ff)!important}#' + OVERLAY_ID + '{animation:none!important;opacity:1!important}#' + OVERLAY_ID + '::before,#' + OVERLAY_ID + '::after{animation:none!important;display:none!important}}'
    ].join('');

    document.head.appendChild(style);
  }

  function normalizedStrikeText(element) {
    if (!element || element.nodeType !== 1) return '';
    if (element.closest && element.closest('[data-hw-strike-overlay="true"]')) return '';
    return (element.textContent || '').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  function isStrikeText(element) {
    var text = normalizedStrikeText(element);
    return text === 'STRIKE' || text === 'STRIKE!';
  }

  function fireHaptics() {
    if (!navigator.vibrate) return;
    try {
      navigator.vibrate([45, 35, 85]);
    } catch (error) {
      // Vibration support varies by browser; visual celebration still works.
    }
  }

  function showOverlay() {
    var existing = document.getElementById(OVERLAY_ID);
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.setAttribute('data-hw-strike-overlay', 'true');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '<div class="hw-strike-word">STRIKE!</div><div class="hw-strike-sub">SUPER STRIKE</div>';
    document.body.appendChild(overlay);

    fireHaptics();

    window.setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 1750);
  }

  function celebrateElement(element) {
    if (!element || !isStrikeText(element)) return false;

    element.classList.remove(CLASS_NAME);
    void element.offsetWidth;
    element.classList.add(CLASS_NAME);
    return true;
  }

  function celebrate(root) {
    var hit = false;

    if (root && root.nodeType === 1) {
      hit = celebrateElement(root) || hit;
    }

    if (root && root.querySelectorAll) {
      root.querySelectorAll('div,span,p').forEach(function (element) {
        hit = celebrateElement(element) || hit;
      });
    }

    if (!hit) return;

    var now = Date.now();
    if (now - lastStrikeAt < 900) return;
    lastStrikeAt = now;
    showOverlay();
  }

  installStyles();
  celebrate(document.body);

  new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === 'characterData') {
        celebrate(mutation.target.parentElement);
      }
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType === 1) celebrate(node);
      });
    });
  }).observe(document.body, { childList: true, characterData: true, subtree: true });
})();
