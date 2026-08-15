/*
  HYPHSWORLD Points Core
  One clean Cool Points system for the whole site.

  Truth table:
  - Logged in: Supabase profile is the real wallet.
  - Logged out: no real earning or spending.
  - Browser storage: display/recovery cache only, never allowed to lower an account.
  - First login after old local points: higher cached balance can recover upward once.
*/
(function () {
  'use strict';

  if (window.HWPoints && window.HWPoints.__hyphsPointsCoreV4) return;

  const VERSION = 'hyphs-points-core-v4-20260613';
  const CACHE_KEY = 'hyphsworld.coolPoints.total';
  const PROFILE_CACHE_KEY = 'hyphsworld.coolPoints.profile';
  const LEGACY_KEYS = [
    'coolPoints',
    'hyphsworld_points',
    'HW_COOL_POINTS',
    'hyphsCoolPoints',
    'hwCoolPoints',
    'hyphsworldPoints',
    'hyphsworld.coolpoints',
    'hyphsworld.coolPoints.guestSession'
  ];
  const POINT_SELECTOR = [
    '[data-hw-points]',
    '[data-cool-points]',
    '.js-cool-points',
    '#cool-points',
    '#accountCoolPoints',
    '#gateCredits',
    '#gateCreditsReadout',
    '#casinoCoolPoints',
    '#wof-points'
  ].join(',');

  const state = {
    ready: false,
    busy: false,
    accountBacked: false,
    loginRequired: true,
    user: null,
    profile: null,
    points: 0,
    lifetimePoints: 0,
    displayName: 'Guest',
    avatarIcon: '🧢',
    rankTitle: 'Login Required',
    source: 'boot',
    lastError: null,
    version: VERSION
  };

  let refreshTimer = null;
  let queue = Promise.resolve();
  let lastEventStamp = '';

  function toNumber(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (error) { return null; }
  }

  function safeSet(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (error) {}
  }

  function readCachedBalance() {
    const values = [safeGet(CACHE_KEY)].concat(LEGACY_KEYS.map(safeGet));
    return values.reduce((highest, value) => Math.max(highest, toNumber(value)), 0);
  }

  function writeCachedBalance(points) {
    const next = toNumber(points);
    safeSet(CACHE_KEY, next);
    LEGACY_KEYS.forEach((key) => safeSet(key, next));
    try { sessionStorage.setItem('hyphsworld.coolPoints.guestSession', String(next)); } catch (error) {}
    return next;
  }

  function readCachedProfile() {
    try { return JSON.parse(safeGet(PROFILE_CACHE_KEY) || '{}') || {}; } catch (error) { return {}; }
  }

  function writeCachedProfile() {
    const profile = {
      accountBacked: state.accountBacked,
      userId: state.user?.userId || state.user?.id || '',
      email: state.user?.email || '',
      displayName: state.displayName || 'Guest',
      avatarIcon: state.avatarIcon || '🧢',
      points: toNumber(state.points),
      lifetimePoints: toNumber(state.lifetimePoints),
      source: state.source,
      updatedAt: new Date().toISOString(),
      version: VERSION
    };
    try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile)); } catch (error) {}
    return profile;
  }

  function snapshot() {
    return {
      ready: state.ready,
      busy: state.busy,
      accountBacked: state.accountBacked,
      loginRequired: state.loginRequired,
      user: state.user,
      profile: state.profile,
      points: toNumber(state.points),
      lifetimePoints: toNumber(state.lifetimePoints),
      displayName: state.displayName,
      avatarIcon: state.avatarIcon,
      rankTitle: state.rankTitle,
      source: state.source,
      lastError: state.lastError,
      version: VERSION
    };
  }

  function toast(message) {
    const text = String(message || '').trim();
    if (!text) return;

    let el = document.getElementById('hw-toast') || document.getElementById('casinoToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'hw-toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }

    if (!document.getElementById('hwPointsToastStyle')) {
      const style = document.createElement('style');
      style.id = 'hwPointsToastStyle';
      style.textContent = '#hw-toast{position:fixed;left:50%;bottom:92px;z-index:100000;transform:translateX(-50%) translateY(12px);max-width:min(440px,calc(100vw - 28px));padding:12px 14px;border-radius:18px;background:linear-gradient(135deg,#39ff7a,#ffe45c);color:#050505;font-family:Arial,Helvetica,sans-serif;font-weight:1000;box-shadow:0 20px 60px rgba(0,0,0,.42);opacity:0;pointer-events:none;transition:.18s ease}#hw-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}';
      document.head.appendChild(style);
    }

    el.textContent = text;
    el.classList.add('show');
    clearTimeout(window.__hwToastTimer);
    window.__hwToastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  function emit(reason) {
    const detail = snapshot();
    detail.reason = reason || state.source || 'change';

    const stamp = [detail.points, detail.accountBacked, detail.reason, detail.displayName, detail.busy].join('|');
    if (stamp === lastEventStamp && detail.reason === 'render') return;
    lastEventStamp = stamp;

    try { window.dispatchEvent(new CustomEvent('hw:points-change', { detail })); } catch (error) {}
    try { window.dispatchEvent(new CustomEvent('hw:points-ready', { detail })); } catch (error) {}
    try { document.dispatchEvent(new CustomEvent('hyph:points-updated', { detail })); } catch (error) {}
  }

  function ensureHudStyle() {
    if (document.getElementById('hwGlobalPointsHudStyles')) return;
    const style = document.createElement('style');
    style.id = 'hwGlobalPointsHudStyles';
    style.textContent = [
      '#hwGlobalPointsHud{position:fixed;right:14px;bottom:14px;z-index:9999;display:flex;align-items:center;gap:10px;max-width:calc(100vw - 28px);padding:10px 12px;border:1px solid rgba(69,255,54,.32);border-radius:18px;background:rgba(0,0,0,.78);backdrop-filter:blur(12px);box-shadow:0 0 24px rgba(69,255,54,.16),0 12px 32px rgba(0,0,0,.36);color:#fff;font-family:Arial,Helvetica,sans-serif}',
      '.hwgp-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:999px;background:linear-gradient(135deg,#39ff7a,#1ffcff,#ff4fd8);color:#050505;font-weight:1000}',
      '#hwGlobalPointsHud strong{display:block;font-size:1.05rem;color:#39ff7a;line-height:1}',
      '#hwGlobalPointsHud span{display:block;font-size:.68rem;text-transform:uppercase;letter-spacing:.08em;color:#d8ffe5;font-weight:900}',
      '#hwGlobalPointsHud small{padding:5px 8px;border-radius:999px;background:rgba(255,255,255,.08);color:#ffe45c;font-size:.66rem;font-weight:900;white-space:nowrap}',
      '#hwGlobalPointsHud.is-live{border-color:rgba(31,252,255,.38);box-shadow:0 0 24px rgba(31,252,255,.16),0 12px 32px rgba(0,0,0,.36)}',
      '@media(max-width:640px){#hwGlobalPointsHud{left:10px;right:10px;bottom:10px;justify-content:center;border-radius:16px;padding:9px 10px}#hwGlobalPointsHud small{display:none}}'
    ].join('');
    document.head.appendChild(style);
  }

  function ensureHud() {
    ensureHudStyle();
    let hud = document.getElementById('hwGlobalPointsHud');
    if (hud) return hud;

    hud = document.createElement('aside');
    hud.id = 'hwGlobalPointsHud';
    hud.innerHTML = '<div class="hwgp-icon" data-hw-avatar>🧢</div><div><strong data-hw-points>0</strong><span>Cool Points</span></div><small data-hw-rank>Login Required</small>';
    document.body.appendChild(hud);
    return hud;
  }

  function render(reason) {
    const pointsText = toNumber(state.points).toLocaleString();
    const modeText = state.accountBacked ? 'Account saved' : 'Login required';
    const userStateText = state.accountBacked ? 'LIVE ID' : 'LOGIN REQUIRED';
    const rankText = state.accountBacked ? (state.rankTitle || 'Lobby Rookie') : 'Login Required';
    const avatar = state.avatarIcon || '🧢';

    document.querySelectorAll(POINT_SELECTOR).forEach((el) => { el.textContent = pointsText; });
    document.querySelectorAll('[data-points-mode]').forEach((el) => { el.textContent = modeText; });
    document.querySelectorAll('[data-hw-user-state]').forEach((el) => { el.textContent = userStateText; });
    document.querySelectorAll('[data-hw-rank]').forEach((el) => { el.textContent = rankText; });
    document.querySelectorAll('[data-hw-avatar]').forEach((el) => { el.textContent = avatar; });
    document.querySelectorAll('#hw-player-name,[data-player-name]').forEach((el) => { el.textContent = state.displayName || 'Guest'; });

    const loginLink = document.getElementById('hw-login-link');
    if (loginLink && state.accountBacked && state.displayName) loginLink.textContent = state.displayName;

    const hud = ensureHud();
    const hudAvatar = hud.querySelector('[data-hw-avatar]');
    const hudPoints = hud.querySelector('[data-hw-points]');
    const hudRank = hud.querySelector('[data-hw-rank]');
    if (hudAvatar) hudAvatar.textContent = avatar;
    if (hudPoints) hudPoints.textContent = pointsText;
    if (hudRank) hudRank.textContent = rankText;
    hud.classList.toggle('is-live', Boolean(state.accountBacked));

    writeCachedProfile();
    emit(reason || 'render');
  }

  function applyLoggedOut(reason) {
    state.ready = true;
    state.busy = false;
    state.accountBacked = false;
    state.loginRequired = true;
    state.user = null;
    state.profile = null;
    state.points = 0;
    state.lifetimePoints = 0;
    state.displayName = 'Guest';
    state.avatarIcon = '🧢';
    state.rankTitle = 'Login Required';
    state.source = reason || 'login_required';
    render(state.source);
    return snapshot();
  }

  function applyAccount(user, reason) {
    const profile = user || {};
    const accountPoints = toNumber(profile.coolPoints ?? profile.points ?? 0);
    const lifetimePoints = Math.max(toNumber(profile.lifetimePoints ?? profile.lifetime_points), accountPoints);

    state.ready = true;
    state.busy = false;
    state.accountBacked = true;
    state.loginRequired = false;
    state.user = user || null;
    state.profile = profile;
    state.points = accountPoints;
    state.lifetimePoints = lifetimePoints;
    state.displayName = profile.displayName || profile.display_name || profile.email?.split('@')[0] || 'HYPHSWORLD ID';
    state.avatarIcon = profile.avatarIcon || profile.avatar_icon || '🧢';
    state.rankTitle = profile.rankTitle || profile.rank_title || 'Lobby Rookie';
    state.source = reason || 'account_synced';
    state.lastError = null;

    writeCachedBalance(accountPoints);
    render(state.source);
    return snapshot();
  }

  async function getAccountUser() {
    if (!window.HWAuth || typeof window.HWAuth.getCurrentUser !== 'function') return null;
    return window.HWAuth.getCurrentUser();
  }

  async function refresh(reason) {
    if (state.busy && reason !== 'force') return snapshot();
    state.busy = true;

    try {
      const user = await getAccountUser();
      if (!user) return applyLoggedOut(reason || 'login_required');

      const cached = readCachedBalance();
      const accountPoints = toNumber(user.coolPoints ?? user.points ?? 0);
      const lifetimePoints = toNumber(user.lifetimePoints ?? user.lifetime_points ?? accountPoints);
      const safeUser = Object.assign({}, user);

      if (cached > accountPoints && window.HWAuth && typeof window.HWAuth.setPoints === 'function') {
        const recovered = cached;
        await window.HWAuth.setPoints(recovered, 'recover_higher_cached_balance', { source: VERSION, previousAccountPoints: accountPoints });
        safeUser.coolPoints = recovered;
        safeUser.lifetimePoints = Math.max(lifetimePoints, recovered);
        return applyAccount(safeUser, 'recovered_cached_to_account');
      }

      safeUser.coolPoints = accountPoints;
      safeUser.lifetimePoints = Math.max(lifetimePoints, accountPoints);
      return applyAccount(safeUser, reason || 'account_synced');
    } catch (error) {
      state.busy = false;
      state.lastError = error?.message || String(error || 'Points refresh failed.');
      render('refresh_error');
      return snapshot();
    }
  }

  async function requireLogin() {
    const current = await refresh('require_login');
    if (!current.accountBacked) {
      toast('Login required to save Cool Points.');
      try { document.dispatchEvent(new CustomEvent('hyph:points-login-required', { detail: current })); } catch (error) {}
      return null;
    }
    return current;
  }

  function serialize(work) {
    queue = queue.then(work, work);
    return queue;
  }

  async function add(amount, reason, metadata) {
    const delta = toNumber(amount);
    if (!delta) return snapshot();

    return serialize(async () => {
      const current = await requireLogin();
      if (!current) return snapshot();

      if (!window.HWAuth || typeof window.HWAuth.addPoints !== 'function') {
        toast('Cool Points service is warming up. Try again.');
        return snapshot();
      }

      const saved = toNumber(await window.HWAuth.addPoints(delta, reason || 'site_action', metadata || {}));
      writeCachedBalance(saved);
      toast('+' + delta + ' Cool Points' + (reason ? ' — ' + reason : ''));
      return refresh('points_added');
    });
  }

  async function spend(amount, reason, metadata) {
    const cost = toNumber(amount);
    if (!cost) return snapshot();

    return serialize(async () => {
      const current = await requireLogin();
      if (!current) return snapshot();

      if (current.points < cost) {
        toast('Need ' + cost + ' Cool Points. Current: ' + current.points);
        return snapshot();
      }

      if (!window.HWAuth || typeof window.HWAuth.setPoints !== 'function') {
        toast('Cool Points service is warming up. Try again.');
        return snapshot();
      }

      const next = Math.max(0, current.points - cost);
      const saved = toNumber(await window.HWAuth.setPoints(next, reason || 'spend', metadata || {}));
      writeCachedBalance(saved);
      toast('-' + cost + ' Cool Points spent' + (reason ? ' — ' + reason : ''));
      return refresh('points_spent');
    });
  }

  async function set(value, reason, metadata) {
    const next = toNumber(value);

    return serialize(async () => {
      const current = await requireLogin();
      if (!current) return snapshot();

      if (!window.HWAuth || typeof window.HWAuth.setPoints !== 'function') {
        toast('Cool Points service is warming up. Try again.');
        return snapshot();
      }

      const saved = toNumber(await window.HWAuth.setPoints(next, reason || 'set_points', metadata || {}));
      writeCachedBalance(saved);
      return refresh('points_set');
    });
  }

  function get() {
    return toNumber(state.points);
  }

  function getState() {
    return snapshot();
  }

  function wireEvents() {
    document.addEventListener('click', (event) => {
      const addButton = event.target.closest('[data-point-add]');
      if (addButton) {
        event.preventDefault();
        add(addButton.dataset.pointAdd, addButton.dataset.pointReason || addButton.dataset.reason || 'button_award');
        return;
      }

      const legacyEarnButton = event.target.closest('[data-points]');
      if (legacyEarnButton) {
        event.preventDefault();
        add(legacyEarnButton.dataset.points, legacyEarnButton.dataset.reason || legacyEarnButton.dataset.pointReason || 'legacy_button_award');
        return;
      }

      const spendButton = event.target.closest('[data-point-spend]');
      if (spendButton) {
        event.preventDefault();
        spend(spendButton.dataset.pointSpend, spendButton.dataset.pointReason || spendButton.dataset.reason || 'button_spend');
      }
    });

    document.addEventListener('hyph:points:add', (event) => {
      const detail = event.detail || {};
      add(detail.amount || detail.points || 0, detail.reason || 'site_event', detail.metadata || {});
    });

    document.addEventListener('hw:points:add', (event) => {
      const detail = event.detail || {};
      add(detail.amount || detail.points || 0, detail.reason || 'site_event', detail.metadata || {});
    });
  }

  function bootTimers() {
    if (refreshTimer) return;
    refreshTimer = window.setInterval(() => {
      if (!document.hidden) refresh('poll');
    }, 15000);
    window.addEventListener('focus', () => refresh('focus'));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refresh('visible');
    });
  }

  window.HWPoints = {
    __hyphsPointsCoreV4: true,
    version: VERSION,
    refresh,
    requireLogin,
    add,
    spend,
    set,
    get,
    getState,
    render,
    readCachedBalance,
    writeCachedBalance,
    profile: readCachedProfile,
    isAccountBacked: () => Boolean(state.accountBacked)
  };

  wireEvents();
  bootTimers();
  writeCachedBalance(readCachedBalance());
  render('boot');

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => refresh('dom_ready'));
  } else {
    refresh('dom_ready');
  }
})();
