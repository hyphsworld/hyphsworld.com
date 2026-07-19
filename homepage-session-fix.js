(function () {
  'use strict';

  if (window.__HW_HOME_SESSION_FIX__) return;
  window.__HW_HOME_SESSION_FIX__ = true;

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function showLoggedOut() {
    setText('login-status', 'Guest Mode');
    var link = document.getElementById('auth-link');
    if (link) {
      link.textContent = 'Create / Login';
      link.href = 'auth.html';
      link.hidden = false;
    }
    var logout = document.getElementById('home-logout');
    if (logout) logout.hidden = true;
  }

  function showLoggedIn(user) {
    var name = user && (user.displayName || user.email) || 'HYPHSWORLD ID';
    var points = user && (user.coolPoints || user.points) || 0;
    setText('login-status', name + ' - ' + points + ' CP');
    var link = document.getElementById('auth-link');
    if (link) {
      link.textContent = 'Manage ID';
      link.href = 'account.html';
      link.hidden = false;
    }
    var logout = document.getElementById('home-logout');
    if (logout) logout.hidden = false;
  }

  async function refreshStatus() {
    try {
      if (!window.HWAuth || !window.HWAuth.getCurrentUser) return;
      var user = await window.HWAuth.getCurrentUser();
      if (user && (user.email || user.userId)) showLoggedIn(user);
      else showLoggedOut();
    } catch (error) {
      showLoggedOut();
    }
  }

  function boot() {
    refreshStatus();
    setTimeout(refreshStatus, 600);
    setTimeout(refreshStatus, 1500);
    setTimeout(refreshStatus, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.addEventListener('storage', refreshStatus);
  document.addEventListener('hyph:points-updated', refreshStatus);
  window.addEventListener('hw:points-change', refreshStatus);
})();
