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
  const avatarBoyInput = document.getElementById('avatarBoy');
  const avatarGirlInput = document.getElementById('avatarGirl');

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
    protectedPoints: [
      'Cool Points are locked to the ID. Buck says they only leave if the account gets deleted.',
      'Duck tried to reset the points. Buck slapped the clipboard shut. Protected.',
      'Points protected. Logout, refresh, private tab — still yours when the ID is active.'
    ]
  };

  function avatarIcon(type) {
    return String(type || '').toLowerCase() === 'girl' ? '💅' : '🧢';
  }

  function avatarLabel(type) {
    const clean = String(type || '').toLowerCase() === 'girl' ? 'girl' : 'boy';
    return avatarIcon(clean) + ' ' + clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  function selectedAvatarType() {
    return avatarGirlInput && avatarGirlInput.checked ? 'girl' : 'boy';
  }

  function setAvatarChoice(type) {
    const clean = String(type || '').toLowerCase() === 'girl' ? 'girl' : 'boy';
    if (avatarBoyInput) avatarBoyInput.checked = clean === 'boy';
    if (avatarGirlInput) avatarGirlInput.checked = clean === 'girl';
    setText('accountAvatar', avatarLabel(clean));
  }

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

  function setBodyState(state) {
    document.body.classList.remove('is-loading-account', 'is-logged-in', 'is-logged-out');
    document.body.classList.add(state);
  }

  function setLoggedOutView() {
    setBodyState('is-logged-out');
    if (accountPanel) {
      accountPanel.hidden = true;
      accountPanel.classList.add('hw-force-hidden');
    }
    if (loggedOutPanel) {
      loggedOutPanel.hidden = false;
      loggedOutPanel.classList.remove('hw-force-hidden');
    }
    if (logoutBtn) logoutBtn.disabled = true;
    renderPoints();
    setAvatarChoice(localStorage.getItem('hyphsworld.avatarType') || 'boy');
    if (window.HWUserWidget) window.HWUserWidget.refresh();
    show('No active ID. Buck says login before touching account management.', 'error');
  }

  function setLoggedInView() {
    setBodyState('is-logged-in');
    if (accountPanel) {
      accountPanel.hidden = false;
      accountPanel.classList.remove('hw-force-hidden');
    }
    if (loggedOutPanel) {
      loggedOutPanel.hidden = true;
      loggedOutPanel.classList.add('hw-force-hidden');
    }
    if (logoutBtn) logoutBtn.disabled = false;
  }

  async function renderUser() {
    setBodyState('is-loading-account');

    if (!window.HWAuth) {
      show('Auth unavailable. Check auth-client.js.', 'error');
      setLoggedOutView();
      return;
    }

    try {
      if (window.HWPoints && typeof window.HWPoints.refresh === 'function') {
        await window.HWPoints.refresh();
      }
    } catch (error) {}

    const user = await HWAuth.getCurrentUser();
    if (!user) {
      setLoggedOutView();
      return;
    }

    setLoggedInView();

    if (displayNameInput) displayNameInput.value = user.displayName || '';
    if (duckStatusInput) duckStatusInput.value = user.duckStatus || '';
    if (buckClearanceInput) buckClearanceInput.value = user.buckClearance || 'Lobby clearance only';
    setAvatarChoice(user.avatarType || 'boy');

    setText('accountEmail', user.email);
    setText('accountName', user.displayName);
    setText('accountDuck', user.duckStatus);
    setText('accountBuck', user.buckClearance);
    renderPoints();
    if (window.HWUserWidget) window.HWUserWidget.refresh();
    show('Account loaded. Cool Points are locked to this ID.', 'success');
  }

  function bindProfileForm() {
    if (!profileForm) return;
    profileForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const user = await HWAuth.updateProfile({
          displayName: displayNameInput ? displayNameInput.value : '',
          duckStatus: duckStatusInput ? duckStatusInput.value : '',
          buckClearance: buckClearanceInput ? buckClearanceInput.value : '',
          avatarType: selectedAvatarType()
        });

        try {
          localStorage.setItem('hyphsworld.playerName', user.displayName || 'Guest');
          localStorage.setItem('hyphsworld.avatarType', user.avatarType || selectedAvatarType());
          localStorage.setItem('hyphsworld.avatarIcon', user.avatarIcon || avatarIcon(selectedAvatarType()));
        } catch (error) {}

        await renderUser();
        if (window.HWPoints) window.HWPoints.render();
        if (window.HWUserWidget) window.HWUserWidget.refresh();
        show('Account saved. Buck stamped it. Points stayed protected.', 'success');
      } catch (error) {
        show(error.message || 'Account save failed.', 'error');
      }
    });
  }

  function bindAvatarPreview() {
    [avatarBoyInput, avatarGirlInput].forEach((input) => {
      if (!input) return;
      input.addEventListener('change', () => {
        setAvatarChoice(selectedAvatarType());
        if (window.HWUserWidget) {
          window.HWUserWidget.render({
            displayName: displayNameInput ? displayNameInput.value || 'Guest' : 'Guest',
            avatarType: selectedAvatarType(),
            avatarIcon: avatarIcon(selectedAvatarType()),
            coolPoints: getPoints()
          });
        }
      });
    });
  }

  function bindFunnyManagements() {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-funny-action]');
      if (!button) return;
      const action = button.dataset.funnyAction;

      if (action === 'resetPoints' || action === 'protectedPoints') {
        show(pick(funnyLines.protectedPoints), 'warn');
        renderPoints();
        if (window.HWUserWidget) window.HWUserWidget.refresh();
        return;
      }

      const lines = funnyLines[action] || ['Duck Sauce pressed a button. Nothing official happened.'];
      show(pick(lines), 'success');
    });
  }

  function bindLogout() {
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', async () => {
      try {
        await HWAuth.signOut();
        show('Logged out. Cool Points stay saved to the ID.', 'success');
        window.setTimeout(() => {
          window.location.href = 'index.html';
        }, 550);
      } catch (error) {
        show(error.message || 'Logout failed.', 'error');
      }
    });
  }

  setBodyState('is-loading-account');
  bindProfileForm();
  bindAvatarPreview();
  bindFunnyManagements();
  bindLogout();
  renderUser();
})();
