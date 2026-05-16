/* HYPHSWORLD casino access guard: no direct URL access. Casino must be earned. */
(function () {
  'use strict';

  var REDIRECT_URL = 'vault.html?casino=locked';
  var UNLOCK_KEYS = [
    'HW_CASINO_UNLOCKED',
    'HYPHSWORLD_CASINO_UNLOCKED',
    'hyphsworld.casino.unlocked',
    'vault_casino_unlocked'
  ];

  var ALLOW_PARAMS = ['casino_preview', 'casino_test'];

  function read(key) {
    try {
      return localStorage.getItem(key) || sessionStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function hasUnlockValue(value) {
    return value === 'true' || value === '1' || value === 'earned' || value === 'unlocked';
  }

  function hasEarnedCasino() {
    return UNLOCK_KEYS.some(function (key) {
      return hasUnlockValue(read(key));
    });
  }

  function hasPreviewBypass() {
    var params = new URLSearchParams(window.location.search);
    return ALLOW_PARAMS.some(function (key) {
      return hasUnlockValue(params.get(key));
    });
  }

  function allowAccess() {
    window.__HYPHSWORLD_CASINO_ACCESS_GRANTED__ = true;
    document.documentElement.classList.add('casino-access-granted');
  }

  function denyAccess() {
    window.__HYPHSWORLD_CASINO_ACCESS_GRANTED__ = false;
    document.documentElement.classList.add('casino-access-denied');
    window.location.replace(REDIRECT_URL);
  }

  async function checkAccountAccess() {
    try {
      if (!window.HWAuth || typeof window.HWAuth.getCurrentUser !== 'function') return false;
      var user = await window.HWAuth.getCurrentUser();
      if (!user) return false;
      return Boolean(user.level1Unlocked || user.level2Unlocked || user.casinoUnlocked || user.casino_unlocked);
    } catch (error) {
      return false;
    }
  }

  if (hasPreviewBypass() || hasEarnedCasino()) {
    allowAccess();
    return;
  }

  document.documentElement.classList.add('casino-access-checking');

  window.addEventListener('DOMContentLoaded', function () {
    checkAccountAccess().then(function (hasAccountAccess) {
      document.documentElement.classList.remove('casino-access-checking');
      if (hasAccountAccess) allowAccess();
      else denyAccess();
    });
  });
})();
