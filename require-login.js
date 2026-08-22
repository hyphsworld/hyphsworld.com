(function (global) {
  'use strict';

  var loginCheckPromise = null;

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

  function reveal(session) {
    document.documentElement.classList.add('hw-id-ready');
    global.dispatchEvent(new CustomEvent('hyph:id-ready', { detail: session }));
    return true;
  }

  function waitForSessionRefresh() {
    return new Promise(function (resolve) {
      var finished = false;
      var timer = global.setTimeout(function () { finish(null); }, 1800);

      function finish(session) {
        if (finished) return;
        finished = true;
        global.clearTimeout(timer);
        document.removeEventListener('hyph:auth-signed-in', onSignedIn);
        resolve(session || null);
      }

      function onSignedIn(event) { finish(event && event.detail); }
      document.addEventListener('hyph:auth-signed-in', onSignedIn, { once: true });

      // Supabase can still be restoring its persisted token when DOMContentLoaded
      // fires. A second read after a short grace period prevents a false login gate.
      global.setTimeout(async function () {
        try { finish(await global.HWAuth.getSession()); } catch (error) { finish(null); }
      }, 350);
    });
  }

  function requireLogin() {
    if (document.documentElement.classList.contains('hw-id-ready')) return Promise.resolve(true);
    if (loginCheckPromise) return loginCheckPromise;

    loginCheckPromise = (async function () {
      try {
        if (!global.HWAuth || typeof global.HWAuth.getSession !== 'function') {
          goToLogin();
          return false;
        }
        var session = await global.HWAuth.getSession();
        if (!session) session = await waitForSessionRefresh();
        if (!session) {
          goToLogin();
          return false;
        }
        return reveal(session);
      } catch (error) {
        goToLogin();
        return false;
      }
    })();

    return loginCheckPromise;
  }

  global.HWRequireLogin = requireLogin;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', requireLogin, { once: true });
  } else {
    requireLogin();
  }
})(window);
