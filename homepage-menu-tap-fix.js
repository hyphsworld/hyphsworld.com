(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function injectCSS() {
    if (document.getElementById('hwMenuTapFixCss')) return;
    var style = document.createElement('style');
    style.id = 'hwMenuTapFixCss';
    style.textContent = [
      '.site-header{position:relative!important;z-index:100000!important;overflow:visible!important}',
      '.main-nav{position:relative!important;overflow:visible!important}',
      '.mobile-menu-toggle{position:relative!important;z-index:100020!important;touch-action:manipulation!important;pointer-events:auto!important;cursor:pointer!important;-webkit-tap-highlight-color:transparent}',
      '.mobile-menu-panel{display:none!important;position:absolute!important;left:12px!important;right:12px!important;top:calc(100% + 10px)!important;z-index:100010!important;grid-template-columns:1fr!important;gap:8px!important;padding:14px!important;border-radius:22px!important;border:1px solid rgba(57,255,122,.34)!important;background:rgba(0,0,0,.95)!important;box-shadow:0 22px 70px rgba(0,0,0,.55),0 0 28px rgba(57,255,122,.16)!important;backdrop-filter:blur(10px)!important;pointer-events:none!important}',
      '.mobile-menu-panel.is-open{display:grid!important;pointer-events:auto!important}',
      '.mobile-menu-panel a{display:flex!important;justify-content:center!important;align-items:center!important;min-height:44px!important;border-radius:16px!important;background:rgba(255,255,255,.08)!important;border:1px solid rgba(255,255,255,.12)!important;color:#fff!important;text-decoration:none!important;font-weight:950!important}'
    ].join('');
    document.head.appendChild(style);
  }

  function setOpen(open) {
    var toggle = document.querySelector('.mobile-menu-toggle');
    var panel = document.getElementById('mobile-menu-panel');
    if (!toggle || !panel) return;
    panel.classList.toggle('is-open', Boolean(open));
    panel.hidden = !open;
    panel.style.display = open ? 'grid' : 'none';
    panel.style.pointerEvents = open ? 'auto' : 'none';
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.textContent = open ? 'Menu ▲' : 'Menu ▼';
  }

  function bind() {
    injectCSS();
    var toggle = document.querySelector('.mobile-menu-toggle');
    var panel = document.getElementById('mobile-menu-panel');
    if (!toggle || !panel) return;

    toggle.style.pointerEvents = 'auto';
    toggle.style.touchAction = 'manipulation';
    panel.setAttribute('role', 'menu');
    setOpen(false);

    function tap(event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      setOpen(!panel.classList.contains('is-open'));
    }

    if (!toggle.__hwMenuTapFixBound) {
      toggle.__hwMenuTapFixBound = true;
      ['click', 'pointerup', 'touchend'].forEach(function (eventName) {
        toggle.addEventListener(eventName, tap, { passive: false });
      });
    }

    if (!panel.__hwMenuCloseBound) {
      panel.__hwMenuCloseBound = true;
      panel.addEventListener('click', function (event) {
        if (event.target && event.target.closest && event.target.closest('a')) setOpen(false);
      });
    }

    if (!document.__hwMenuOutsideBound) {
      document.__hwMenuOutsideBound = true;
      document.addEventListener('click', function (event) {
        if (!panel.classList.contains('is-open')) return;
        if (toggle.contains(event.target) || panel.contains(event.target)) return;
        setOpen(false);
      });
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') setOpen(false);
      });
    }
  }

  ready(bind);
  window.addEventListener('pageshow', function () { window.setTimeout(bind, 100); });
})();