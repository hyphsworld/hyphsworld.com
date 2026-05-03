(function () {
  'use strict';

  const msgEl = document.getElementById('message');
  const accountPanel = document.getElementById('accountPanel');
  const loggedOutPanel = document.getElementById('loggedOutPanel');
  const profileForm = document.getElementById('profileForm');
  const logoutBtn = document.getElementById('logoutBtn');
  const coolPointsEl = document.getElementById('accountCoolPoints');

  const displayNameInput = document.getElementById('displayName');
  const duckStatusInput = document.getElementById('duckStatus');
  const buckClearanceInput = document.getElementById('buckClearance');

  const funnyLines = {
    duckFine: [
      'Duck Sauce added a fake $01 convenience fee. Buck immediately rejected it.',
      'Duck tried to fine you for standing near the buttons. Fine dismissed.',
      'Duck Sauce invoice generated: one bag of chips and emotional damages. Denied.'
    ],
    buckAudit: [
      'Buck audit complete: account clean, shoes questionable, confidence approved.',
      'Buck checked the clipboard twice. You are still allowed in the lobby.',
      'Buck says: “No funny business detected. Duck is the only risk factor.”'
    ],
    cleanShoes: [
      'VIP shoe check pending. Duck said the shoes are “almost expensive.”',
      'Shoes refreshed. Buck moved the rope one inch to the left.',
      'Duck sprayed too much cleaner. VIP chances somehow improved.'
    ],
    resetPoints: [
      'Cool Points reset. Duck looked guilty for no reason.',
      'Points wiped clean on this browser. Buck made Duck empty his pockets.',
      'Score reset complete. Duck Sauce said it was character development.'
    ]
  };

  function show(text, type) {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.className = 'message ' + (type || '');
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function getPoints() {
    try {
      if (window.HWPoints) return window.HWPoints.get();
      return Number.parseInt(localStorage.getItem('hyphsworld.coolPoints.total') || '0', 10) || 0;
    } catch (error) {
      return 0;
    }
  }

  function renderPoints() {
    if (coolPointsEl) coolPointsEl.textContent = String(getPoints());
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value || '—';
  }

  function setLoggedOutView() {
    if (accountPanel) accountPanel.hidden = true;
    if (loggedOutPanel) loggedOutPanel.hidden = false;
    if (logoutBtn) logoutBtn.disabled = true;
    renderPoints();
    show('No active ID. Buck says login before touching account management.', 'error');
  }

  async function renderUser() {
    if (!window.HWAuth) {
      show('Auth unavailable. Check auth-client.js.', 'error');
      return;
    }

    const user = await HWAuth.getCurrentUser();
    if (!user) {
      setLoggedOutView();
      return;
    }

    if (accountPanel) accountPanel.hidden = false;
    if (loggedOutPanel) loggedOutPanel.hidden = true;
    if (logoutBtn) logoutBtn.disabled = false;

    if (displayNameInput) displayNameInput.value = user.displayName || '';
    if (duckStatusInput) duckStatusInput.value = user.duckStatus || '';
    if (buckClearanceInput) buckClearanceInput.value = user.buckClearance || 'Lobby clearance only';

    setText('accountEmail', user.email);
    setText('accountName', user.displayName);
    setText('accountDuck', user.duckStatus);
    setText('accountBuck', user.buckClearance);
    renderPoints();
    show('Account loaded. Duck Sauce is pretending he works here.', 'success');
  }

  function bindProfileForm() {
    if (!profileForm) return;
    profileForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const user = await HWAuth.updateProfile({
          displayName: displayNameInput ? displayNameInput.value : '',
          duckStatus: duckStatusInput ? duckStatusInput.value : '',
          buckClearance: buckClearanceInput ? buckClearanceInput.value : ''
        });

        try {
          localStorage.setItem('hyphsworld.playerName', user.displayName || 'Guest');
        } catch (error) {}

        await renderUser();
        if (window.HWPoints) window.HWPoints.render();
        show('Account saved. Buck stamped it. Duck tried to stamp it too but missed the paper.', 'success');
      } catch (error) {
        show(error.message || 'Account save failed.', 'error');
      }
    });
  }

  function bindFunnyManagements() {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-funny-action]');
      if (!button) return;
      const action = button.dataset.funnyAction;

      if (action === 'resetPoints') {
        if (window.HWPoints) window.HWPoints.set(0);
        else {
          try { localStorage.setItem('hyphsworld.coolPoints.total', '0'); } catch (error) {}
        }
        renderPoints();
      }

      const lines = funnyLines[action] || ['Duck Sauce pressed a button. Nothing official happened.'];
      show(pick(lines), action === 'resetPoints' ? 'error' : 'success');
    });
  }

  function bindLogout() {
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', async () => {
      try {
        await HWAuth.signOut();
        show('Logged out. Duck Sauce said “tell them I was professional.” He was not.', 'success');
        window.setTimeout(() => {
          window.location.href = 'index.html';
        }, 550);
      } catch (error) {
        show(error.message || 'Logout failed.', 'error');
      }
    });
  }

  bindProfileForm();
  bindFunnyManagements();
  bindLogout();
  renderUser();
})();
