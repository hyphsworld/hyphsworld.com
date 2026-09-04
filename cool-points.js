/* HYPHSWORLD account + wallet bootstrap.
   Every legacy page can load this one file and receive the same auth session,
   account-backed Cool Points engine, and single floating account widget. */
(function () {
  'use strict';

  if (window.__HW_ACCOUNT_WIDGET_BOOTSTRAP__) return;
  window.__HW_ACCOUNT_WIDGET_BOOTSTRAP__ = true;
  window.HWCoolPointsLegacyDisabled = true;

  function hasScript(file) {
    return Array.from(document.scripts).some(function (script) {
      return String(script.src || '').split('?')[0].endsWith('/' + file);
    });
  }

  function load(file, ready) {
    if ((ready && ready()) || hasScript(file)) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = '/' + file;
      script.async = false;
      script.onload = resolve;
      script.onerror = function () { reject(new Error('Could not load ' + file)); };
      document.head.appendChild(script);
    });
  }

  async function boot() {
    try {
      await load('supabase-config.js', function () { return Boolean(window.HW_SUPABASE_CONFIG); });
      await load('auth-client.js', function () { return Boolean(window.HWAuth); });
      await load('auth-stability.js', function () { return false; });
      await load('auth-points-bridge.js', function () { return Boolean(window.__HYPHSWORLD_AUTH_POINTS_BRIDGE__); });
      await load('global-points-engine.js', function () { return Boolean(window.HWPoints && window.HWPoints.__accountOnlyEngineV2); });
      if (window.HWPoints && typeof window.HWPoints.refresh === 'function') await window.HWPoints.refresh();
      await load('engagement-points.js', function () { return Boolean(window.__HW_ENGAGEMENT_POINTS_V1__); });
    } catch (error) {
      console.warn('HYPHSWORLD account widget bootstrap warning:', error && error.message || error);
    }
  }

  window.HWAccountWidgetReady = boot();
})();
