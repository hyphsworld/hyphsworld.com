/* HYPHSWORLD / AMS WEST shared analytics + global loaders + page lockdown + reward codes + PayPal support + Points Core */
(function () {
  'use strict';

  var MEASUREMENT_ID = 'G-CT7CWHCHYC';
  var SCRIPT_ID = 'hw-google-analytics-loader';
  var DUCK_SCRIPT_ID = 'hw-global-duck-helper-loader';
  var DUCK_SRC = 'duck-helper.js?v=global-duck-20260509-slick-talk-1';
  var REWARD_SCRIPT_ID = 'hw-reward-code-widget-loader';
  var REWARD_SRC = 'reward-code-widget.js?v=reward-code-live-20260607';
  var POINTS_SCRIPT_ID = 'hw-points-core-loader';
  var POINTS_SRC = 'points-core.js?v=hyphs-points-core-v4-20260613';
  var AUTH_POINTS_BRIDGE_SCRIPT_ID = 'hw-auth-points-bridge-loader';
  var AUTH_POINTS_BRIDGE_SRC = 'auth-points-bridge.js?v=central-wallet-20260706';
  var LOCK_STYLE_ID = 'hw-global-page-lock-style';
  var SUPPORT_STYLE_ID = 'hw-paypal-support-style';
  var SUPPORT_CARD_ID = 'hw-paypal-support-card';
  var PAYPAL_URL = 'https://paypal.me/1Hyphsworld';

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
    if (window.__HYPHSWORLD_DUCK_HELPER_REQUESTED__) return;
    window.__HYPHSWORLD_DUCK_HELPER_REQUESTED__ = true;

    if (document.getElementById('duckBox') || document.getElementById(DUCK_SCRIPT_ID)) return;

    var script = document.createElement('script');
    script.id = DUCK_SCRIPT_ID;
    script.defer = true;
    script.src = DUCK_SRC;
    document.head.appendChild(script);
  }

  function loadRewardCodeWidget() {
    if (window.__HYPHSWORLD_REWARD_WIDGET_REQUESTED__) return;
    window.__HYPHSWORLD_REWARD_WIDGET_REQUESTED__ = true;

    if (document.getElementById(REWARD_SCRIPT_ID)) return;

    var path = String(window.location.pathname || '').toLowerCase();
    var allowed = path.endsWith('/') || path.endsWith('/index.html') || path.endsWith('/vault.html') || path.endsWith('/games.html') || path.endsWith('/account.html') || path.endsWith('/daily-wheel.html');
    if (!allowed) return;

    var script = document.createElement('script');
    script.id = REWARD_SCRIPT_ID;
    script.defer = true;
    script.src = REWARD_SRC;
    document.head.appendChild(script);
  }

  function installPayPalSupportCard() {
    if (document.getElementById(SUPPORT_CARD_ID)) return;

    var path = String(window.location.pathname || '').toLowerCase();
    var allowed = path.endsWith('/account.html') || path.endsWith('/vault.html') || path.endsWith('/vault-gate.html') || path.endsWith('/games.html') || path.endsWith('/daily-wheel.html');
    if (!allowed) return;

    if (!document.getElementById(SUPPORT_STYLE_ID)) {
      var style = document.createElement('style');
      style.id = SUPPORT_STYLE_ID;
      style.textContent = [
        '.hw-paypal-support-card{position:relative;z-index:3;width:min(1040px,calc(100% - 28px));margin:24px auto;padding:18px;border-radius:26px;border:2px solid rgba(255,228,92,.46);background:radial-gradient(circle at 8% 0%,rgba(57,255,122,.22),transparent 34%),radial-gradient(circle at 94% 0%,rgba(255,39,93,.20),transparent 36%),linear-gradient(145deg,rgba(8,12,9,.94),rgba(0,0,0,.82));box-shadow:0 20px 60px rgba(0,0,0,.38),0 0 28px rgba(57,255,122,.16);color:#fff;text-align:left;overflow:hidden}',
        '.hw-paypal-support-card:before{content:"";position:absolute;inset:-90px auto auto -90px;width:190px;height:190px;border-radius:50%;background:rgba(31,252,255,.20);filter:blur(12px)}',
        '.hw-paypal-support-inner{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center}',
        '.hw-paypal-support-card .hw-paypal-eyebrow{margin:0 0 7px;color:#39ff7a;font-weight:1000;text-transform:uppercase;letter-spacing:.14em;font-size:.78rem}',
        '.hw-paypal-support-card h2{margin:0 0 8px;color:#ffe45c;font-size:clamp(1.65rem,5vw,3.25rem);line-height:.9;text-transform:uppercase;text-shadow:3px 3px 0 rgba(255,39,93,.45)}',
        '.hw-paypal-support-card p{margin:0;color:rgba(255,255,255,.78);font-weight:850;line-height:1.45}',
        '.hw-paypal-support-btn{display:inline-flex;align-items:center;justify-content:center;min-height:54px;padding:0 20px;border-radius:999px;background:linear-gradient(90deg,#ffe45c,#39ff7a,#1ffcff);color:#050505!important;font-weight:1000;text-transform:uppercase;letter-spacing:.08em;text-decoration:none;border:2px solid #050505;box-shadow:0 0 22px rgba(57,255,122,.28);white-space:nowrap}',
        '.hw-paypal-support-btn:hover,.hw-paypal-support-btn:focus-visible{transform:translateY(-1px);filter:saturate(1.16);outline:3px solid rgba(255,39,93,.68);outline-offset:3px}',
        '@media(max-width:720px){.hw-paypal-support-inner{grid-template-columns:1fr}.hw-paypal-support-btn{width:100%}}'
      ].join('\n');
      document.head.appendChild(style);
    }

    var card = document.createElement('section');
    card.id = SUPPORT_CARD_ID;
    card.className = 'hw-paypal-support-card';
    card.setAttribute('aria-label', 'Support HYPHSWORLD through PayPal');
    card.innerHTML = [
      '<div class="hw-paypal-support-inner">',
      '<div>',
      '<p class="hw-paypal-eyebrow">PayPal Only // Power The Portal</p>',
      '<h2>Send Cool Points</h2>',
      '<p>Support HYPHSWORLD directly through PayPal. Every contribution helps power new episodes, music, animation, livestreams, and exclusive drops.</p>',
      '</div>',
      '<a class="hw-paypal-support-btn" href="' + PAYPAL_URL + '" target="_blank" rel="noopener noreferrer">Send Cool Points</a>',
      '</div>'
    ].join('');

    var footer = document.querySelector('footer');
    if (footer && footer.parentNode) {
      footer.parentNode.insertBefore(card, footer);
      return;
    }

    var main = document.querySelector('main');
    if (main) {
      main.appendChild(card);
      return;
    }

    document.body.appendChild(card);
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

  installGlobalPageLock();
  loadPointsCore();
  loadAuthPointsBridge();
  loadGlobalDuckSauce();
  loadRewardCodeWidget();
  installStorefrontAnalytics();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installPayPalSupportCard);
  } else {
    installPayPalSupportCard();
  }

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
