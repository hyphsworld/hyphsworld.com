/* HYPHSWORLD / AMS WEST shared analytics + global loaders + page lockdown + reward codes + PayPal support + Points Core */
(function () {
  'use strict';

  var MEASUREMENT_ID = 'G-CT7CWHCHYC';
  var SCRIPT_ID = 'hw-google-analytics-loader';
  var DUCK_SCRIPT_ID = 'hw-global-duck-helper-loader';
  var DUCK_SRC = '/duck-helper.js?v=global-duck-20260509-slick-talk-1';
  var LUCKY_SCRIPT_ID = 'hw-lucky-code-ticker-loader';
  var LUCKY_SRC = '/lucky-code-ticker.js?v=game-code-hints-20260911';
  var POINTS_SCRIPT_ID = 'hw-points-core-loader';
  var POINTS_SRC = '/points-core.js?v=hyphs-points-core-v4-20260613';
  var AUTH_POINTS_BRIDGE_SCRIPT_ID = 'hw-auth-points-bridge-loader';
  var AUTH_POINTS_BRIDGE_SRC = '/auth-points-bridge.js?v=central-wallet-20260706';
  var EXPERIENCE_STYLE_ID = 'hw-site-experience-style';
  var EXPERIENCE_SCRIPT_ID = 'hw-site-experience-loader';
  var EXPERIENCE_STYLE_SRC = '/site-experience.css?v=20260907-1';
  var EXPERIENCE_SCRIPT_SRC = '/site-experience.js?v=20260907-1';
  var LOCK_STYLE_ID = 'hw-global-page-lock-style';
  var PATH = String(window.location.pathname || '').toLowerCase();
  var IS_GAME_RUNTIME = PATH.indexOf('/games/') !== -1 && !PATH.endsWith('/games/');

  function idle(fn, timeout) {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(fn, { timeout: timeout || 1400 });
      return;
    }
    window.setTimeout(fn, Math.min(timeout || 1400, 550));
  }

  function loadExperienceLayer() {
    if (!document.getElementById(EXPERIENCE_STYLE_ID)) {
      var link = document.createElement('link');
      link.id = EXPERIENCE_STYLE_ID;
      link.rel = 'stylesheet';
      link.href = EXPERIENCE_STYLE_SRC;
      document.head.appendChild(link);
    }

    if (!document.getElementById(EXPERIENCE_SCRIPT_ID)) {
      var script = document.createElement('script');
      script.id = EXPERIENCE_SCRIPT_ID;
      script.defer = true;
      script.src = EXPERIENCE_SCRIPT_SRC;
      document.head.appendChild(script);
    }
  }

  function installGlobalPageLock() {
    if (document.getElementById(LOCK_STYLE_ID)) return;

    var style = document.createElement('style');
    style.id = LOCK_STYLE_ID;
    style.textContent = [
      'html,body{max-width:100%;overflow-x:hidden!important;overscroll-behavior-x:none!important;}',
      'body{position:relative;touch-action:pan-y pinch-zoom;}',
      '#__next,#root,.site-shell,.home-page,.vault-shell,.casino-shell,.casino-page,.hidden-arcade-page,.quarantine-main,main,header,footer{max-width:100vw;}',
      'img,video,canvas,iframe,svg{max-width:100%;}',
      '*{box-sizing:border-box;}',
      '[data-allow-horizontal-scroll],.allow-horizontal-scroll{overscroll-behavior-x:contain!important;overflow-x:auto!important;}'
    ].join('\n');
    document.head.appendChild(style);

    var startX = 0;
    var startY = 0;

    window.addEventListener('touchstart', function (event) {
      if (!event.touches || !event.touches.length) return;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchmove', function (event) {
      if (!event.touches || !event.touches.length) return;
      if (event.target && event.target.closest && event.target.closest('[data-allow-horizontal-scroll], .allow-horizontal-scroll')) return;

      var dx = event.touches[0].clientX - startX;
      var dy = event.touches[0].clientY - startY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 12) {
        event.preventDefault();
      }
    }, { passive: false });
  }

  function loadPointsCore() {
    if (window.HWPoints && window.HWPoints.__hyphsPointsCoreV4) return;
    if (document.getElementById(POINTS_SCRIPT_ID)) return;

    var script = document.createElement('script');
    script.id = POINTS_SCRIPT_ID;
    script.defer = true;
    script.src = POINTS_SRC;
    document.head.appendChild(script);
  }

  function loadAuthPointsBridge() {
    if (window.__HYPHSWORLD_AUTH_POINTS_BRIDGE__) return;
    if (document.getElementById(AUTH_POINTS_BRIDGE_SCRIPT_ID)) return;

    var script = document.createElement('script');
    script.id = AUTH_POINTS_BRIDGE_SCRIPT_ID;
    script.defer = true;
    script.src = AUTH_POINTS_BRIDGE_SRC;
    document.head.appendChild(script);
  }

  function loadGlobalDuckSauce() {
    if (IS_GAME_RUNTIME) return;
    if (window.__HYPHSWORLD_DUCK_HELPER_REQUESTED__) return;
    window.__HYPHSWORLD_DUCK_HELPER_REQUESTED__ = true;

    if (document.getElementById('duckBox') || document.getElementById(DUCK_SCRIPT_ID)) return;

    var script = document.createElement('script');
    script.id = DUCK_SCRIPT_ID;
    script.defer = true;
    script.src = DUCK_SRC;
    document.head.appendChild(script);
  }

  function loadLuckyCodeTicker() {
    if (IS_GAME_RUNTIME || document.getElementById(LUCKY_SCRIPT_ID)) return;
    var script = document.createElement('script');
    script.id = LUCKY_SCRIPT_ID;
    script.defer = true;
    script.src = LUCKY_SRC;
    document.head.appendChild(script);
  }

  function installStorefrontAnalytics() {
    document.addEventListener('click', function (event) {
      var link = event.target && event.target.closest ? event.target.closest('a[data-store-link]') : null;
      if (!link || typeof window.gtag !== 'function') return;

      var section = link.closest('section');
      var card = link.closest('.product-card, .lane-card');
      var productName = card && card.querySelector('h3');

      window.gtag('event', 'shopify_store_click', {
        link_url: link.href,
        link_text: String(link.textContent || '').trim(),
        merch_item: productName ? String(productName.textContent || '').trim() : 'Storefront',
        store_section: section && section.id ? section.id : 'shop',
        transport_type: 'beacon'
      });
    });
  }

  loadExperienceLayer();
  installGlobalPageLock();

  /* User/session/points stay early. Decorative and promotional UI waits until idle. */
  loadPointsCore();
  loadAuthPointsBridge();
  installStorefrontAnalytics();
  idle(loadGlobalDuckSauce, 900);
  idle(loadLuckyCodeTicker, 1100);


  if (!MEASUREMENT_ID || window.__HYPHSWORLD_ANALYTICS_LOADED__) return;
  window.__HYPHSWORLD_ANALYTICS_LOADED__ = true;

  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  window.gtag('js', new Date());
  window.gtag('config', MEASUREMENT_ID, {
    send_page_view: true,
    page_title: document.title,
    page_location: window.location.href,
    page_path: window.location.pathname + window.location.search
  });

  if (!document.getElementById(SCRIPT_ID)) {
    idle(function () {
      if (document.getElementById(SCRIPT_ID)) return;
      var script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(MEASUREMENT_ID);
      document.head.appendChild(script);
    }, 1800);
  }
})();
