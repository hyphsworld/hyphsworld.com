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
  function loadOnce(id, src) {
    if (document.getElementById(id)) return;
    var script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.defer = true;
    document.head.appendChild(script);
  }

  if (!window.__HYPHSWORLD_ANALYTICS_BOOTSTRAP__) {
    window.__HYPHSWORLD_ANALYTICS_BOOTSTRAP__ = true;
    loadOnce('hw-site-analytics-loader', 'site-analytics.js');
  }

  if (!window.__HYPHSWORLD_FEATURE_VIDEO_BOOTSTRAP__) {
    window.__HYPHSWORLD_FEATURE_VIDEO_BOOTSTRAP__ = true;
    loadOnce('hw-homepage-feature-video-loader', 'homepage-feature-video.js?v=yd4MShi6TvA-20260718');
  }
})();
