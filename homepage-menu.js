(function () {
  'use strict';

  var VIDEO_ID = 'yd4MShi6TvA';
  var WATCH_URL = 'https://youtu.be/yd4MShi6TvA?si=iJFwXE0jyZYXb9Ar';
  var EMBED_URL = 'https://www.youtube-nocookie.com/embed/' + VIDEO_ID + '?rel=0&modestbranding=1&playsinline=1';
  var TITLE_LINE = 'WEST (visual) YOUNG TEZ & HYPH LIFE';
  var PROD_LINE = 'prod by CUZ ZAID';
  var DROP_LINE = 'PURE DRIP 2 AVAILABLE NOW';

  function id(name) { return document.getElementById(name); }
  function one(selector) { return document.querySelector(selector); }
  function all(selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); }
  function setText(el, value) { if (el) el.textContent = value; }
  function safe(value) { return String(value || '').replace(/&/g, '&amp;').