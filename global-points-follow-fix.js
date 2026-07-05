/* HYPHSWORLD Cool Points Follow Fix
   V3 locks one wallet across casino, lobby, floor pages, Daily Spin, and the sticky HUD.
   Server-returned balances are authoritative, even when the number goes down after a paid spin.
*/
(function () {
  'use strict';

  if (window.HWPointsFollowFixV3) return;

  const STORAGE_KEY = 'hyphsworld.coolPoints.total';
  const GUEST_KEY = 'hyphsworld.coolPoints.guestSession';
  const AUTHORITATIVE_HOLD_MS = 12000;
  const POINT_SELECTOR = [
    '[data-hw-points]',
    '[data-cool-points]',
    '[data-hw-daily-balance]',
    '[data-cp-balance]',
    '#cool-points',
    '#gateCredits',
    '#gateCreditsReadout',
    '#casinoCoolPoints',
    '#wof-points',
    '#accountCoolPoints',
    '.js-cool-points'
  ].join(',');

  let busy = false;
  let lastAuthoritativeBalance = null;
  let lastAuthoritativeAt = 0;

  function number(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }

  function mirror(points) {
    const value = String(number(points));
    try { localStorage.setItem(STORAGE_KEY, value); } catch (error) {}
    try { localStorage.setItem('coolPoints', value); } catch (error) {}
    try { localStorage.setItem('hyphsworld_points', value); } catch (error) {}
    try { localStorage.setItem('HW_COOL_POINTS', value); } catch (error) {}
    try { localStorage.setItem(GUEST_KEY, value); } catch (error) {}
    try { sessionStorage.setItem(GUEST_KEY, value); } catch (error) {}
    return number(points);
  }

  function readGuestPoints() {
    const sessionValue = number(sessionStorage.getItem(GUEST_KEY));
    const localGuestValue = number(localStorage.getItem(GUEST_KEY));
    const localMirrorValue = number(localStorage.getItem(STORAGE_KEY));
    const legacyValue = number(localStorage.getItem('coolPoints'));
    const legacyValueTwo = number(localStorage.getItem('hyphsworld_points'));
    const legacyValueThree = number(localStorage.getItem('HW_COOL_POINTS'));
    return Math.max(sessionValue, localGuestValue, localMirrorValue, legacyValue, legacyValueTwo, legacyValueThree);
  }

  function render(points, accountBacked, reason) {
    const value = number(points);
    const text = value.toLocaleString();

    document.querySelectorAll(POINT_SELECTOR).forEach((el) => {
      el.textContent = text;
    });

    document.querySelectorAll('[data-points-mode]').forEach((el) => {
      el.textContent = accountBacked ? 'Account saved' : 'Device saved';
    });

    const detail = {
      points: value,
      accountBacked: Boolean(accountBacked),
      reason: reason || 'global_wallet_sync_v3',
      source: reason || 'global_wallet_sync_v3'
    };

    document.dispatchEvent(new CustomEvent('hyph:points-updated', { detail }));
    window.dispatchEvent(new CustomEvent('hw:points-change', { detail }));
  }

  function applyAuthoritativeBalance(points, reason, accountBacked) {
    const value = mirror(points);
    lastAuthoritativeBalance = value;
    lastAuthoritativeAt = Date.now();
    render(value, accountBacked !== false, reason || 'authoritative_wallet_balance');
    return value;
  }

  function hasFreshAuthoritativeBalance() {
    return lastAuthoritativeBalance !== null && Date.now() - lastAuthoritativeAt < AUTHORITATIVE_HOLD_MS;
  }

  function shouldAbsorbSlotEvent(detail) {
    const source = String(detail && (detail.source || detail.reason) || '').toLowerCase();
    if (!source || source.indexOf('slot') === -1) return false;
    if (source.indexOf('slot_wallet_sync') !== -1) return false;
    if (source.indexOf('global_wallet_sync_v3') !== -1) return false;
    if (source.indexOf('fresh_authoritative_wallet_hold') !== -1) return false;
    if (source.indexOf('authoritative_wallet') !== -1) return false;
    return true;
  }

  async function currentUser() {
    if (!window.HWAuth || typeof window.HWAuth.getCurrentUser !== 'function') return null;
    try { return await window.HWAuth.getCurrentUser(); } catch (error) { return null; }
  }

  async function pushAccountPoints(points, reason) {
    if (!window.HWAuth || typeof window.HWAuth.setPoints !== 'function') return number(points);
    try { return number(await window.HWAuth.setPoints(number(points), reason || 'wallet_balance_sync')); } catch (error) { return number(points); }
  }

  async function refresh() {
    if (busy) return null;
    busy = true;
    try {
      if (hasFreshAuthoritativeBalance()) {
        mirror(lastAuthoritativeBalance);
        render(lastAuthoritativeBalance, true, 'fresh_authoritative_wallet_hold');
        return lastAuthoritativeBalance;
      }

      const local = readGuestPoints();
      if (window.HWAuth && typeof window.HWAuth.getPoints === 'function') {
        const user = await currentUser();
        if (user && (user.userId || user.id)) {
          const remote = number(await window.HWAuth.getPoints());
          mirror(remote);
          render(remote, true, 'remote_wallet_truth');
          return remote;
        }
      }

      mirror(local);
      render(local, false, 'device_wallet_display');
      return local;
    } finally {
      busy = false;
    }
  }

  async function add(amount, reason, metadata) {
    const delta = Math.floor(Number(amount || 0));
    if (!delta) return refresh();
    if (busy) return null;
    busy = true;
    try {
      const before = hasFreshAuthoritativeBalance() ? number(lastAuthoritativeBalance) : readGuestPoints();
      const target = Math.max(0, before + delta);
      mirror(target);

      if (window.HWAuth && typeof window.HWAuth.addPoints === 'function') {
        const user = await currentUser();
        if (user && (user.userId || user.id)) {
          let saved = target;
          try {
            if (delta > 0) saved = number(await window.HWAuth.addPoints(delta, reason || 'site_action', metadata || {}));
            else saved = number(await pushAccountPoints(target, reason || 'spend'));
          } catch (error) {}
          const finalBalance = delta > 0 ? Math.max(saved, target) : saved;
          applyAuthoritativeBalance(finalBalance, reason || 'wallet_delta_saved', true);
          return finalBalance;
        }
      }

      render(target, false, reason || 'device_wallet_delta');
      return target;
    } finally {
      busy = false;
    }
  }

  const previous = window.HWPoints || {};
  window.HWPoints = Object.assign({}, previous, {
    __followFixV3: true,
    refresh,
    add,
    spend: (amount, reason, metadata) => add(-Math.abs(Number(amount || 0)), reason || 'spend', metadata || {}),
    sync: (points, reason, options) => applyAuthoritativeBalance(points, reason || 'authoritative_wallet_sync', !(options && options.accountBacked === false)),
    syncServerBalance: (points, reason) => applyAuthoritativeBalance(points, reason || 'server_wallet_balance', true),
    getState: () => ({ points: hasFreshAuthoritativeBalance() ? number(lastAuthoritativeBalance) : readGuestPoints(), source: 'follow_fix_wallet_sync_v3' }),
    get: () => hasFreshAuthoritativeBalance() ? number(lastAuthoritativeBalance) : readGuestPoints()
  });

  document.addEventListener('hyph:points:add', (event) => {
    const detail = event.detail || {};
    add(detail.amount || detail.points || 0, detail.reason || 'lobby_event', detail.metadata || {});
  }, true);

  document.addEventListener('hw:points:add', (event) => {
    const detail = event.detail || {};
    add(detail.amount || detail.points || 0, detail.reason || 'site_event', detail.metadata || {});
  }, true);

  window.addEventListener('hw:points-change', (event) => {
    const detail = event.detail || {};
    if (!shouldAbsorbSlotEvent(detail)) return;
    applyAuthoritativeBalance(detail.points, 'slot_wallet_sync', true);
  });

  document.addEventListener('hyph:points-updated', (event) => {
    const detail = event.detail || {};
    if (!shouldAbsorbSlotEvent(detail)) return;
    applyAuthoritativeBalance(detail.points, 'slot_wallet_sync', true);
  });

  document.addEventListener('DOMContentLoaded', refresh);
  window.addEventListener('load', refresh);
  window.HWPointsFollowFixV2 = null;
  window.HWPointsFollowFixV3 = { refresh, add, sync: window.HWPoints.sync, syncServerBalance: window.HWPoints.syncServerBalance };
})();