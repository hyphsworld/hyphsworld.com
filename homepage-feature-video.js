(function () {
  'use strict';

  var VIDEO_ID = 'yd4MShi6TvA';
  var WATCH_URL = 'https://youtu.be/yd4MShi6TvA?si=iJFwXE0jyZYXb9Ar';
  var EMBED_URL = 'https://www.youtube.com/embed/' + VIDEO_ID + '?si=iJFwXE0jyZYXb9Ar&rel=0&modestbranding=1';
  var LABEL = 'WEST - Young Tez & Hyph Life prod by Cuz Zaid';

  function setText(selector, value) {
    var nodes = document.querySelectorAll(selector);
    nodes.forEach(function (el) { el.textContent = value; });
  }

  function updateFeaturedVideo() {
    if (!document.body) return;
    document.body.setAttribute('data-homepage-video', VIDEO_ID + '-west-young-tez-hyph-life');

    var frame = document.querySelector('.homepage-full-episode-frame');
    if (frame) frame.setAttribute('data-featured-video', VIDEO_ID + '-top');

    var iframe = document.querySelector('.homepage-full-episode-frame iframe');
    if (iframe) {
      if (iframe.src.indexOf(VIDEO_ID) === -1) iframe.src = EMBED_URL;
      iframe.title = LABEL;
    }

    setText('.homepage-full-episode-strip span', LABEL);
    setText('.spotlight-badge', 'WEST');
    setText('#spotlight h4', LABEL);

    var spotlightText = document.querySelector('#spotlight .spotlight-info p:not(.eyebrow)');
    if (spotlightText) spotlightText.textContent = 'WEST by Young Tez & Hyph Life, produced by Cuz Zaid, is now live in the HYPHSWORLD Artist Spotlight.';

    var primaryWatch = document.querySelector('#spotlight .btn.btn-primary');
    if (primaryWatch) {
      primaryWatch.href = WATCH_URL;
      primaryWatch.textContent = 'Watch WEST';
      primaryWatch.target = '_blank';
      primaryWatch.rel = 'noopener';
    }

    var navLinks = document.querySelectorAll('.main-nav a[href="#top"], .mobile-menu-panel a[href="#top"]');
    navLinks.forEach(function (link) { link.textContent = 'Watch WEST'; });

    var tickerSpans = document.querySelectorAll('.ticker-track span');
    tickerSpans.forEach(function (span) {
      if (/8 MINUTES|FREESTYLE NOW PLAYING/i.test(span.textContent || '')) span.textContent = 'WEST NOW PLAYING';
    });

    var homepagePlayerCopy = document.querySelector('#music .section-title p:not(.eyebrow)');
    if (homepagePlayerCopy) homepagePlayerCopy.textContent = 'WEST is on the top screen. Tap into the homepage player for more HYPHSWORLD music rotation.';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateFeaturedVideo);
  } else {
    updateFeaturedVideo();
  }
})();
