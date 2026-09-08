/* HYPHSWORLD shared UX/performance layer. No game, auth, scoring, or points logic lives here. */
(function(){
  'use strict';

  if (window.__HYPHSWORLD_EXPERIENCE__) return;
  window.__HYPHSWORLD_EXPERIENCE__ = true;

  var path = String(window.location.pathname || '/').toLowerCase();
  var isGameRuntime = path.indexOf('/games/') !== -1 && !path.endsWith('/games/');
  var docEl = document.documentElement;
  docEl.classList.add('hw-experience');

  function onReady(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, {once:true});
    else fn();
  }

  function idle(fn, timeout){
    if ('requestIdleCallback' in window) window.requestIdleCallback(fn, {timeout:timeout || 1200});
    else window.setTimeout(fn, Math.min(timeout || 1200, 500));
  }

  function installLoadLine(){
    if (document.getElementById('hw-load-line')) return;
    var line = document.createElement('div');
    line.id = 'hw-load-line';
    line.setAttribute('aria-hidden','true');
    document.body.appendChild(line);
    window.setTimeout(function(){ line.style.width='58%'; }, 40);
    window.addEventListener('load', function(){
      line.classList.add('hw-ready');
      window.setTimeout(function(){ if (line.parentNode) line.remove(); }, 450);
    }, {once:true});
    window.setTimeout(function(){ line.classList.add('hw-ready'); }, 4500);
  }

  function classifyPage(){
    document.body.classList.add('hw-page');
    if (isGameRuntime) document.body.classList.add('hw-game-page');
  }

  function optimizeMedia(){
    var images = Array.prototype.slice.call(document.querySelectorAll('img'));
    images.forEach(function(img, index){
      if (!img.hasAttribute('decoding')) img.decoding = 'async';
      if (!img.hasAttribute('loading') && index > 1 && !img.closest('[data-hero],.hero,.hero-section')) img.loading = 'lazy';
      if (index === 0 || img.closest('[data-hero],.hero,.hero-section')) {
        try { img.fetchPriority = 'high'; } catch(e) {}
      }
    });

    document.querySelectorAll('iframe').forEach(function(frame){
      if (!frame.hasAttribute('loading')) frame.loading = 'lazy';
    });

    document.querySelectorAll('video').forEach(function(video){
      if (!video.hasAttribute('preload')) video.preload = video.closest('[data-hero],.hero,.hero-section') ? 'metadata' : 'none';
    });
  }

  function quietGameChrome(){
    if (!isGameRuntime) return;
    ['#duckBox','#hw-reward-code-widget','#hw-paypal-support-card','.hw-paypal-support-card'].forEach(function(selector){
      document.querySelectorAll(selector).forEach(function(el){ el.classList.add('hw-secondary-ui'); });
    });
  }

  function normalizeTapTargets(){
    document.querySelectorAll('button,[role="button"],a').forEach(function(el){
      if (!el.getAttribute('aria-label') && !String(el.textContent || '').trim() && el.querySelector('svg,img')) {
        var img = el.querySelector('img[alt]');
        if (img && img.alt) el.setAttribute('aria-label', img.alt);
      }
    });
  }

  function observeLateUI(){
    if (!window.MutationObserver) return;
    var observer = new MutationObserver(function(){
      quietGameChrome();
    });
    observer.observe(document.body, {childList:true,subtree:true});
    window.setTimeout(function(){ observer.disconnect(); }, 8000);
  }

  onReady(function(){
    classifyPage();
    installLoadLine();
    optimizeMedia();
    normalizeTapTargets();
    quietGameChrome();
    observeLateUI();
    idle(optimizeMedia, 1600);
  });
})();
