(() => {
  'use strict';

  const STYLE_ID = 'hw-bowling-effects-style';
  const STRIKE_TEXT = 'STRIKE!';
  const LIVE_GAME_SELECTOR = '[data-testid="lock-aim-button"],[data-testid="throw-button"]';
  let observer;

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body.hw-ss-live-game #hw-global-create,body.hw-ss-live-game #hw-global-my-id{display:none!important;pointer-events:none!important}
      .hw-strike-pop{position:relative!important;z-index:2;color:transparent!important;background:linear-gradient(90deg,#fff719,#55ff73,#22e1ff,#ff45e6,#ff8a00)!important;background-size:250% 100%!important;-webkit-background-clip:text!important;background-clip:text!important;filter:drop-shadow(0 0 8px #22e1ff);animation:hwStrikePop .6s cubic-bezier(.2,1.6,.3,1),hwStrikeGlow 1.1s linear infinite!important}
      @keyframes hwStrikePop{0%{transform:scale(.35) rotate(-8deg);opacity:0}72%{transform:scale(1.16) rotate(2deg)}100%{transform:scale(1);opacity:1}}
      @keyframes hwStrikeGlow{to{background-position:250% 0;filter:drop-shadow(0 0 18px #ff45e6)}}
      @media (prefers-reduced-motion:reduce){.hw-strike-pop{animation-duration:.01ms!important;animation-iteration-count:1!important}}
    `;
    document.head.appendChild(style);
  }

  function markStrikes() {
    document.querySelectorAll('body *').forEach((node) => {
      if (node.children.length === 0 && node.textContent.trim().toUpperCase() === STRIKE_TEXT) {
        node.classList.add('hw-strike-pop');
      }
    });
  }

  function isLiveGame() {
    return /\/games\/ss-bowling\/game(?:\.html)?\/?$/i.test(window.location.pathname)
      || Boolean(document.querySelector(LIVE_GAME_SELECTOR));
  }

  function syncGlobalControls() {
    const liveGame = isLiveGame();
    document.body.classList.toggle('hw-ss-live-game', liveGame);
    if (!liveGame) return;

    const createMenu = document.getElementById('hw-create-menu');
    if (createMenu) createMenu.hidden = true;
    const createButton = document.getElementById('hw-global-create');
    if (createButton) createButton.setAttribute('aria-expanded', 'false');
  }

  function refreshEffects() {
    syncGlobalControls();
    markStrikes();
  }

  function start() {
    installStyles();
    refreshEffects();
    observer = new MutationObserver(refreshEffects);
    observer.observe(document.getElementById('root') || document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    window.addEventListener('popstate', refreshEffects);
    window.addEventListener('hashchange', refreshEffects);
    window.addEventListener('pageshow', refreshEffects);
    window.HWBowlingEffects = Object.freeze({ version: 'ss-hud-clear-3' });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
