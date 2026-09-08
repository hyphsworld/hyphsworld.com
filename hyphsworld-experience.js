(function () {
  'use strict';

  if (window.__HYPHSWORLD_EXPERIENCE_V1__) return;
  window.__HYPHSWORLD_EXPERIENCE_V1__ = true;

  var path = (location.pathname || '/').toLowerCase();
  var isGame = path.indexOf('/games/') === 0 || path === '/games.html' || path === '/casino.html';
  var isHome = path === '/' || path === '/index.html' || path === '';
  var body = document.body;

  function addPreconnect(href, crossOrigin) {
    if (document.querySelector('link[rel="preconnect"][href="' + href + '"]')) return;
    var link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = href;
    if (crossOrigin) link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }

  function addProgress() {
    if (!document.body || document.getElementById('hwExperienceProgress')) return;
    var progress = document.createElement('div');
    progress.id = 'hwExperienceProgress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.appendChild(progress);
  }

  function markExperience() {
    body = document.body;
    if (!body) return;
    body.setAttribute('data-hw-experience', isGame ? 'game' : 'site');
    body.classList.add(isGame ? 'hw-game-page' : 'hw-site-page');
    if (isHome) body.classList.add('hw-home-page');
  }

  function tuneImages(root) {
    if (!root || !root.querySelectorAll) return;
    var images = root.querySelectorAll('img');
    images.forEach(function (img, index) {
      if (!img.hasAttribute('decoding')) img.decoding = 'async';
      if (!img.hasAttribute('loading')) {
        var rect;
        try { rect = img.getBoundingClientRect(); } catch (error) { rect = null; }
        var nearViewport = rect && rect.top < window.innerHeight * 1.25;
        img.loading = (nearViewport || index < 2) ? 'eager' : 'lazy';
      }
    });
  }

  function tuneFrames(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('iframe').forEach(function (frame) {
      if (!frame.hasAttribute('loading') && !frame.closest('.homepage-full-episode-frame')) {
        frame.loading = 'lazy';
      }
    });
  }

  function compactPointsHud() {
    if (!isGame) return;
    var hud = document.getElementById('hwGlobalPointsHud');
    if (!hud || hud.dataset.hwExperienceBound === '1') return;
    hud.dataset.hwExperienceBound = '1';

    var collapseTimer = null;
    function collapse() {
      hud.classList.add('hwgp-compact');
      hud.classList.remove('hwgp-expanded');
    }
    function expand() {
      hud.classList.remove('hwgp-compact');
      hud.classList.add('hwgp-expanded');
      clearTimeout(collapseTimer);
      collapseTimer = window.setTimeout(collapse, 4200);
    }

    hud.addEventListener('click', function (event) {
      if (hud.classList.contains('hwgp-compact')) {
        event.preventDefault();
        expand();
      }
    });

    collapseTimer = window.setTimeout(collapse, 3600);
  }

  function watchDynamicUi() {
    if (!document.body || !window.MutationObserver) return;
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (!node || node.nodeType !== 1) return;
          if (node.matches && node.matches('img')) tuneImages(node.parentNode || document);
          else tuneImages(node);
          tuneFrames(node);
        });
      });
      compactPointsHud();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function idlePrefetch() {
    var run = function () {
      var targets = isGame
        ? ['/games.html', '/account.html']
        : ['/games.html', '/creators-world.html', '/shop.html', '/account.html'];

      targets.forEach(function (href) {
        if (location.pathname === href) return;
        if (document.querySelector('link[rel="prefetch"][href="' + href + '"]')) return;
        var link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        link.as = 'document';
        document.head.appendChild(link);
      });
    };

    if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 1800 });
    else window.setTimeout(run, 1200);
  }

  function ready() {
    markExperience();
    addProgress();
    tuneImages(document);
    tuneFrames(document);
    compactPointsHud();
    watchDynamicUi();
    idlePrefetch();

    window.requestAnimationFrame(function () {
      document.documentElement.classList.add('hw-exp-ready');
    });
  }

  addPreconnect('https://yuhxtdkhsltaqiagrtys.supabase.co', true);
  addPreconnect('https://cdn.jsdelivr.net', true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();

  window.addEventListener('load', function () {
    document.documentElement.classList.add('hw-exp-loaded');
    window.setTimeout(function () {
      var progress = document.getElementById('hwExperienceProgress');
      if (progress && progress.parentNode) progress.parentNode.removeChild(progress);
    }, 320);
  }, { once: true });
})();
