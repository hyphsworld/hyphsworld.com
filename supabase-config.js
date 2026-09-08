/*
  HYPHSWORLD Supabase Front-End Config

  Project URL and browser-safe publishable key are connected.
  This front end uses the existing Supabase table: public.profiles.

  IMPORTANT:
  This file is for public browser config only.
  Never paste a service_role key, database password, access token,
  or Postgres connection string into this public website file.
*/
window.HW_SUPABASE_CONFIG = {
  url: "https://yuhxtdkhsltaqiagrtys.supabase.co",
  anonKey: "sb_publishable_oYdN-75W3b7k3m1zLukI-A_BKWVDD5e",
  profileTable: "profiles"
};

(function () {
  function loadScriptOnce(id, src) {
    if (document.getElementById(id)) return;
    var script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.defer = true;
    document.head.appendChild(script);
  }

  function loadStyleOnce(id, href) {
    if (document.getElementById(id)) return;
    var link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  var pathname = (window.location.pathname || '/').toLowerCase();
  var isHome = pathname === '/' || pathname === '/index.html' || pathname === '';

  if (!window.__HYPHSWORLD_EXPERIENCE_BOOTSTRAP__) {
    window.__HYPHSWORLD_EXPERIENCE_BOOTSTRAP__ = true;
    loadStyleOnce('hw-experience-style-loader', '/hyphsworld-experience.css?v=20260907-1');
    loadScriptOnce('hw-experience-script-loader', '/hyphsworld-experience.js?v=20260907-1');
  }

  if (!window.__HYPHSWORLD_ANALYTICS_BOOTSTRAP__) {
    window.__HYPHSWORLD_ANALYTICS_BOOTSTRAP__ = true;
    loadScriptOnce('hw-site-analytics-loader', '/site-analytics.js');
  }

  /* These are homepage-only features. Loading them across games/account/creator pages
     created extra parse/work on screens that never use them. */
  if (isHome && !window.__HYPHSWORLD_FEATURE_VIDEO_BOOTSTRAP__) {
    window.__HYPHSWORLD_FEATURE_VIDEO_BOOTSTRAP__ = true;
    loadScriptOnce('hw-homepage-feature-video-loader', '/homepage-feature-video.js?v=yd4MShi6TvA-20260718');
  }

  if (isHome && !window.__HYPHSWORLD_SESSION_STATUS_BOOTSTRAP__) {
    window.__HYPHSWORLD_SESSION_STATUS_BOOTSTRAP__ = true;
    loadScriptOnce('hw-homepage-session-fix-loader', '/homepage-session-fix.js?v=session-fix-20260719');
  }
})();
