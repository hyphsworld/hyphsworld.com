(function (global) {
  'use strict';

  function currentNext() {
    var path = global.location.pathname || '/';
    var search = global.location.search || '';
    var hash = global.location.hash || '';
    return path.replace(/^\//, '') + search + hash;
  }

  function goToLogin() {
    var next = encodeURIComponent(currentNext());
    global.location.replace('/auth.html?next=' + next);
  }

  async function requireLogin() {
    try {
      if (!global.HWAuth || typeof global.HWAuth.getSession !== 'function') {
        goToLogin();
        return false;
      }
      var session = await global.HWAuth.getSession();
      if (!session) {
        goToLogin();
        return false;
      }
      document.documentElement.classList.add('hw-id-ready');
      global.dispatchEvent(new CustomEvent('hyph:id-ready', { detail: session }));
      return true;
    } catch (error) {
      goToLogin();
      return false;
    }
  }

  global.HWRequireLogin = requireLogin;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', requireLogin, { once: true });
  } else {
    requireLogin();
  }
})(window);
