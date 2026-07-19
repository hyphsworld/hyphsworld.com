(function () {
  'use strict';

  if (window.__HW_HOME_SESSION_FIX__) return;
  window.__HW_HOME_SESSION_FIX__ = true;

  function text(el, value) {
    if (el) el.textContent = value;
  }

  function showLoggedOut() {
    text(document.getElementById('login-status'), 'Guest Mode');
    var link = document.getElementById('auth-link');
    if (link) {
      link.textContent = 'Create / Login';
      link.href = 'auth.html';
      link.hidden = false;
    }