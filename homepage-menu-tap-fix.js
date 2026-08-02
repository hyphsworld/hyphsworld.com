(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function injectCSS() {
    var old = document.getElementById('hwMenuTapFixCss');
    if (old) old.remove();
    var style = document.createElement('style');
    style.id = 'hwMenuTapFixCss';
    style.textContent = [
      'html,body{overflow-y:auto!important;pointer-events:auto!important;touch-action:pan-y!important}',
      'body.home-page *{box-sizing:border-box}',
      '.site-header{position:relative!important;z-index:2147483000!important;overflow:visible!important;pointer-events:auto!important}',
      '.main-nav{position:relative!important;overflow:visible!important;pointer-events:auto!important}',
      '.mobile-menu-toggle{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:44px!important;position:relative!important;z-index:2147483200!important;touch-action:manipulation!important;pointer-events:auto!important;cursor:pointer!important;-webkit-tap-highlight-color:transparent!important;user-select:none!important}',
      '.mobile-menu-panel{display:none!important;position:absolute!important;left:10px!important;right:10px!important;top:calc(100% + 8px)!important;z-index:2147483100!important;grid-template-columns:1fr!important;gap:8px!important;padding:14px!important;border-radius:22px!important;border:1px solid rgba(57,255,122,.45)!important;background:rgba(0,0,0,.97)!important;box-shadow:0 22px 70px rgba(0,0,0,.65),0 0 28px rgba(57,255,122,.18)!important;backdrop-filter:blur(10px)!important;pointer-events:none!important}',
      '.mobile-menu-panel.is-open{display:grid!important;pointer-events:auto!important}',
      '.mobile-menu-panel a{display:flex!important;justify-content:center!important;align-items:center!important;min-height:46px!important;border-radius:16px!important;background:rgba(255,255,255,.09)!important;border:1px solid rgba(255,255,255,.14)!important;color:#fff!important;text-decoration:none!important;font-weight:950!important}',
      '.hw-transport-overlay:not(.is-live),.duck-helper-overlay,.duck-helper-backdrop,.hw-blocker,.modal-backdrop:not(.is-open){display:none!important;pointer-events:none!important}',
      '#hw-global-duck-helper,#duck-helper,.duck-helper,.duck-bubble,.duck-tip,.duck-callout{pointer-events:none!important}',
      '#hw-global-duck-helper button,#duck-helper button,.duck-helper button,.duck-bubble button,.duck-tip button,.duck-callout button{pointer-events:auto!important}',
      'iframe{pointer-events:auto!important}'
    ].join('');
    document.head.appendChild(style);
  }

  function byId(name) { return document.getElementById(name); }

  function setOpen(open) {
    var toggle = document.querySelector('.mobile-menu-toggle');
    var panel = byId('mobile-menu-panel');
    if (!toggle || !panel) return;
    panel.classList.toggle('is-open', Boolean(open));
    panel.hidden = !open;
    panel.style.display = open ? 'grid' : 'none';
    panel.style.pointerEvents = open ? 'auto' : 'none';
    panel.style.visibility = open ? 'visible' : 'hidden';
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.textContent = open ? 'Menu ▲' : 'Menu ▼';
  }

  function replaceToggleNode() {
    var original = document.querySelector('.mobile-menu-toggle');
    if (!original || original.__hwCleanMenuNode) return original;
    var clone = original.cloneNode(true);
    clone.__hwCleanMenuNode = true;
    original.parentNode.replaceChild(clone, original);
    return clone;
  }

  function bind() {
    injectCSS();
    var toggle = replaceToggleNode();
    var panel = byId('mobile-menu-panel');
    if (!toggle || !panel) return;

    toggle.type = 'button';
    toggle.style.pointerEvents = 'auto';
    toggle.style.touchAction = 'manipulation';
    panel.setAttribute('role', 'menu');
    setOpen(false);

    if (!toggle.__hwHardTapBound) {
      toggle.__hwHardTapBound = true;
      var lastTapAt = 0;
      var handler = function (event) {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        var now = Date.now();
        if (now - lastTapAt < 320) return;
        lastTapAt = now;
        setOpen(!panel.classList.contains('is-open'));
      };
      toggle.addEventListener('pointerdown', handler, { passive: false });
      toggle.addEventListener('click', handler, { passive: false });
    }

    if (!panel.__hwHardCloseBound) {
      panel.__hwHardCloseBound = true;
      panel.addEventListener('click', function (event) {
        var link = event.target && event.target.closest && event.target.closest('a');
        if (link) setOpen(false);
      });
    }

    if (!document.__hwHardOutsideBound) {
      document.__hwHardOutsideBound = true;
      document.addEventListener('pointerdown', function (event) {
        var currentToggle = document.querySelector('.mobile-menu-toggle');
        var currentPanel = byId('mobile-menu-panel');
        if (!currentPanel || !currentPanel.classList.contains('is-open')) return;
        if ((currentToggle && currentToggle.contains(event.target)) || currentPanel.contains(event.target)) return;
        setOpen(false);
      }, { passive: true });
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') setOpen(false);
      });
    }
  }

  ready(bind);
  window.addEventListener('load', function () { window.setTimeout(bind, 100); });
  window.addEventListener('pageshow', function () { window.setTimeout(bind, 100); });
})();