/* HYPHSWORLD Cool Points Follow Fix
   Supabase profile is source of truth for signed-in users.
   This helper patches the existing points engine without replacing casino files.
*/
(function () {
  'use strict';

  if (window.HWPointsFollowFixV1) return;

  const STORAGE_KEY = 'hyphsworld.coolPoints.total';
  const GUEST_KEY = 'hyphsworld.coolPoints.guestSession';
  let busy = false;

  function number(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }

  function mirror(points) {
    const value = String(number(points));
    try { localStorage.setItem(STORAGE_KEY, value); } catch (error) {}
    try { localStorage.setItem('coolPoints', value); } catch (error) {}
  }

  function guest(points) {
    const value = String(number(points));
    try { sessionStorage.setItem(GUEST_KEY, value); } catch (error) {}
    try { localStorage.setItem(GUEST_KEY, value); } catch (error) {}
  }

  function readGuestPoints() {
    const sessionValue = number(sessionStorage.getItem(GUEST_KEY));
    const localGuestValue = number(localStorage.getItem(GUEST_KEY));
    const localMirrorValue = number(localStorage.getItem(STORAGE_KEY));
    const legacyValue = number(localStorage.getItem('coolPoints'));
    return Math.max(sessionValue, localGuestValue, localMirrorValue, legacyValue);
  }

  function render(points, accountBacked) {
    const value = number(points);
    const text = value.toLocaleString();
    document.querySelectorAll('[data-hw-points], #cool-points, #gateCredits, #wof-points, .js-cool-points, [data-cool-points], #accountCoolPoints').forEach((el) => {
      el.textContent = text;
    });
    document.querySelectorAll('[data-points-mode]').forEach((el) => {
      el.textContent = accountBacked ? 'Account saved' : 'Guest preview';
    });
    document.dispatchEvent(new CustomEvent('hyph:points-updated', {
      detail: { points: value, accountBacked: Boolean(accountBacked), reason: 'global_follow_fix' }
    }));
    window.dispatchEvent(new CustomEvent('hw:points-change', {
      detail: { points: value, accountBacked: Boolean(accountBacked), source: accountBacked ? 'supabase' : 'session_guest' }
    }));
  }

  async function currentUser() {
    if (!window.HWAuth || typeof window.HWAuth.getCurrentUser !== 'function') return null;
    try { return await window.HWAuth.getCurrentUser(); } catch (error) { return null; }
  }

  async function refresh() {
    if (busy) return null;
    busy = true;
    try {
      if (window.HWAuth && typeof window.HWAuth.getPoints === 'function') {
        const user = await currentUser();
        if (user && (user.userId || user.id)) {
          const points = number(await window.HWAuth.getPoints());
          mirror(points);
          render(points, true);
          return points;
        }
      }
      const local = readGuestPoints();
      guest(local);
      mirror(local);
      render(local, false);
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
      if (window.HWAuth && typeof window.HWAuth.addPoints === 'function') {
        const user = await currentUser();
        if (user && (user.userId || user.id)) {
          const saved = number(await window.HWAuth.addPoints(delta, reason || 'site_action', metadata || {}));
          mirror(saved);
          render(saved, true);
          return saved;
        }
      }
      const next = Math.max(0, readGuestPoints() + delta);
      guest(next);
      render(next, false);
      return next;
    } finally {
      busy = false;
    }
  }

  const previous = window.HWPoints || {};
  window.HWPoints = Object.assign({}, previous, {
    __followFixV1: true,
    refresh,
    add,
    spend: (amount, reason, metadata) => add(-Math.abs(Number(amount || 0)), reason || 'spend', metadata || {}),
    getState: () => ({ points: number(localStorage.getItem(STORAGE_KEY)), source: 'follow_fix' })
  });

  document.addEventListener('hyph:points:add', (event) => {
    const detail = event.detail || {};
    add(detail.amount || detail.points || 0, detail.reason || 'lobby_event', detail.metadata || {});
  }, true);

  document.addEventListener('hw:points:add', (event) => {
    const detail = event.detail || {};
    add(detail.amount || detail.points || 0, detail.reason || 'site_event', detail.metadata || {});
  }, true);

  document.addEventListener('DOMContentLoaded', refresh);
  window.addEventListener('load', refresh);
  window.HWPointsFollowFixV1 = { refresh, add };
})();
