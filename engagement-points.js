/* HYPHSWORLD meaningful-engagement rewards.
   The browser reports actions only. PostgreSQL owns every amount, cooldown,
   daily cap, wallet update, and ledger entry. */
(function () {
  'use strict';

  if (window.__HW_ENGAGEMENT_POINTS_V1__) return;
  window.__HW_ENGAGEMENT_POINTS_V1__ = true;

  var awardedThisPage = new Set();
  var mediaTimers = new WeakMap();

  function cleanContext(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/^https?:\/\/[^/]+/i, '')
      .replace(/[^a-z0-9/_:.-]+/g, '_')
      .slice(0, 120);
  }

  async function client() {
    if (!window.HWAuth || typeof window.HWAuth.getClient !== 'function') return null;
    var maybe = window.HWAuth.getClient();
    return maybe && typeof maybe.then === 'function' ? await maybe : maybe;
  }

  async function award(action, context) {
    var key = action + ':' + cleanContext(context);
    if (awardedThisPage.has(key)) return null;
    awardedThisPage.add(key);

    try {
      var sb = await client();
      if (!sb || typeof sb.rpc !== 'function') throw new Error('Points client unavailable.');
      var response = await sb.rpc('award_engagement_action', {
        p_action: action,
        p_context: cleanContext(context)
      });
      if (response.error) throw response.error;

      var result = response.data || {};
      if (result.awarded) {
        try {
          window.dispatchEvent(new CustomEvent('hyphsworld:points-earned', { detail: result }));
        } catch (error) {}
        if (window.HWPoints && typeof window.HWPoints.refresh === 'function') {
          await window.HWPoints.refresh();
        }
      }
      return result;
    } catch (error) {
      awardedThisPage.delete(key);
      return null;
    }
  }

  function pageContext() {
    return location.pathname.replace(/\/+$/, '') || '/';
  }

  function pageCategory(path) {
    if (/vault|floor|level-[12]|quarantine/i.test(path)) return 'vault_visit';
    if (/shop|merch|point-store/i.test(path)) return 'shop_visit';
    if (/game|casino|domino|table-room|table-game/i.test(path)) return 'game_open';
    return 'page_view';
  }

  function wireNavigation() {
    document.addEventListener('click', function (event) {
      var target = event.target && event.target.closest ? event.target.closest('a,button') : null;
      if (!target || target.disabled) return;

      var href = target.getAttribute('href') || '';
      var label = cleanContext(target.getAttribute('aria-label') || target.textContent || target.id || 'action');

      if (target.matches('.hw-duck-btn,.hw-buck-btn,[data-duck-help],[data-buck-help]')) {
        award('helper_interaction', label);
      } else if (/instagram\.com|tiktok\.com|x\.com|youtube\.com|youtu\.be/i.test(href)) {
        award('social_visit', href);
      } else if (target.matches('[data-share],.share-button') || /share/i.test(label)) {
        award('share', pageContext());
      } else if (href && !/^#|^javascript:|^mailto:|^tel:/i.test(href)) {
        award('navigation', href);
      }
    }, true);

    document.addEventListener('submit', function (event) {
      var form = event.target;
      if (!form || /auth|login|signup|vault/i.test(form.id + ' ' + form.className)) return;
      award('form_submit', form.id || form.getAttribute('action') || pageContext());
    }, true);
  }

  function wireMedia() {
    document.querySelectorAll('audio,video').forEach(function (media, index) {
      media.addEventListener('play', function () {
        if (mediaTimers.has(media)) return;
        var type = media.tagName.toLowerCase();
        var context = media.currentSrc || media.src || media.id || (type + '-' + index);
        var timer = window.setTimeout(function () {
          mediaTimers.delete(media);
          if (!media.paused && !media.ended) {
            award(type === 'audio' ? 'music_start' : 'video_progress', context);
          }
        }, type === 'audio' ? 15000 : 30000);
        mediaTimers.set(media, timer);
      });

      ['pause', 'ended', 'emptied'].forEach(function (name) {
        media.addEventListener(name, function () {
          var timer = mediaTimers.get(media);
          if (timer) window.clearTimeout(timer);
          mediaTimers.delete(media);
        });
      });
    });
  }

  async function boot() {
    try {
      if (window.HWAccountWidgetReady) await window.HWAccountWidgetReady;
      if (!window.HWAuth || typeof window.HWAuth.getCurrentUser !== 'function') return;
      var user = await window.HWAuth.getCurrentUser();
      if (!user) return;

      wireNavigation();
      wireMedia();
      await award('session_start', new Date().toISOString().slice(0, 10));
      await award(pageCategory(pageContext()), pageContext());
    } catch (error) {}
  }

  window.HWEngagementPoints = { award: award, version: 'engagement-points-v1' };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();

