(function () {
  'use strict';
  if (window.__HW_SLOTS_STALL_FIX__) return;
  window.__HW_SLOTS_STALL_FIX__ = true;

  var busy = false;
  var icons = ['A', 'B', 'C', '7', 'D', 'E'];
  function one(sel) { return document.querySelector(sel); }
  function all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function set(el, value) { if (el) el.textContent = String(value); }
  function n(value) { var x = parseInt(value, 10); return Number.isFinite(x) ? x : 0; }
  function money(value) { return n(value) + ' CP'; }
  function timeout(ms) { return new Promise(function (_, reject) { window