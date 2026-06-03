/* HYPHSWORLD Cool Points Follow Fix
   Highest balance wins: prevents old Supabase/profile values from overwriting newly earned local points.
*/
(function () {
  'use strict';

  if (window.HWPointsFollowFixV2) return;

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
    try { localStorage.setItem('hyphsworld_points', value); } catch (error) {}
    try { localStorage.setItem('HW_COOL_POINTS', value); } catch (error) {}
    try { localStorage.setItem(GUEST_KEY, value); } catch (error) {}
    try { sessionStorage.setItem(GUEST_KEY, value); } catch (error) {}
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

  function render(points, accountBacked) {
    const value = number(points);
    const text = value.toLocaleString();
    document.querySelectorAll('[data-hw-points], #cool-points, #gateCredits, #wof-points, .js-cool-points, [data-cool-points], #accountCoolPoints').forEach((el) => {
      el.textContent = text;
    });
    document.querySelectorAll('[data-points-mode]').forEach((el) => {
      el.textContent = accountBacked ? 'Account saved' : 'Device saved';
    });
    document.dispatchEvent(new CustomEvent('hyph:points-updated', {
      detail: { points: value, accountBacked: Boolean(accountBacked), reason: 'global_follow_fix_highest_wins' }
    }));
    window.dispatchEvent(new CustomEvent('hw:points-change', {
      detail: { points: value, accountBacked: Boolean(accountBacked), source: accountBacked ? 'supabase_highest_wins' : 'device_saved' }
    }));
  }

  async function currentUser() {
    if (!window.HWAuth || typeof window.HWAuth.getCurrentUser !== 'function') return null;
    try { return await window.HWAuth.getCurrentUser(); } catch (error) { return null; }
  }

  async function pushAccountPoints(points, reason) {
    if (!window.HWAuth || typeof window.HWAuth.setPoints !== 'function') return number(points);
    try { return number(await window.HWAuth.setPoints(number(points), reason || 'highest_balance_recovery')); } catch (error) { return number(points); }
  }

  async function refresh() {
    if (busy) return null;
    busy = true;
    try {
      const local = readGuestPoints();
      if (window.HWAuth && typeof window.HWAuth.getPoints === 'function') {
        const user = await currentUser();
        if (user && (user.userId || user.id)) {
          const remote = number(await window.HWAuth.getPoints());
          const best = Math.max(remote, local);
          if (best > remote) await pushAccountPoints(best, 'recover_higher_local_points');
          mirror(best);
          render(best, true);
          return best;
        }
      }
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
      const localBefore = readGuestPoints();
      const target = Math.max(0, localBefore + delta);
      mirror(target);

      if (window.HWAuth && typeof window.HWAuth.addPoints === 'function') {
        const user = await currentUser();
        if (user && (user.userId || user.id)) {
          let saved = 0;
          try { saved = number(await window.HWAuth.addPoints(delta, reason || 'site_action', metadata || {})); } catch (error) {}
          const best = Math.max(saved, target, readGuestPoints());
          if (best > saved) await pushAccountPoints(best, reason || 'site_action_recovery');
          mirror(best);
          render(best, true);
          return best;
        }
      }

      render(target, false);
      return target;
    } finally {
      busy = false;
    }
  }

  const previous = window.HWPoints || {};
  window.HWPoints = Object.assign({}, previous, {
    __followFixV2: true,
    refresh,
    add,
    spend: (amount, reason, metadata) => add(-Math.abs(Number(amount || 0)), reason || 'spend', metadata || {}),
    getState: () => ({ points: readGuestPoints(), source: 'follow_fix_highest_wins' }),
    get: () => readGuestPoints()
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
  window.HWPointsFollowFixV2 = { refresh, add };
})();
