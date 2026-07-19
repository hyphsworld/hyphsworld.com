(function () {
  'use strict';

  var VIDEO_ID = 'yd4MShi6TvA';
  var WATCH_URL = 'https://youtu.be/yd4MShi6TvA?si=iJFwXE0jyZYXb9Ar';
  var EMBED_URL = 'https://www.youtube.com/embed/' + VIDEO_ID + '?si=iJFwXE0jyZYXb9Ar&rel=0&modestbranding=1';
  var LABEL = 'WEST - Young Tez & Hyph Life prod by Cuz Zaid';

  function setText(selector, value) {
    var el = document.querySelector(selector);
    if (el) el.textContent = value;
  }

  function updateFeaturedVideo() {
    if (!document.body) return;
    document.body.setAttribute('data-homepage-video', VIDEO_ID + '-west-young-tez-hyph-life-20260718');

    var frame = document.querySelector('.homepage-full-episode-frame');
    if (frame) frame.setAttribute('data-featured-video', VIDEO_ID + '-top');

    var iframe = document.querySelector('.homepage-full-episode-frame iframe');
    if (iframe) {
      iframe.src = EMBED_URL;
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

    var navTop = document.querySelector('.main-nav a[href="#top"]');
    if (navTop) navTop.textContent = 'Watch WEST';

    var mobileTop = document.querySelector('.mobile-menu-panel a[href="#top"]');
    if (mobileTop) mobileTop.textContent = 'Watch WEST';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateFeaturedVideo);
  } else {
    updateFeaturedVideo();
  }
})();
