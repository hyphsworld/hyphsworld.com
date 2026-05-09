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

  function read(key) {
    try {
      return localStorage.getItem(key) || sessionStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function hasEarnedCasino() {
    return UNLOCK_KEYS.some(function (key) {
      var value = read(key);
      return value === 'true' || value === '1' || value === 'earned' || value === 'unlocked';
    });
  }

  if (!hasEarnedCasino()) {
    window.location.replace(REDIRECT_URL);
  }
})();
