(function () {
  'use strict';
  if (window.__HW_WEST_SAFE_VIDEO__) return;
  window.__HW_WEST_SAFE_VIDEO__ = true;

  var line1 = 'WEST (visual) YOUNG TEZ & HYPH LIFE';
  var line2 = 'prod by CUZ ZAID';
  var line3 = 'PURE DRIP 2 AVAILABLE NOW';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function boot() {
    var strip = document.querySelector('.homepage-full-episode-strip span');
    if (strip) strip.innerHTML = '<span class="hw-west-title-main">' + line1 + '</span><br><span class="hw-west-title-sub">' + line2 + '</span><br><span class="hw-west-title-sub">' + line3 + '</span>';
    document.querySelectorAll('.main-nav a[href="#top"], .mobile-menu-panel a[href="#top"]').forEach(function (link) { link.textContent = 'Watch WEST'; });
    var style = document.getElementById('hwWestReadableTitle');
    if (!style) {
      style = document.createElement('style');
      style.id = 'hwWestReadableTitle';
      style.textContent = '.homepage-full-episode-strip span{display:block;line-height:1.15;font-size:clamp(18px,5vw,30px);letter-spacing:.02em;text-shadow:none!important}.hw-west-title-sub{font-size:.82em;color:#1ffcff;letter-spacing:.06em}.homepage-full-episode-strip{padding-left:18px!important;padding-right:18px!important}#duckBox{max-width:115px!important;z-index:5!important}';
      document.head.appendChild(style);
    }
  }

  ready(boot);
})();
