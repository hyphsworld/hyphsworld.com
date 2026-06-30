/*
  HYPHSWORLD Cool Points legacy loader
  Kept so old pages do not break.
  The real one-login points wallet lives in points-core.js.
*/
(function () {
  'use strict';

  var CORE_ID = 'hw-points-core-loader';
  var CORE_SRC = 'points-core.js?v=hyphs-points-core-v4-20260613';

  function coreIsLive() {
    return Boolean(window.HWPoints && window.HWPoints.__hyphsPointsCoreV4);
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

  loadCore();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCore);
  }
})();
