(function () {
  'use strict';

  var VIDEO_ID = 'yd4MShi6TvA';
  var WATCH_URL = 'https://youtu.be/yd4MShi6TvA?si=iJFwXE0jyZYXb9Ar';
  var EMBED_URL = 'https://www.youtube.com/embed/' + VIDEO_ID + '?si=iJFwXE0jyZYXb9Ar&rel=0&modestbranding=1';
  var LABEL = 'WEST (visual) YOUNG TEZ & HYPH LIFE prod by CUZ ZAID';
  var SECOND_LINE = 'PURE DRIP 2 available now';
  var FULL_LABEL = LABEL + ' — ' + SECOND_LINE;

  function setText(selector, value) {
    var nodes = document.querySelectorAll(selector);
    nodes.forEach(function (el) { el.textContent = value; });
  }

  function setStripText() {
    var strips = document.querySelectorAll('.homepage-full-episode-strip span');
    strips.forEach(function (span) {
      span.innerHTML = LABEL + '<br><small>' + SECOND_LINE + '</small>';
    });
  }

  function updateFeaturedVideo() {
    if (!document.body) return;
    document.body.setAttribute('data-homepage-video', VIDEO_ID + '-west-pure-drip-2');

    var frame = document.querySelector('.homepage-full-episode-frame');
    if (frame) frame.setAttribute('data-featured-video', VIDEO_ID + '-top');

    var iframe = document.querySelector('.homepage-full-episode-frame iframe');
    if (iframe) {
      if (iframe.src.indexOf(VIDEO_ID) === -1) iframe.src = EMBED_URL;
      iframe.title = LABEL;
    }

    setStripText();
    setText('.spotlight-badge', 'WEST VISUAL');
    setText('#spotlight h4', LABEL);

    var spotlightText = document.querySelector('#spotlight .spotlight-info p:not(.eyebrow)');
    if (spotlightText) spotlightText.textContent = 'WEST visual by Young Tez & Hyph Life, produced by Cuz Zaid. PURE DRIP 2 available now.';

    var primaryWatch = document.querySelector('#spotlight .btn.btn-primary');
    if (primaryWatch) {
      primaryWatch.href = WATCH_URL;
      primaryWatch.textContent = 'Watch WEST Visual';
      primaryWatch.target = '_blank';
      primaryWatch.rel = 'noopener';
    }

    var navLinks = document.querySelectorAll('.main-nav a[href="#top"], .mobile-menu-panel a[href="#top"]');
    navLinks.forEach(function (link) { link.textContent = 'Watch WEST'; });

    var tickerSpans = document.querySelectorAll('.ticker-track span');
    tickerSpans.forEach(function (span) {
      if (/8 MINUTES|FREESTYLE NOW PLAYING|WEST NOW PLAYING/i.test(span.textContent || '')) span.textContent = 'WEST VISUAL NOW PLAYING';
    });

    var homepagePlayerCopy = document.querySelector('#music .section-title p:not(.eyebrow)');
    if (homepagePlayerCopy) homepagePlayerCopy.textContent = FULL_LABEL + '. Tap into the homepage player for more HYPHSWORLD music rotation.';
  }

  function boot() {
    updateFeaturedVideo();
    var textFixes = 0;
    var textTimer = setInterval(function () {
      setStripText();
      setText('.spotlight-badge', 'WEST VISUAL');
      setText('#spotlight h4', LABEL);
      textFixes += 1;
      if (textFixes >= 20) clearInterval(textTimer);
    }, 500);

    try {
      var target = document.querySelector('.homepage-full-episode-strip') || document.body;
      var observer = new MutationObserver(function () { setStripText(); });
      observer.observe(target, { childList: true, subtree: true, characterData: true });
      setTimeout(function () { observer.disconnect(); }, 15000);
    } catch (error) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
