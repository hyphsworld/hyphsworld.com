(function () {
  'use strict';

  const ACCESS_KEY = 'hyphsworld_vault_access';
  const ACCESS_TIME_KEY = 'hyphsworld_vault_access_time';
  const TRANSPORT_V6_KEY = 'HW_LEVEL1_TRANSPORT_V6';
  const TRANSPORT_READY_KEY = 'HW_LEVEL1_TRANSPORT_READY';
  const ACCESS_WINDOW = 1000 * 60 * 60 * 4;
  const TRANSPORT_WINDOW = 1000 * 60 * 30;

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
    const level = String(token.level || '').toLowerCase();
    const isLevelOne = level === 'level_1' || level === 'level-one' || route.includes('level-1') || route.includes('quarantine-mixtape');
    const isQuarantineRoute = route.includes('quarantine-mixtape') || route.includes('level-1');

    return isLevelOne && isQuarantineRoute && isFresh(token.grantedAt, TRANSPORT_WINDOW);
  }

  async function hasAccountLevelOneAccess() {
    try {
      if (!window.HWAuth || typeof window.HWAuth.getCurrentUser !== 'function') return false;
      const user = await window.HWAuth.getCurrentUser();
      return Boolean(user && user.level1Unlocked);
    } catch (error) {
      return false;
    }
  }

  function allowPage() {
    const denied = document.getElementById('access-denied');
    const main = document.querySelector('.quarantine-main');

    if (main) main.removeAttribute('aria-hidden');

    if (denied) {
      denied.classList.remove('is-active');
      denied.setAttribute('aria-hidden', 'true');
    }
  }

  function showScanRequiredMessage() {
    const denied = document.getElementById('access-denied');
    const main = document.querySelector('.quarantine-main');

    if (main) main.setAttribute('aria-hidden', 'true');

    if (denied) {
      denied.classList.add('is-active');
      denied.setAttribute('aria-hidden', 'false');
    }
  }

  async function run() {
    if (hasLegacyVaultAccess() || hasLevelOneTransport()) {
      allowPage();
      return;
    }

    if (await hasAccountLevelOneAccess()) {
      allowPage();
      return;
    }

    showScanRequiredMessage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
