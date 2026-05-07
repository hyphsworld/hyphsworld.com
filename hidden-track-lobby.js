(function () {
  'use strict';

  var STORAGE_KEY = 'hyphsworld.hiddenTrack.lobby.v1';
  var LEVEL_CODES = [
    {
      level: 'Level 1',
      code: 'LEVEL1-HYPH-ACCESS',
      title: 'Hidden Track Clue',
      detail: 'Use this code at the Vault scan to test Level 1 access.'
    },
    {
      level: 'Level 2',
      code: 'LEVEL2-DUCK-VAULT',
      title: 'Backroom Code Clue',
      detail: 'This is a deeper clue. Save it before Duck Sauce starts talking.'
    }
  ];

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function saveUnlock(unlock) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        level: unlock.level,
        code: unlock.code,
        title: unlock.title,
        unlockedAt: new Date().toISOString()
      }));
    } catch (error) {}
  }

  function getUnlock() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (error) {
      return null;
    }
  }

  function createLobbyTrigger() {
    if ($('.hidden-track-lobby-card')) return;

    var music = $('#music');
    var target = music || $('main');
    if (!target) return;

    var card = document.createElement('section');
    card.className = 'section-pad hidden-track-lobby-card';
    card.id = 'hidden-track-lobby';
    card.innerHTML = '' +
      '<div class="phone-shell section-card hidden-track-inner">' +
        '<div class="section-title">' +
          '<p class="eyebrow">Hidden Track</p>' +
          '<h2>Lobby Code Drop</h2>' +
          '<p>Find the hidden track in the lobby. Duck Sauce may reveal a Level 1 or Level 2 Vault code.</p>' +
        '</div>' +
        '<div class="hidden-track-console">' +
          '<button class="btn btn-primary" type="button" data-hidden-track-open>Search Hidden Track</button>' +
          '<p class="status-line" data-hidden-track-status>Code not revealed yet.</p>' +
        '</div>' +
      '</div>';

    target.insertAdjacentElement(music ? 'beforebegin' : 'beforeend', card);

    var saved = getUnlock();
    if (saved) showStatus(saved.level + ' code saved: ' + saved.code);

    var button = $('[data-hidden-track-open]', card);
    if (button) {
      button.addEventListener('click', revealCode);
    }
  }

  function showStatus(message) {
    var status = $('[data-hidden-track-status]');
    if (status) status.textContent = message;
  }

  function revealCode() {
    var unlock = LEVEL_CODES[Math.random() > 0.58 ? 1 : 0];
    saveUnlock(unlock);
    showStatus(unlock.level + ' code revealed: ' + unlock.code);
    showModal(unlock);
    updateGlobalRewards(unlock);
  }

  function showModal(unlock) {
    var old = $('.hidden-track-modal');
    if (old) old.remove();

    var modal = document.createElement('div');
    modal.className = 'hidden-track-modal';
    modal.innerHTML = '' +
      '<div class="hidden-track-modal-card">' +
        '<button class="hidden-track-close" type="button" aria-label="Close hidden track code">×</button>' +
        '<span>' + unlock.level + '</span>' +
        '<h3>' + unlock.title + '</h3>' +
        '<p>' + unlock.detail + '</p>' +
        '<strong>' + unlock.code + '</strong>' +
        '<a class="btn btn-primary" href="vault.html">Run Vault Scan</a>' +
      '</div>';

    document.body.appendChild(modal);

    var close = $('.hidden-track-close', modal);
    if (close) close.addEventListener('click', function () { modal.remove(); });
    modal.addEventListener('click', function (event) {
      if (event.target === modal) modal.remove();
    });
  }

  function updateGlobalRewards(unlock) {
    var cards = document.querySelectorAll('.hw-global-reward-card');
    cards.forEach(function (card) {
      var title = card.querySelector('strong');
      var status = card.querySelector('span');
      if (!title || !status) return;

      if (title.textContent === unlock.title || title.textContent.indexOf('Code') !== -1) {
        card.classList.add('is-unlocked');
        status.textContent = 'Unlocked';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createLobbyTrigger);
  } else {
    createLobbyTrigger();
  }
})();
