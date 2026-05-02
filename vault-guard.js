(function () {
  'use strict';

  const ACCESS_KEY = 'hyphsworld_vault_access';
  const ACCESS_TIME_KEY = 'hyphsworld_vault_access_time';
  const TRANSPORT_V6_KEY = 'HW_LEVEL1_TRANSPORT_V6';
  const TRANSPORT_READY_KEY = 'HW_LEVEL1_TRANSPORT_READY';
  const ACCESS_WINDOW = 1000 * 60 * 60 * 4;
  const TRANSPORT_WINDOW = 1000 * 60 * 30;

  function pageName() {
    return location.pathname.split('/').pop() || 'vault.html';
  }

  function isFresh(timeValue, windowMs) {
    const time = Number(timeValue || 0);
    return Number.isFinite(time) && time > 0 && Date.now() - time >= 0 && Date.now() - time < windowMs;
  }

  function readJsonSession(key) {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function hasLegacyVaultAccess() {
    try {
      return sessionStorage.getItem(ACCESS_KEY) === 'granted' && isFresh(sessionStorage.getItem(ACCESS_TIME_KEY), ACCESS_WINDOW);
    } catch (error) {
      return false;
    }
  }

  function hasLevelOneTransport() {
    const token = readJsonSession(TRANSPORT_V6_KEY) || readJsonSession(TRANSPORT_READY_KEY);
    if (!token) return false;

    const route = String(token.route || token.href || token.destination || '').toLowerCase();
    const isLevelOne = token.level === 'level-one' || route.includes('level-1') || route.includes('quarantine-mixtape');
    const isQuarantineRoute = route.includes('quarantine-mixtape') || route.includes('level-1');

    return isLevelOne && isQuarantineRoute && isFresh(token.grantedAt, TRANSPORT_WINDOW);
  }

  async function hasSession() {
    if (!window.HWAuth || typeof window.HWAuth.getSession !== 'function') return false;
    try {
      const session = await window.HWAuth.getSession();
      return !!(session && session.userId);
    } catch (error) {
      return false;
    }
  }

  (async function run() {
    const current = pageName();

    if (hasLegacyVaultAccess() || hasLevelOneTransport()) {
      return;
    }

    const authed = await hasSession();
    if (!authed) {
      location.replace('login.html?from=' + encodeURIComponent(current));
      return;
    }

    location.replace('login.html?from=' + encodeURIComponent(current));
  })();
})();
