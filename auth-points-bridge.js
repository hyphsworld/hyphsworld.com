(function () {
  'use strict';

  if (window.__HYPHSWORLD_AUTH_POINTS_BRIDGE__) return;
  window.__HYPHSWORLD_AUTH_POINTS_BRIDGE__ = true;

  const VERSION = 'auth-points-bridge-20260706';
  const CACHE_KEYS = [
    'hyphsworld.coolPoints.total',
    'coolPoints',
    'hyphsworld_points',
    'HW_COOL_POINTS',
    'hyphsworld.coolPoints.guestSession'
  ];

  function n(value) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function writeCache(points) {
    const value = n(points);
    CACHE_KEYS.forEach((key) => {
      try { localStorage.setItem(key, String(value)); } catch (error) {}
    });
    return value;
  }

  function broadcast(points, source) {
    const value = writeCache(points);
    try { document.dispatchEvent(new CustomEvent('hyph:points-updated', { detail: { points: value, source: source || 'auth_points_bridge' } })); } catch (error) {}
    try { window.dispatchEvent(new CustomEvent('hw:points-change', { detail: { points: value, source: source || 'auth_points_bridge' } })); } catch (error) {}
    return value;
  }

  async function client() {
    if (!window.HWAuth || typeof window.HWAuth.getClient !== 'function') return null;
    const maybe = window.HWAuth.getClient();
    const sb = maybe && typeof maybe.then === 'function' ? await maybe : maybe;
    return sb && typeof sb.rpc === 'function' ? sb : null;
  }

  async function rpc(name, args) {
    const sb = await client();
    if (!sb) throw new Error('Supabase client not ready.');
    const { data, error } = await sb.rpc(name, args || {});
    if (error) throw error;
    return data || {};
  }

  function balanceFrom(data) {
    return n(data.balance ?? data.cool_points ?? data.points ?? data.amount ?? 0);
  }

  function sourceFrom(value, fallback) {
    const source = String(value || fallback || 'site_action')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 64);
    return source || fallback || 'site_action';
  }

  async function patch() {
    if (!window.HWAuth || !window.HWAuth.getClient || window.HWAuth.__centralPointsBridge) return false;

    const original = {
      getCurrentUser: window.HWAuth.getCurrentUser,
      getPoints: window.HWAuth.getPoints,
      addPoints: window.HWAuth.addPoints,
      setPoints: window.HWAuth.setPoints
    };

    window.HWAuth.getCurrentUser = async function bridgedGetCurrentUser() {
      const base = original.getCurrentUser ? await original.getCurrentUser.call(window.HWAuth).catch(() => null) : null;
      if (!base) return null;

      try {
        const points = await rpc('get_my_points');
        const balance = balanceFrom(points);
        broadcast(balance, 'get_my_points');
        return Object.assign({}, base, {
          coolPoints: balance,
          points: balance,
          lifetimePoints: Math.max(n(base.lifetimePoints), n(points.lifetime_points), balance),
          rankTitle: points.rank_title || base.rankTitle || 'Lobby Rookie'
        });
      } catch (error) {
        return base;
      }
    };

    window.HWAuth.getPoints = async function bridgedGetPoints() {
      try {
        const points = await rpc('get_my_points');
        const balance = balanceFrom(points);
        broadcast(balance, 'get_my_points');
        return balance;
      } catch (error) {
        return original.getPoints ? original.getPoints.call(window.HWAuth) : 0;
      }
    };

    window.HWAuth.addPoints = async function bridgedAddPoints(amount, reason, metadata) {
      const delta = n(amount);
      if (!delta) return window.HWAuth.getPoints();

      try {
        const result = await rpc('earn_cool_points', {
          p_amount: delta,
          p_source: sourceFrom(reason, 'site_action'),
          p_reason: reason || 'Cool Points earned',
          p_metadata: metadata || {}
        });
        return broadcast(balanceFrom(result), reason || 'earn_cool_points');
      } catch (error) {
        if (original.addPoints) return original.addPoints.call(window.HWAuth, amount, reason, metadata);
        throw error;
      }
    };

    window.HWAuth.awardSongListen = async function bridgedAwardSongListen(trackId, trigger) {
      const result = await rpc('award_song_listen', {
        p_track_id: String(trackId || ''),
        p_trigger: String(trigger || 'ended')
      });
      const balance = broadcast(balanceFrom(result), 'song_play_' + String(trackId || 'unknown'));
      return Object.assign({}, result, { balance });
    };

    window.HWAuth.setPoints = async function bridgedSetPoints(value, reason, metadata) {
      const target = n(value);

      try {
        const current = await rpc('get_my_points');
        const currentBalance = balanceFrom(current);
        const delta = target - currentBalance;

        if (delta > 0) {
          const earned = await rpc('earn_cool_points', {
            p_amount: delta,
            p_source: reason || 'set_points_up',
            p_reason: reason || 'Cool Points adjusted up',
            p_metadata: Object.assign({ target }, metadata || {})
          });
          return broadcast(balanceFrom(earned), reason || 'set_points_up');
        }

        if (delta < 0) {
          const spent = await rpc('spend_cool_points', {
            p_amount: Math.abs(delta),
            p_source: reason || 'set_points_down',
            p_reason: reason || 'Cool Points adjusted down',
            p_metadata: Object.assign({ target }, metadata || {})
          });
          return broadcast(balanceFrom(spent), reason || 'set_points_down');
        }

        return broadcast(currentBalance, reason || 'set_points_no_change');
      } catch (error) {
        if (original.setPoints) return original.setPoints.call(window.HWAuth, value, reason, metadata);
        throw error;
      }
    };

    window.HWAuth.__centralPointsBridge = VERSION;
    try { document.dispatchEvent(new CustomEvent('hyph:auth-points-bridge-ready', { detail: { version: VERSION } })); } catch (error) {}
    return true;
  }

  let attempts = 0;
  const timer = window.setInterval(async function () {
    attempts += 1;
    const ready = await patch();
    if (ready || attempts > 80) window.clearInterval(timer);
  }, 250);

  patch();
})();
