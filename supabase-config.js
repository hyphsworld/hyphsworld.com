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
  if (window.__HYPHSWORLD_ANALYTICS_BOOTSTRAP__) return;
  window.__HYPHSWORLD_ANALYTICS_BOOTSTRAP__ = true;
  var script = document.createElement('script');
  script.src = 'site-analytics.js';
  script.defer = true;
  document.head.appendChild(script);
})();
