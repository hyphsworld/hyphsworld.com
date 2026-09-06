/*
  HYPHSWORLD Global Cool Points Engine
  Account-only rewrite: one ID, one real balance.

  Rules:
  - Supabase profile points are the only real wallet after login.
  - localStorage is display cache only, never a second bank.
  - Logged-out visitors can browse, but point awards/spends require login.
  - All pages use window.HWPoints for the same account-backed balance.
*/
(function () {
  'use strict';

  if (window.HWPoints && window.HWPoints.__accountOnlyEngineV2) return;

  const CACHE_KEY = 'hyphsworld.coolPoints.total';
  const LEGACY_KEYS = ['coolPoints', 'hyphsworld_points', 'HW_COOL_POINTS', 'hyphsworld.coolPoints.guestSession'];
  const PROFILE_TABLE = 'profiles';
  const SUPABASE_URL = window.HW_SUPABASE_URL || 'https://yuhxtdkhsltaqiagrtys.supabase.co';
  const SUPABASE_ANON_KEY = window.HW_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || '';

  let state = {
    ready: false,
    user: null,
    profile: null,
    points: 0,
    lifetimePoints: 0,
    rankTitle: 'Login Required',
    avatarIcon: '🧢',
    source: 'boot',
    accountBacked: false
  };

  let supabaseClient = null;
  let refreshTimer = null;
  let refreshing = false;
  let pendingQueue = [];

  function toNumber(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }

  function writeStorage(key, value, storage) {
    try { storage.setItem(key, String(value)); } catch (error) {}
  }

  function cacheAccountBalance(points) {
    const next = toNumber(points);
    writeStorage(CACHE_KEY, next, localStorage);
    LEGACY_KEYS.forEach((key) => writeStorage(key, next, localStorage));
    return next;
  }

  async function getSupabaseClient() {
    if (window.HWAuth && typeof window.HWAuth.getClient === 'function') {
      try {
        const client = await window.HWAuth.getClient();
        if (client) return client;
      } catch (error) {}
    }
    if (window.HWAuth && window.HWAuth.supabase) return window.HWAuth.supabase;
    if (!window.supabase || !SUPABASE_ANON_KEY) return null;
    if (!supabaseClient) supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    return supabaseClient;
  }

  async function getCurrentUser() {
    if (window.HWAuth && typeof window.HWAuth.getCurrentUser === 'function') {
      try {
        const user = await window.HWAuth.getCurrentUser();
        if (user && (user.userId || user.id)) return user;
      } catch (error) {}
    }

    if (window.HWAuth && typeof window.HWAuth.getSession === 'function') {
      try {
        const session = await window.HWAuth.getSession();
        const user = session && (session.user || session.data?.user);
        if (user) return { userId: user.id, id: user.id, email: user.email || '' };
        if (session && session.userId) return session;
      } catch (error) {}
    }

    const client = await getSupabaseClient();
    if (client && client.auth && typeof client.auth.getUser === 'function') {
      try {
        const { data } = await client.auth.getUser();
        if (data && data.user) return { userId: data.user.id, id: data.user.id, email: data.user.email || '' };
      } catch (error) {}
    }

    return null;
  }

  async function fetchProfile(user) {
    if (!user) return null;

    if (window.HWAuth && typeof window.HWAuth.getProfile === 'function') {
      try {
        const profile = await window.HWAuth.getProfile();
        if (profile) return profile;
      } catch (error) {}
    }

    const client = await getSupabaseClient();
    if (!client) return null;

    try {
      const id = user.userId || user.id;
      const { data } = await client.from(PROFILE_TABLE).select('*').eq('id', id).maybeSingle();
      return data || null;
    } catch (error) {
      return null;
    }
  }

  async function pushAccountBalance(points, reason) {
    const next = toNumber(points);

    if (window.HWAuth && typeof window.HWAuth.setPoints === 'function') {
      await window.HWAuth.setPoints(next, reason || 'account_only_points_sync');
      return next;
    }

    return next;
  }

  function setState(nextState) {
    state = Object.assign({}, state, nextState, { ready: true });
    if (state.accountBacked || state.user) cacheAccountBalance(state.points);
    render();
    emit('hw:points-ready');
    emit('hw:points-change');
    return getState();
  }

  function getState() {
    return Object.assign({}, state, {
      points: toNumber(state.points),
      accountBacked: Boolean(state.user)
    });
  }

  function emit(name) {
    const snapshot = getState();

    try {
      window.dispatchEvent(new CustomEvent(name, { detail: snapshot }));
    } catch (error) {}

    if (name === 'hw:points-change') {
      try {
        document.dispatchEvent(new CustomEvent('hyph:points-updated', {
          detail: {
            points: snapshot.points,
            source: snapshot.source,
            profile: snapshot.profile || null,
            accountBacked: Boolean(snapshot.user),
            loginRequired: !snapshot.user
          }
        }));
      } catch (error) {}
    }
  }

  function injectHudStyles() {
    if (document.getElementById('hwGlobalPointsHudStyles')) return;

    const style = document.createElement('style');
    style.id = 'hwGlobalPointsHudStyles';
    style.textContent = [
      '#hwGlobalPointsHud{position:fixed;right:14px;bottom:14px;z-index:9999;display:grid;grid-template-columns:auto minmax(84px,1fr) auto;align-items:center;gap:10px;max-width:calc(100vw - 28px);padding:10px 12px;border:1px solid rgba(69,255,54,.32);border-radius:18px;background:rgba(0,0,0,.88);backdrop-filter:blur(12px);box-shadow:0 0 24px rgba(69,255,54,.16),0 12px 32px rgba(0,0,0,.36);color:#fff;font-family:Arial,Helvetica,sans-serif}',
      '.hwgp-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:999px;background:linear-gradient(135deg,#39ff7a,#1ffcff,#ff4fd8);color:#050505;font-weight:1000}',
      '#hwGlobalPointsHud strong{display:block;font-size:1.05rem;color:#39ff7a;line-height:1}',
      '#hwGlobalPointsHud span{display:block;font-size:.68rem;text-transform:uppercase;letter-spacing:.08em;color:#d8ffe5;font-weight:900}',
      '#hwGlobalPointsHud .hwgp-name{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#fff;font-size:.7rem;text-transform:none;letter-spacing:0}',
      '#hwGlobalPointsHud small{padding:5px 8px;border-radius:999px;background:rgba(255,255,255,.08);color:#ffe45c;font-size:.66rem;font-weight:900;white-space:nowrap}',
      '#hwGlobalPointsHud .hwgp-action{display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:6px 10px;border-radius:999px;background:linear-gradient(90deg,#39ff7a,#1ffcff);color:#050505;font-size:.68rem;font-weight:1000;text-decoration:none;text-transform:uppercase;letter-spacing:.04em}',
      '#hwGlobalPointsHud.is-live{border-color:rgba(31,252,255,.38);box-shadow:0 0 24px rgba(31,252,255,.16),0 12px 32px rgba(0,0,0,.36)}',
      '@media(max-width:640px){#hwGlobalPointsHud{left:10px;right:10px;bottom:10px;border-radius:16px;padding:9px 10px}#hwGlobalPointsHud small{display:none}#hwGlobalPointsHud .hwgp-name{max-width:34vw}}'
    ].join('');
    document.head.appendChild(style);
  }

  function ensureHud() {
    let hud = document.getElementById('hwGlobalPointsHud');
    if (!hud) {
      hud = document.createElement('aside');
      hud.id = 'hwGlobalPointsHud';
      document.body.appendChild(hud);
    }
    hud.setAttribute('aria-live', 'polite');
    if (!hud.querySelector('[data-hw-account-name]') || !hud.querySelector('[data-hw-account-action]')) {
      hud.innerHTML = '<div class="hwgp-icon" data-hw-avatar>🧢</div><div><strong data-hw-points>0</strong><span>Cool Points</span><span class="hwgp-name" data-hw-account-name>Checking login…</span></div><small data-hw-rank>Checking…</small><a class="hwgp-action" data-hw-account-action href="/auth.html">Login</a>';
    }
    return hud;
  }

  function render() {
    injectHudStyles();

    const safePoints = toNumber(state.points);
    const pointsText = safePoints.toLocaleString();
    const rank = state.user ? (state.rankTitle || 'Lobby Rookie') : 'Login Required';
    const avatar = state.avatarIcon || '🧢';
    const profile = state.profile || state.user || {};
    const accountName = profile.display_name || profile.displayName || profile.username || profile.email || (state.ready ? 'Guest' : 'Checking login…');

    document.querySelectorAll('[data-hw-points], #cool-points, #gateCredits, #wof-points, .js-cool-points, [data-cool-points], #accountCoolPoints').forEach((el) => {
      el.textContent = pointsText;
    });

    document.querySelectorAll('[data-hw-rank]').forEach((el) => { el.textContent = rank; });
    document.querySelectorAll('[data-hw-avatar]').forEach((el) => { el.textContent = avatar; });
    document.querySelectorAll('[data-hw-user-state]').forEach((el) => { el.textContent = state.user ? 'LIVE ID' : 'LOGIN REQUIRED'; });
    document.querySelectorAll('[data-points-mode]').forEach((el) => { el.textContent = state.user ? 'Account saved' : 'Login required'; });

    const hud = ensureHud();
    const avatarNode = hud.querySelector('[data-hw-avatar]');
    const pointsNode = hud.querySelector('[data-hw-points]');
    const rankNode = hud.querySelector('[data-hw-rank]');
    const nameNode = hud.querySelector('[data-hw-account-name]');
    if (avatarNode) avatarNode.textContent = avatar;
    if (pointsNode) pointsNode.textContent = pointsText;
    if (rankNode) rankNode.textContent = rank;
    if (nameNode) nameNode.textContent = accountName;
    const action = hud.querySelector('[data-hw-account-action]');
    if (action) {
      action.textContent = state.user ? 'Account' : 'Login';
      action.href = state.user ? '/account.html' : '/auth.html?next=' + encodeURIComponent(location.pathname + location.search);
    }
    hud.classList.toggle('is-live', Boolean(state.user));
  }

  function startAccountRefreshLoop() {
    if (refreshTimer) return;
    refreshTimer = window.setInterval(() => {
      if (!document.hidden) refresh();
    }, 12000);
  }

  async function refresh() {
    if (refreshing) return getState();
    refreshing = true;

    try {
      const user = await getCurrentUser();
      const profile = await fetchProfile(user);

      if (user && profile) {
        const remotePoints = toNumber(profile.cool_points ?? profile.points ?? user.coolPoints);
        const lifetimePoints = Math.max(toNumber(profile.lifetime_points ?? user.lifetimePoints), remotePoints);

        startAccountRefreshLoop();

        return setState({
          user,
          profile,
          points: remotePoints,
          lifetimePoints,
          rankTitle: profile.rank_title || 'Lobby Rookie',
          avatarIcon: profile.avatar_icon || user.avatarIcon || '🧢',
          source: 'account_synced',
          accountBacked: true
        });
      }

      if (user && !profile) {
        return setState({
          user,
          profile: null,
          points: toNumber(user.coolPoints),
          lifetimePoints: toNumber(user.lifetimePoints || user.coolPoints),
          rankTitle: 'Lobby Rookie',
          avatarIcon: user.avatarIcon || '🧢',
          source: 'account_user_synced',
          accountBacked: true
        });
      }

      return setState({
        user: null,
        profile: null,
        points: 0,
        lifetimePoints: 0,
        rankTitle: 'Login Required',
        avatarIcon: '🧢',
        source: 'login_required',
        accountBacked: false
      });
    } finally {
      refreshing = false;
    }
  }

  async function requireLogin() {
    const snapshot = await refresh();
    if (!snapshot.user) {
      render();
      try {
        document.dispatchEvent(new CustomEvent('hyph:points-login-required', { detail: snapshot }));
      } catch (error) {}
      return null;
    }
    return snapshot;
  }

  async function add(amount, reason, metadata) {
    const delta = Math.floor(Number(amount || 0));
    if (!delta) return getState();

    if (!state.ready) pendingQueue.push({ amount: delta, reason, metadata });

    const snapshot = await requireLogin();
    if (!snapshot) return getState();

    if (window.HWAuth && typeof window.HWAuth.addPoints === 'function') {
      const saved = toNumber(await window.HWAuth.addPoints(delta, reason || 'site_action', metadata || {}));
      cacheAccountBalance(saved);
      return refresh();
    }

    const next = toNumber(snapshot.points) + delta;
    await pushAccountBalance(next, reason || 'site_action');
    cacheAccountBalance(next);
    return refresh();
  }

  async function spend(amount, reason, metadata) {
    const cost = Math.abs(Math.floor(Number(amount || 0)));
    if (!cost) return getState();

    const snapshot = await requireLogin();
    if (!snapshot) return getState();

    const current = toNumber(snapshot.points);
    if (current < cost) {
      render();
      return getState();
    }

    const next = current - cost;
    await pushAccountBalance(next, reason || 'spend');
    cacheAccountBalance(next);
    return refresh();
  }

  async function flushPending() {
    if (!pendingQueue.length || !state.ready) return;
    const queue = pendingQueue.slice();
    pendingQueue = [];
    for (const item of queue) await add(item.amount, item.reason, item.metadata);
  }

  function get() {
    return toNumber(state.points);
  }

  window.HWPoints = {
    __accountOnlyEngineV2: true,
    refresh,
    add,
    spend,
    get,
    getState,
    render,
    requireLogin
  };

  document.addEventListener('hyph:points:add', (event) => {
    const detail = event.detail || {};
    add(detail.amount || detail.points || 0, detail.reason || 'lobby_event', detail.metadata || {});
  });

  document.addEventListener('hw:points:add', (event) => {
    const detail = event.detail || {};
    add(detail.amount || detail.points || 0, detail.reason || 'site_event', detail.metadata || {});
  });

  document.addEventListener('click', (event) => {
    const addButton = event.target.closest('[data-point-add]');
    if (addButton) {
      add(addButton.dataset.pointAdd, addButton.dataset.pointReason || addButton.dataset.reason || 'button_award');
      return;
    }

    const legacyEarnButton = event.target.closest('[data-points]');
    if (legacyEarnButton) {
      add(legacyEarnButton.dataset.points, legacyEarnButton.dataset.reason || legacyEarnButton.dataset.pointReason || 'legacy_button_award');
      return;
    }

    const spendButton = event.target.closest('[data-point-spend]');
    if (spendButton) spend(spendButton.dataset.pointSpend, spendButton.dataset.pointReason || spendButton.dataset.reason || 'button_spend');
  });

  async function bootAndSync() {
    await refresh();
    await flushPending();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAndSync, { once: true });
  } else {
    bootAndSync();
  }

  window.addEventListener('load', bootAndSync, { once: true });
  window.addEventListener('storage', (event) => {
    if (event.key === CACHE_KEY) refresh();
  });

  document.addEventListener('hyph:auth-signed-in', bootAndSync);
  document.addEventListener('hyph:auth-points-bridge-ready', bootAndSync);
  window.addEventListener('pageshow', bootAndSync);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refresh();
  });

  window.addEventListener('focus', refresh);
})();
