/*
  HYPHSWORLD Cool Points legacy loader
  Kept so old pages do not break.
  The real one-login points wallet lives in points-core.js.
  The auth stability layer keeps login/profile calls simple.
*/
(function () {
  'use strict';

  var CORE_ID = 'hw-points-core-loader';
  var CORE_SRC = 'points-core.js?v=hyphs-points-core-v4-20260613';
  var AUTH_ID = 'hw-auth-stability-loader';
  var AUTH_SRC = 'auth-stability.js?v=auth-stability-1';

  function coreIsLive() {
    return Boolean(window.HWPoints && window.HWPoints.__hyphsPointsCoreV4);
  }

  function loadAuthStability() {
    if (window.__HW_AUTH_STABILITY__) return;
    if (document.getElementById(AUTH_ID)) return;

    var script = document.createElement('script');
    script.id = AUTH_ID;
    script.defer = true;
    script.src = AUTH_SRC;
    document.head.appendChild(script);
  }

  function loadCore() {
    if (coreIsLive()) return;
    if (document.getElementById(CORE_ID)) return;

    var old = document.querySelector('script[src*="points-core.js"]');
    if (old) return;

    var script = document.createElement('script');
    script.id = CORE_ID;
    script.defer = true;
    script.src = CORE_SRC;
    document.head.appendChild(script);
  }

  loadAuthStability();
  loadCore();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      loadAuthStability();
      loadCore();
    });
  }
})();
