/* HYPHSWORLD / AMS WEST shared analytics loader */
(function () {
  'use strict';

  var MEASUREMENT_ID = 'G-CT7CWHCHYC';
  var SCRIPT_ID = 'hw-google-analytics-loader';

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
