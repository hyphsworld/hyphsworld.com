/* HYPHSWORLD / AMS WEST shared analytics + global Duck Sauce loader */
(function () {
  'use strict';

  var MEASUREMENT_ID = 'G-CT7CWHCHYC';
  var SCRIPT_ID = 'hw-google-analytics-loader';
  var DUCK_SCRIPT_ID = 'hw-global-duck-helper-loader';
  var DUCK_SRC = 'duck-helper.js?v=global-duck-20260508-reload-2';

  function loadGlobalDuckSauce() {
    if (window.__HYPHSWORLD_DUCK_HELPER_REQUESTED__) return;
    window.__HYPHSWORLD_DUCK_HELPER_REQUESTED__ = true;

    if (document.getElementById('duckBox') || document.getElementById(DUCK_SCRIPT_ID)) return;

    var script = document.createElement('script');
    script.id = DUCK_SCRIPT_ID;
    script.defer = true;
    script.src = DUCK_SRC;
    document.head.appendChild(script);
  }

  loadGlobalDuckSauce();

  if (!MEASUREMENT_ID || window.__HYPHSWORLD_ANALYTICS_LOADED__) return;
  window.__HYPHSWORLD_ANALYTICS_LOADED__ = true;

  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  window.gtag('js', new Date());
  window.gtag('config', MEASUREMENT_ID, {
    send_page_view: true,
    page_title: document.title,
    page_location: window.location.href,
    page_path: window.location.pathname + window.location.search
  });

  if (!document.getElementById(SCRIPT_ID)) {
    var script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(MEASUREMENT_ID);
    document.head.appendChild(script);
  }
})();
