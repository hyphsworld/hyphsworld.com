/*
  HYPHSWORLD Homepage Menu + Login Display
  Clean route helper and account chip renderer.
*/
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function cleanText(item) {
    return (item && item.textContent || '').trim().toLowerCase();
  }

  function readLocal(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch (error) { return fallback; }
  }

  function number(value) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function avatarIcon(type) {
    return String(type || '').toLowerCase() === 'girl' ? '💅' : '🧢';
  }

  function getPoints() {
    try {
      if (window.HWPoints && typeof window.HWPoints.get === 'function') return number(window.HWPoints.get());
      if (window.HWPoints && typeof window.HWPoints.getState === 'function') {
        const state = window.HWPoints.getState();
        return number(state && state.points);
      }
    } catch (error) {}

    const keys = ['hyphsworld.coolPoints.total', 'hyphsworld.coolPoints.guestSession', 'coolPoints', 'hyphsworld_points', 'HW_COOL_POINTS'];
    return keys.reduce(function (max, key) { return Math.max(max, number(readLocal(key, '0'))); }, 0);
  }

  function restoreMerchLinks() {
    [document.querySelector('.main-nav'), document.getElementById('mobile-menu-panel')].forEach(function (nav) {
      if (!nav) return;
      const hasMerch = nav.querySelector('a[href="shop.html"], a[href="merch.html"], a[href="/shop.html"], a[href="/merch.html"]');
      if (hasMerch) return;

      const link = document.createElement('a');
      link.href = 'shop.html';
      link.textContent = 'Merch';
      link.className = 'nav-link merch-nav-link';
      nav.appendChild(link);
    });
  }

  function normalizeCasinoLinks() {
    document.querySelectorAll('a, button').forEach(function (item) {
      const label = cleanText(item);
      const href = item.getAttribute && (item.getAttribute('href') || '');
      const shouldCasino = label === 'games' || label === 'game' || label.includes('earn arcade') || label.includes('casino') || href === 'games.html';
      if (!shouldCasino) return;

      if (item.tagName && item.tagName.toLowerCase() === 'a') item.setAttribute('href', 'games.html');
      if (label === 'games' || label === 'game' || label.includes('earn arcade')) item.textContent = '🎰 Casino';
    });
  }

  function directO1Links() {
    document.querySelectorAll('a[href="#o1-show"]').forEach(function (link) {
      link.setAttribute('href', '#top');
      if (cleanText(link).includes('watch')) link.textContent = 'Watch 01 Show';
    });
  }

  function cleanLobbyRoutes() {
    restoreMerchLinks();
    normalizeCasinoLinks();
    directO1Links();
  }

  function userNameFromSession(session, user) {
    return (
      user && (user.displayName || user.username || user.name) ||
      readLocal('hyphsworld.playerName', '') ||
      session && session.email && String(session.email).split('@')[0] ||
      'HYPHSWORLD ID'
    );
  }

  function renderStatusChip(options) {
    const statusEl = document.getElementById('login-status');
    if (!statusEl) return;

    const signedIn = Boolean(options && options.signedIn);
    const name = options && options.name || 'Guest';
    const email = options && options.email || '';
    const avatar = options && options.avatar || '🧢';
    const points = getPoints();

    statusEl.className = 'hw-login-chip ' + (signedIn ? 'is-signed-in' : 'is-guest');
    statusEl.innerHTML = signedIn
      ? '<span class="hw-login-avatar">' + avatar + '</span><span class="hw-login-copy"><strong>' + escapeHtml(name) + '</strong><small>' + points.toLocaleString() + ' CP' + (email ? ' • ' + escapeHtml(email) : '') + '</small></span>'
      : '<span class="hw-login-avatar">🧢</span><span class="hw-login-copy"><strong>Guest Mode</strong><small>Create ID to sync Cool Points</small></span>';
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function setAccountLinks(label, href) {
    const authLink = document.getElementById('auth-link');
    const navAccountLink = document.getElementById('nav-account-link');
    const mobileNavAccountLink = document.getElementById('mobile-nav-account-link');

    if (authLink) { authLink.textContent = label; authLink.href = href; }
    if (navAccountLink) { navAccountLink.textContent = label === 'Manage ID' ? 'Manage ID' : 'Create ID'; navAccountLink.href = href; }
    if (mobileNavAccountLink) { mobileNavAccountLink.textContent = label === 'Manage ID' ? 'Manage ID' : 'Create ID'; mobileNavAccountLink.href = href; }

    cleanLobbyRoutes();
  }

  function injectLoginStyles() {
    if (document.getElementById('hwLoginChipStyles')) return;
    const style = document.createElement('style');
    style.id = 'hwLoginChipStyles';
    style.textContent = '.hw-login-chip{display:inline-flex;align-items:center;justify-content:center;gap:10px;max-width:min(92vw,520px);padding:9px 12px;border-radius:999px;border:1px solid rgba(57,255,122,.34);background:rgba(0,0,0,.56);box-shadow:0 0 22px rgba(57,255,122,.14);color:#fff;text-align:left;vertical-align:middle}.hw-login-avatar{display:grid;place-items:center;width:34px;height:34px;border-radius:999px;background:linear-gradient(135deg,#39ff7a,#1ffcff,#ff4fd8);color:#050505;font-weight:1000}.hw-login-copy{display:grid;gap:2px}.hw-login-copy strong{font-size:.88rem;line-height:1;color:#fff}.hw-login-copy small{font-size:.72rem;line-height:1.2;color:#a9ff87;font-weight:800}.hw-login-chip.is-guest{border-color:rgba(255,228,92,.34);box-shadow:0 0 18px rgba(255,228,92,.12)}@media(max-width:640px){.hw-login-chip{border-radius:18px}.hw-login-copy small{max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}';
    document.head.appendChild(style);
  }

  async function updateLoginDisplay() {
    injectLoginStyles();

    const logoutButton = document.getElementById('home-logout');

    if (!window.HWAuth) {
      renderStatusChip({ signedIn: false });
      setAccountLinks('Create ID / Login', 'auth.html');
      if (logoutButton) logoutButton.hidden = true;
      return;
    }

    let session = null;
    let user = null;

    try { session = await HWAuth.getSession(); } catch (error) {}
    try { if (session && window.HWAuth.getCurrentUser) user = await HWAuth.getCurrentUser(); } catch (error) {}

    if (session && session.email) {
      const name = userNameFromSession(session, user);
      const avatar = avatarIcon(user && user.avatarType || readLocal('hyphsworld.avatarType', 'boy'));
      renderStatusChip({ signedIn: true, name, email: session.email, avatar });
      setAccountLinks('Manage ID', 'account.html');
      if (logoutButton) logoutButton.hidden = false;
    } else {
      renderStatusChip({ signedIn: false });
      setAccountLinks('Create ID / Login', 'auth.html');
      if (logoutButton) logoutButton.hidden = true;
    }
  }

  function bindMenu() {
    const year = document.getElementById('year');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const menuPanel = document.getElementById('mobile-menu-panel');
    const logoutButton = document.getElementById('home-logout');

    if (year) year.textContent = new Date().getFullYear();

    if (menuToggle && menuPanel) {
      menuToggle.addEventListener('click', function () {
        const open = menuPanel.classList.toggle('is-open');
        menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        menuToggle.textContent = open ? 'Menu ▲' : 'Menu ▼';
        cleanLobbyRoutes();
      });
    }

    if (logoutButton) {
      logoutButton.addEventListener('click', async function () {
        try { if (window.HWAuth) await HWAuth.signOut(); } catch (error) {}
        renderStatusChip({ signedIn: false });
        logoutButton.hidden = true;
        setAccountLinks('Create ID / Login', 'auth.html');
      });
    }
  }

  ready(function () {
    cleanLobbyRoutes();
    bindMenu();
    updateLoginDisplay();

    window.addEventListener('hw:points-change', updateLoginDisplay);
    document.addEventListener('hyph:points-updated', updateLoginDisplay);
    window.addEventListener('storage', updateLoginDisplay);
    window.addEventListener('focus', updateLoginDisplay);
  });
})();
