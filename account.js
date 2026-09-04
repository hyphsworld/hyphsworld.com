(function () {
  'use strict';

  const msgEl = document.getElementById('message');
  const accountPanel = document.getElementById('accountPanel');
  const loggedOutPanel = document.getElementById('loggedOutPanel');
  const profileForm = document.getElementById('profileForm');
  const logoutBtn = document.getElementById('logoutBtn');
  const coolPointsEl = document.getElementById('accountCoolPoints');
  const displayNameInput = document.getElementById('displayName');
  const displayNameStudio = document.getElementById('displayNameStudio');
  const saveDisplayNameBtn = document.getElementById('saveDisplayNameBtn');
  const displayPreviewIcon = document.getElementById('displayPreviewIcon');
  const displayPreviewText = document.getElementById('displayPreviewText');
  const duckStatusInput = document.getElementById('duckStatus');
  const buckClearanceInput = document.getElementById('buckClearance');
  const avatarPreviewIcon = document.getElementById('avatarPreviewIcon');
  const avatarPreviewText = document.getElementById('avatarPreviewText');

  let pointRefreshInFlight = false;
  let lastBadgeRenderAt = 0;
  let savedAccountPoints = 0;
  let avatarSyncTimer = null;
  let displaySyncTimer = null;

  const avatarMap = {
    boy: { icon: '🧢', label: 'Man' },
    girl: { icon: '💅', label: 'Woman' },
    fox: { icon: '🦊', label: 'Fox' },
    lion: { icon: '🦁', label: 'Lion' },
    panda: { icon: '🐼', label: 'Panda' },
    wolf: { icon: '🐺', label: 'Wolf' },
    alien: { icon: '👽', label: 'Alien' },
    robot: { icon: '🤖', label: 'Robot' },
    ghost: { icon: '👻', label: 'Ghost' },
    ninja: { icon: '🥷', label: 'Ninja' },
    crown: { icon: '👑', label: 'Crown' },
    diamond: { icon: '💎', label: 'Diamond' }
  };

  const funnyLines = {
    duckFine: ['Duck Sauce added a fake $01 convenience fee. Buck immediately rejected it.', 'Duck tried to fine you for standing near the buttons. Fine dismissed.', 'Duck Sauce invoice generated: one bag of chips and emotional damages. Denied.'],
    buckAudit: ['Buck audit complete: account clean, shoes questionable, confidence approved.', 'Buck checked the clipboard twice. You are still allowed in the lobby.', 'Buck says: “No funny business detected. Duck is the only risk factor.”'],
    cleanShoes: ['VIP shoe check pending. Duck said the shoes are “almost expensive.”', 'Shoes refreshed. Buck moved the rope one inch to the left.', 'Duck sprayed too much cleaner. VIP chances somehow improved.'],
    protectedPoints: ['Cool Points are locked to the ID. Buck says they only leave if the account gets deleted.', 'Duck tried to reset the points. Buck slapped the clipboard shut. Protected.', 'Points protected. Logout, refresh, private tab: still yours when the ID is active.']
  };

  function cleanAvatarType(type) {
    const key = String(type || '').toLowerCase().trim();
    return avatarMap[key] ? key : 'boy';
  }

  function cleanDisplayName(name) {
    const value = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    return value || 'Guest';
  }

  function avatarIcon(type) { return avatarMap[cleanAvatarType(type)].icon; }
  function avatarLabel(type) { const clean = cleanAvatarType(type); return avatarMap[clean].icon + ' ' + avatarMap[clean].label; }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function number(value) { const parsed = parseInt(value, 10); return Number.isFinite(parsed) && parsed > 0 ? parsed : 0; }

  function show(text, type) {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.className = 'message ' + (type || '');
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value || '—';
  }

  function selectedAvatarType() {
    const checked = document.querySelector('input[name="avatarType"]:checked');
    return cleanAvatarType(checked ? checked.value : localStorage.getItem('hyphsworld.avatarType') || 'boy');
  }

  function displayNameValue() {
    const studioValue = displayNameStudio && displayNameStudio.value ? displayNameStudio.value : '';
    const formValue = displayNameInput && displayNameInput.value ? displayNameInput.value : '';
    return cleanDisplayName(studioValue || formValue || localStorage.getItem('hyphsworld.playerName') || 'Guest');
  }

  function saveLocalIdentity(displayName, avatarType) {
    const clean = cleanAvatarType(avatarType);
    const name = cleanDisplayName(displayName);
    try {
      localStorage.setItem('hyphsworld.playerName', name);
      localStorage.setItem('hyphsworld.avatarType', clean);
      localStorage.setItem('hyphsworld.avatarIcon', avatarIcon(clean));
    } catch (error) {}
  }

  function syncDisplayInputs(name) {
    const clean = cleanDisplayName(name);
    if (displayNameStudio && displayNameStudio.value !== clean) displayNameStudio.value = clean;
    if (displayNameInput && displayNameInput.value !== clean) displayNameInput.value = clean;
    if (displayPreviewText) displayPreviewText.textContent = clean;
    setText('accountName', clean);
    return clean;
  }

  function setAvatarChoice(type) {
    const clean = cleanAvatarType(type);
    document.querySelectorAll('input[name="avatarType"]').forEach((input) => { input.checked = input.value === clean; });
    document.querySelectorAll('[data-avatar-pick]').forEach((button) => { button.classList.toggle('is-active', button.dataset.avatarPick === clean); });
    if (avatarPreviewIcon) avatarPreviewIcon.textContent = avatarIcon(clean);
    if (displayPreviewIcon) displayPreviewIcon.textContent = avatarIcon(clean);
    if (avatarPreviewText) avatarPreviewText.textContent = 'Current icon: ' + avatarMap[clean].label;
    setText('accountAvatar', avatarLabel(clean));
    saveLocalIdentity(displayNameValue(), clean);
  }

  function refreshWidgets() {
    const avatarType = cleanAvatarType(localStorage.getItem('hyphsworld.avatarType') || selectedAvatarType());
    const displayName = displayNameValue();
    const profile = {
      displayName,
      avatarType,
      avatarIcon: avatarIcon(avatarType),
      coolPoints: getPoints()
    };
    syncDisplayInputs(displayName);
    if (window.HWUserWidget) window.HWUserWidget.render(profile);
    window.dispatchEvent(new CustomEvent('hyph:avatar-updated', { detail: profile }));
    window.dispatchEvent(new CustomEvent('hyph:display-name-updated', { detail: profile }));
  }

  function getPoints() {
    try {
      if (savedAccountPoints > 0) return savedAccountPoints;
      if (window.HWPoints && typeof window.HWPoints.get === 'function') {
        const hwPoints = number(window.HWPoints.get());
        if (hwPoints > 0) return hwPoints;
      }
      if (window.HWPoints && typeof window.HWPoints.getState === 'function') {
        const state = window.HWPoints.getState();
        const statePoints = number(state && state.points);
        if (statePoints > 0) return statePoints;
      }
      return number(localStorage.getItem('hyphsworld.coolPoints.total') || localStorage.getItem('coolPoints') || '0');
    } catch (error) {
      return savedAccountPoints || 0;
    }
  }

  async function refreshPoints() {
    if (pointRefreshInFlight) { renderPoints(); renderBadgeSummary(); return getPoints(); }
    pointRefreshInFlight = true;
    try {
      if (window.HWPoints && typeof window.HWPoints.refresh === 'function') await window.HWPoints.refresh();
      if (window.HWAuth && typeof window.HWAuth.getPoints === 'function') {
        const accountPoints = number(await window.HWAuth.getPoints());
        const best = Math.max(accountPoints, getPoints());
        if (best > 0) savedAccountPoints = best;
      }
    } catch (error) {
    } finally {
      pointRefreshInFlight = false;
    }
    renderPoints(); renderBadgeSummary(); return getPoints();
  }

  function renderPoints() { if (coolPointsEl) coolPointsEl.textContent = String(getPoints()); }

  function ensureBadgePanel() {
    let panel = document.getElementById('accountBadgeProgress');
    if (panel) return panel;
    if (!accountPanel) return null;
    panel = document.createElement('section');
    panel.id = 'accountBadgeProgress';
    panel.className = 'account-badge-progress';
    panel.setAttribute('aria-label', 'Cool Points badge progress');
    const anchor = coolPointsEl ? coolPointsEl.closest('.stat,.account-stat,.panel,section,article,div') : null;
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(panel, anchor.nextSibling);
    else accountPanel.appendChild(panel);
    return panel;
  }

  function renderBadgeSummary(force) {
    const now = Date.now();
    if (!force && now - lastBadgeRenderAt < 250) return;
    lastBadgeRenderAt = now;
    const panel = ensureBadgePanel();
    if (!panel || !window.HWCoolBadges || typeof window.HWCoolBadges.state !== 'function') return;
    const state = window.HWCoolBadges.state(getPoints());
    const current = state.current;
    const next = state.next;
    panel.innerHTML = '' + '<div class="account-badge-card"><div><span class="account-badge-kicker">Player Progress</span><h3>' + (current ? current.icon + ' ' + current.name : 'No Badge Yet') + '</h3><p>' + (next ? state.needed.toLocaleString() + ' points until ' + next.name : 'All basic badges unlocked. Chrome legend status online.') + '</p></div><strong>' + state.progress + '%</strong></div><div class="account-badge-track"><span style="width:' + state.progress + '%"></span></div>';
  }

  function setBodyState(state) {
    document.body.classList.remove('is-loading-account', 'is-logged-in', 'is-logged-out');
    document.body.classList.add(state);
  }

  function setLoggedOutView() {
    setBodyState('is-logged-out');
    if (accountPanel) { accountPanel.hidden = true; accountPanel.classList.add('hw-force-hidden'); }
    if (loggedOutPanel) { loggedOutPanel.hidden = false; loggedOutPanel.classList.remove('hw-force-hidden'); }
    if (logoutBtn) logoutBtn.disabled = true;
    savedAccountPoints = 0;
    renderPoints(); renderBadgeSummary(true);
    syncDisplayInputs(localStorage.getItem('hyphsworld.playerName') || 'Guest');
    setAvatarChoice(localStorage.getItem('hyphsworld.avatarType') || 'boy');
    refreshWidgets();
    show('No active ID. You can still change name and avatar. Login to sync across devices.', 'warn');
  }

  function setLoggedInView() {
    setBodyState('is-logged-in');
    if (accountPanel) { accountPanel.hidden = false; accountPanel.classList.remove('hw-force-hidden'); }
    if (loggedOutPanel) { loggedOutPanel.hidden = true; loggedOutPanel.classList.add('hw-force-hidden'); }
    if (logoutBtn) logoutBtn.disabled = false;
  }

  async function renderUser() {
    setBodyState('is-loading-account');
    if (!window.HWAuth) { show('Auth unavailable. Check auth-client.js.', 'error'); setLoggedOutView(); return; }

    const user = await HWAuth.getCurrentUser();
    if (!user) { setLoggedOutView(); return; }

    setLoggedInView();
    const avatarType = cleanAvatarType(localStorage.getItem('hyphsworld.avatarType') || user.avatarType || 'boy');
    const displayName = cleanDisplayName(user.displayName || localStorage.getItem('hyphsworld.playerName') || 'Guest');
    savedAccountPoints = number(user.coolPoints || user.points || user.lifetimePoints || getPoints() || 0);

    syncDisplayInputs(displayName);
    if (duckStatusInput) duckStatusInput.value = user.duckStatus || '';
    if (buckClearanceInput) buckClearanceInput.value = user.buckClearance || 'Lobby clearance only';

    setAvatarChoice(avatarType);
    setText('accountEmail', user.email);
    setText('accountName', displayName);
    setText('accountDuck', user.duckStatus);
    setText('accountBuck', user.buckClearance);

    renderPoints(); await refreshPoints(); refreshWidgets();
    show('Account loaded. Display name and avatar can be changed anytime.', 'success');
  }

  async function syncProfileNow(options) {
    const avatarType = cleanAvatarType(options && options.avatarType || selectedAvatarType());
    const displayName = cleanDisplayName(options && options.displayName || displayNameValue());

    saveLocalIdentity(displayName, avatarType);
    syncDisplayInputs(displayName);
    setAvatarChoice(avatarType);
    refreshWidgets();

    if (!window.HWAuth || typeof window.HWAuth.getCurrentUser !== 'function' || typeof window.HWAuth.updateProfile !== 'function') {
      if (!options || !options.quiet) show('Saved on this device. Login to sync across devices.', 'warn');
      return;
    }

    try {
      const user = await window.HWAuth.getCurrentUser();
      if (!user) {
        if (!options || !options.quiet) show('Saved on this device. Login to sync across devices.', 'warn');
        return;
      }
      await window.HWAuth.updateProfile({
        displayName,
        duckStatus: duckStatusInput ? duckStatusInput.value : user.duckStatus || '',
        buckClearance: buckClearanceInput ? buckClearanceInput.value : user.buckClearance || 'Lobby clearance only',
        avatarType
      });
      if (window.HWEngagementPoints && typeof window.HWEngagementPoints.award === 'function') {
        await window.HWEngagementPoints.award('profile_update', 'identity');
      }
      if (!options || !options.quiet) show('Profile updated and synced to your HYPHSWORLD ID.', 'success');
    } catch (error) {
      if (!options || !options.quiet) show('Saved on this device. Account sync will retry next time you save.', 'warn');
    }
  }

  function queueAvatarSync(avatarType) {
    clearTimeout(avatarSyncTimer);
    avatarSyncTimer = setTimeout(() => syncProfileNow({ avatarType, quiet: true }), 450);
  }

  function queueDisplaySync(displayName) {
    clearTimeout(displaySyncTimer);
    displaySyncTimer = setTimeout(() => syncProfileNow({ displayName, quiet: true }), 650);
  }

  function bindProfileForm() {
    if (!profileForm) return;
    profileForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      await syncProfileNow({ displayName: displayNameValue(), avatarType: selectedAvatarType(), quiet: false });
    });
  }

  function bindDisplayNameStudio() {
    if (displayNameStudio) {
      displayNameStudio.addEventListener('input', () => {
        const name = cleanDisplayName(displayNameStudio.value);
        saveLocalIdentity(name, selectedAvatarType());
        syncDisplayInputs(name);
        refreshWidgets();
        queueDisplaySync(name);
      });
    }

    if (displayNameInput) {
      displayNameInput.addEventListener('input', () => {
        const name = cleanDisplayName(displayNameInput.value);
        saveLocalIdentity(name, selectedAvatarType());
        syncDisplayInputs(name);
        refreshWidgets();
        queueDisplaySync(name);
      });
    }

    if (saveDisplayNameBtn) {
      saveDisplayNameBtn.addEventListener('click', () => {
        syncProfileNow({ displayName: displayNameValue(), avatarType: selectedAvatarType(), quiet: false });
      });
    }
  }

  function bindAvatarPreview() {
    document.addEventListener('click', (event) => {
      const picker = event.target.closest('[data-avatar-pick]');
      if (!picker) return;
      const avatarType = cleanAvatarType(picker.dataset.avatarPick);
      setAvatarChoice(avatarType);
      refreshWidgets();
      show('Avatar changed to ' + avatarMap[avatarType].label + '.', 'success');
      queueAvatarSync(avatarType);
    });

    document.querySelectorAll('input[name="avatarType"]').forEach((input) => {
      input.addEventListener('change', () => {
        const avatarType = selectedAvatarType();
        setAvatarChoice(avatarType);
        refreshWidgets();
        queueAvatarSync(avatarType);
      });
    });
  }

  function bindFunnyManagements() {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-funny-action]');
      if (!button) return;
      const action = button.dataset.funnyAction;
      if (action === 'resetPoints' || action === 'protectedPoints') { show(pick(funnyLines.protectedPoints), 'warn'); renderPoints(); renderBadgeSummary(true); refreshWidgets(); return; }
      show(pick(funnyLines[action] || ['Duck Sauce pressed a button. Nothing official happened.']), 'success');
    });
  }

  function bindLogout() {
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', async () => {
      try {
        await HWAuth.signOut();
        show('Logged out. Cool Points stay saved to the ID.', 'success');
        window.setTimeout(() => { window.location.href = 'index.html'; }, 550);
      } catch (error) {
        show(error.message || 'Logout failed.', 'error');
      }
    });
  }

  document.addEventListener('hyph:points-updated', (event) => { const detail = event.detail || {}; const next = number(detail.points); if (next > 0) savedAccountPoints = next; renderPoints(); renderBadgeSummary(); refreshWidgets(); });
  window.addEventListener('hw:points-change', (event) => { const detail = event.detail || {}; const next = number(detail.points); if (next > 0) savedAccountPoints = next; renderPoints(); renderBadgeSummary(); refreshWidgets(); });

  setBodyState('is-loading-account');
  bindProfileForm();
  bindDisplayNameStudio();
  bindAvatarPreview();
  bindFunnyManagements();
  bindLogout();
  syncDisplayInputs(localStorage.getItem('hyphsworld.playerName') || 'Guest');
  setAvatarChoice(localStorage.getItem('hyphsworld.avatarType') || 'boy');
  renderUser();
})();
