(function () {
  'use strict';

  var VIDEO_ID = 'yd4MShi6TvA';
  var WATCH_URL = 'https://youtu.be/yd4MShi6TvA?si=iJFwXE0jyZYXb9Ar';
  var EMBED_URL = 'https://www.youtube.com/embed/' + VIDEO_ID + '?si=iJFwXE0jyZYXb9Ar&rel=0&modestbranding=1';
  var LABEL = 'HYPHSWORLD New Video';

  function updateFeaturedVideo() {
    if (!document.body) return;
    document.body.setAttribute('data-homepage-video', VIDEO_ID + '-new-video-20260718');

    var frame = document.querySelector('.homepage-full-episode-frame');
    if (frame) frame.setAttribute('data-featured-video', VIDEO_ID +