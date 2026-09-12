(() => {
  'use strict';

  const STYLE_ID = 'hw-bowling-effects-style';
  const OVERLAY_ID = 'hw-alley-gator';
  const THROW_TEST = /(lock[\s-]*aim|throw|roll|bowl|release|shoot)/i;
  const STRIKE_TEXT = 'STRIKE!';
  let sequenceRunning = false;
  let lastTrigger = 0;
  let observer;

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${OVERLAY_ID}{position:fixed;inset:0;z-index:2147483000;pointer-events:none;display:grid;place-items:center;overflow:hidden;opacity:0}
      #${OVERLAY_ID}[data-stage="warning"],#${OVERLAY_ID}[data-stage="chomp"]{opacity:1}
      .hw-gator-lane{position:absolute;inset:0;perspective:700px;isolation:isolate}
      .hw-gator-water{position:absolute;left:50%;top:48%;width:clamp(118px,30vw,190px);height:clamp(24px,6vw,38px);transform:translate(-50%,-50%) rotateX(68deg);border-radius:50%;background:radial-gradient(ellipse,rgba(5,18,14,.88) 0 34%,rgba(43,255,153,.35) 42%,rgba(64,220,255,.18) 56%,transparent 72%);box-shadow:0 0 14px rgba(43,255,153,.45);opacity:0}
      .hw-gator-ripple{position:absolute;inset:0;border:2px solid rgba(106,255,190,.72);border-radius:50%;opacity:0}
      .hw-gator-eyes{position:absolute;left:50%;top:47%;width:112px;height:32px;transform:translate(-50%,12px) scale(.78);filter:drop-shadow(0 0 12px #b7ff00);opacity:0}
      .hw-gator-eye{position:absolute;top:0;width:34px;height:20px;border-radius:56% 56% 44% 44%;background:radial-gradient(circle at 54% 55%,#050505 0 19%,#fff719 22% 44%,#6dff00 48% 68%,transparent 72%);box-shadow:0 0 10px #dfff00,0 0 24px #5dff00}
      .hw-gator-eye:first-child{left:10px;transform:rotate(8deg)}.hw-gator-eye:last-child{right:10px;transform:rotate(-8deg)}
      .hw-gator-head{position:absolute;left:50%;top:47%;width:min(76vw,430px);aspect-ratio:1.55;transform:translate(-50%,72%) scale(.4);border-radius:48% 48% 38% 38%;background:radial-gradient(circle at 30% 35%,#c9ff51 0 2%,transparent 3%),radial-gradient(circle at 70% 35%,#c9ff51 0 2%,transparent 3%),linear-gradient(155deg,#3c9b36,#183f20 68%,#07170b);border:5px solid #75ff51;box-shadow:0 0 30px #35ff62,inset 0 -18px 30px #07170b;opacity:0}
      .hw-gator-snout{position:absolute;left:12%;right:12%;top:44%;bottom:8%;border-radius:45%;background:linear-gradient(#347f32,#15371b);border:3px solid rgba(198,255,108,.7)}
      .hw-gator-teeth{position:absolute;left:18%;right:18%;top:62%;height:20%;background:repeating-linear-gradient(135deg,#fff 0 10px,transparent 11px 24px);clip-path:polygon(0 0,100% 0,92% 100%,84% 0,76% 100%,68% 0,60% 100%,52% 0,44% 100%,36% 0,28% 100%,20% 0,12% 100%)}
      #${OVERLAY_ID}[data-stage="warning"] .hw-gator-water{opacity:1;animation:hwGatorWater 1.1s ease-out both}
      #${OVERLAY_ID}[data-stage="warning"] .hw-gator-ripple{animation:hwGatorRipple .9s ease-out infinite}
      #${OVERLAY_ID}[data-stage="warning"] .hw-gator-ripple:last-child{animation-delay:.3s}
      #${OVERLAY_ID}[data-stage="warning"] .hw-gator-eyes{animation:hwGatorEyes .72s cubic-bezier(.2,.9,.2,1) both}
      #${OVERLAY_ID}[data-stage="chomp"] .hw-gator-eyes,#${OVERLAY_ID}[data-stage="chomp"] .hw-gator-water{opacity:0}
      #${OVERLAY_ID}[data-stage="chomp"] .hw-gator-head{animation:hwGatorChomp 1.05s cubic-bezier(.2,.9,.2,1) both}
      .hw-strike-pop{position:relative!important;z-index:2;color:transparent!important;background:linear-gradient(90deg,#fff719,#55ff73,#22e1ff,#ff45e6,#ff8a00)!important;background-size:250% 100%!important;-webkit-background-clip:text!important;background-clip:text!important;filter:drop-shadow(0 0 8px #22e1ff);animation:hwStrikePop .6s cubic-bezier(.2,1.6,.3,1),hwStrikeGlow 1.1s linear infinite!important}
      @keyframes hwGatorWater{0%{opacity:0;transform:translate(-50%,-50%) rotateX(68deg) scale(.35)}100%{opacity:1;transform:translate(-50%,-50%) rotateX(68deg) scale(1)}}
      @keyframes hwGatorRipple{0%{opacity:.85;transform:scale(.35)}100%{opacity:0;transform:scale(1.45)}}
      @keyframes hwGatorEyes{0%{opacity:0;transform:translate(-50%,15px) scale(.72)}55%{opacity:1}100%{opacity:1;filter:drop-shadow(0 0 25px #fff719);transform:translate(-50%,-50%) scale(1)}}
      @media (orientation:landscape) and (max-height:600px){.hw-gator-water{top:45%}.hw-gator-eyes,.hw-gator-head{top:44%}}
      @keyframes hwGatorChomp{0%{opacity:0;transform:translate(-50%,72%) scale(.4)}42%{opacity:1;transform:translate(-50%,-12%) scale(1)}62%{transform:translate(-50%,-7%) scale(1.08,.78)}78%{transform:translate(-50%,-10%) scale(1)}100%{opacity:0;transform:translate(-50%,34%) scale(.7)}}
      @keyframes hwStrikePop{0%{transform:scale(.35) rotate(-8deg);opacity:0}72%{transform:scale(1.16) rotate(2deg)}100%{transform:scale(1);opacity:1}}
      @keyframes hwStrikeGlow{to{background-position:250% 0;filter:drop-shadow(0 0 18px #ff45e6)}}
      @media (prefers-reduced-motion:reduce){#${OVERLAY_ID} *,.hw-strike-pop{animation-duration:.01ms!important;animation-iteration-count:1!important}}
    `;
    document.head.appendChild(style);
  }

  function installOverlay() {
    let root = document.getElementById(OVERLAY_ID);
    if (root) return root;
    root = document.createElement('div');
    root.id = OVERLAY_ID;
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = '<div class="hw-gator-lane"><div class="hw-gator-water"><i class="hw-gator-ripple"></i><i class="hw-gator-ripple"></i></div><div class="hw-gator-eyes"><i class="hw-gator-eye"></i><i class="hw-gator-eye"></i></div><div class="hw-gator-head"><i class="hw-gator-snout"></i><i class="hw-gator-teeth"></i></div></div>';
    document.body.appendChild(root);
    return root;
  }

  function soundEnabled() {
    const toggle = document.querySelector('[data-testid="sound-toggle-button"]');
    return !toggle || toggle.getAttribute('aria-pressed') !== 'false';
  }

  function dangerCue() {
    if (!soundEnabled()) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.075, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.42);
      gain.connect(ctx.destination);
      [62, 48].forEach((frequency, index) => {
        const oscillator = ctx.createOscillator();
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + index * 0.09);
        oscillator.connect(gain);
        oscillator.start(ctx.currentTime + index * 0.09);
        oscillator.stop(ctx.currentTime + 0.44);
      });
      window.setTimeout(() => ctx.close(), 600);
    } catch (_) {}
  }

  function runGatorSequence() {
    if (sequenceRunning) return;
    sequenceRunning = true;
    const root = installOverlay();
    root.dataset.stage = 'warning';
    dangerCue();
    if (navigator.vibrate) navigator.vibrate([70, 55, 90]);
    window.setTimeout(() => { root.dataset.stage = 'chomp'; }, 950);
    window.setTimeout(() => {
      root.dataset.stage = '';
      sequenceRunning = false;
    }, 2150);
  }

  function markStrikes() {
    document.querySelectorAll('body *').forEach((node) => {
      if (node.children.length === 0 && node.textContent.trim().toUpperCase() === STRIKE_TEXT) {
        node.classList.add('hw-strike-pop');
      }
    });
  }

  function isThrowControl(target) {
    const control = target instanceof Element ? target.closest('[data-testid],button,[role="button"]') : null;
    if (!control) return false;
    return THROW_TEST.test(control.dataset.testid || control.textContent || '');
  }

  function onGameAction(event) {
    if (!isThrowControl(event.target)) return;
    const now = Date.now();
    if (now - lastTrigger < 2500) return;
    lastTrigger = now;
    const throwCount = Number(sessionStorage.getItem('hwBowlingThrowCount') || 0) + 1;
    sessionStorage.setItem('hwBowlingThrowCount', String(throwCount));
    if (throwCount === 1 || throwCount % 3 === 0) runGatorSequence();
  }

  function start() {
    installStyles();
    installOverlay();
    markStrikes();
    document.addEventListener('pointerup', onGameAction, true);
    document.addEventListener('click', onGameAction, true);
    observer = new MutationObserver(markStrikes);
    observer.observe(document.getElementById('root') || document.body, {childList:true,subtree:true,characterData:true});
    window.HWAlleyGator = Object.freeze({ version: '179', preview: runGatorSequence });
    window.setTimeout(runGatorSequence, 1300);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();