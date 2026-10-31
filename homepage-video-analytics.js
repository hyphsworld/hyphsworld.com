(function () {
  'use strict';

  function install() {
    var video = document.querySelector('#who-is-hyph-life video');
    if (!video || video.dataset.analyticsBound) return;
    video.dataset.analyticsBound = 'true';

    var started = false;
    var completed = false;
    var milestones = {};
    var lastPercent = 0;

    function percent() {
      return Number.isFinite(video.duration) && video.duration > 0
        ? Math.min(100, Math.max(0, video.currentTime / video.duration * 100)) : 0;
    }

    function track(name, progress) {
      if (typeof window.gtag !== 'function') return false;
      window.gtag('event', name, {
        video_title: 'Who Is Hyph Life?',
        video_provider: 'html5',
        video_url: new URL('who-is-hyph-life.mp4', window.location.href).href,
        video_current_time: Math.round(video.currentTime || 0),
        video_duration: Number.isFinite(video.duration) ? Math.round(video.duration) : 0,
        video_percent: progress,
        transport_type: 'beacon'
      });
      return true;
    }

    video.addEventListener('playing', function () {
      if (!started) started = track('video_start', Math.floor(percent()));
      lastPercent = percent();
    });

    video.addEventListener('seeked', function () {
      lastPercent = percent();
    });

    video.addEventListener('timeupdate', function () {
      if (!started || video.seeking || video.paused) return;
      var current = percent();
      [25, 50, 75].forEach(function (milestone) {
        if (!milestones[milestone] && lastPercent < milestone && current >= milestone) {
          milestones[milestone] = track('video_progress', milestone);
        }
      });
      lastPercent = current;
    });

    video.addEventListener('ended', function () {
      if (started && !completed) completed = track('video_complete', 100);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
