/* HYPHSWORLD / AMS WEST shared analytics + global Duck Sauce loader + page lockdown */
(function () {
  'use strict';

  var MEASUREMENT_ID = 'G-CT7CWHCHYC';
  var SCRIPT_ID = 'hw-google-analytics-loader';
  var DUCK_SCRIPT_ID = 'hw-global-duck-helper-loader';
  var DUCK_SRC = 'duck-helper.js?v=global-duck-20260509-slick-talk-1';
  var LOCK_STYLE_ID = 'hw-global-page-lock-style';

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

  function loadGlobalDuckSauce() {
    if (window.__HYPHSWORLD_DUCK_HELPER_REQUESTED__) return;
    window.__HYPHSWORLD_DUCK_HELPER_REQUESTED__ = true;

    if (document.getElementById('duckBox') || document.getElementById(DUCK_SCRIPT_ID)) return;

    var script = document.createElement('script');
    script.id = DUCK_SCRIPT_ID;
    script.defer = true;
    script.src = DUCK_SRC;
    document.head.appendChild(script);
  }

  installGlobalPageLock();
  loadGlobalDuckSauce();

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
    var script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(MEASUREMENT_ID);
    document.head.appendChild(script);
  }
})();
