/*
  HYPHSWORLD Global Cool Points Engine
  Clean rewrite: one balance, every page, highest balance wins.

  Rules:
  - Device/local points are saved in localStorage + sessionStorage mirrors.
  - Signed-in users sync through HWAuth/Supabase when available.
  - Older profile/account values cannot overwrite a newer earned balance.
  - Cash Run, casino, vault, and button events all use the same HWPoints API.
*/
(function () {
  'use strict';

  if (window.HWPoints && window.HWPoints.__globalEngineCleanV1) return;

  const STORAGE_KEY = 'hyphsworld.coolPoints.total';
  const GUEST_KEY = 'hyphsworld.coolPoints.guestSession';
  const LEGACY_KEYS = ['coolPoints', 'hyphsworld_points', 'HW_COOL_POINTS'];
  const WATCHED_STORAGE_KEYS = [STORAGE_KEY, GUEST_KEY].concat(LEGACY_KEYS);
  const PROFILE_TABLE = 'profiles';
  const SUPABASE_URL = window.HW_SUPABASE_URL || 'https://yuhxtdkhsltaqiagrtys.supabase.co';
  const SUPABASE_ANON_KEY = window.HW_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || '';

  let state = {
    ready: false,
    user: null,
    profile: null,
    points: 0,
    lifetimePoints: 0,
    rankTitle: 'Guest',
    avatarIcon: '🧢',
    source: 'boot'
  };

  let supabaseClient = null;
  let refreshTimer = null;
  let refreshing = false;
  let pendingQueue = [];

  function toNumber(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }

  function readStorage(key, storage) {
    try { return storage.getItem(key); } catch (error) { return null; }
  }

  function writeStorage(key, value, storage) {
    try { storage.setItem(key, String(value)); } catch (error) {}
  }

  function readLocalBalance() {
    const values = [];

    values.push(readStorage(STORAGE_KEY, localStorage));
    values.push(readStorage(GUEST_KEY, localStorage));
    values.push(readStorage(GUEST_KEY, sessionStorage));

    LEGACY_KEYS.forEach((key) => values.push(readStorage(key, localStorage)));

    return values.reduce((highest, value) => Math.max(highest, toNumber(value)), 0);
  }

  function mirrorBalance(points) {
    const next = toNumber(points);

    writeStorage(STORAGE_KEY, next, localStorage);
    writeStorage(GUEST_KEY, next, localStorage);
    writeStorage(GUEST_KEY, next, sessionStorage);

    LEGACY_KEYS.forEach((key) => writeStorage(key, next, localStorage));

    return next;
  }

  function getSupabaseClient() {
    if (window.HWAuth && window.HWAuth.supabase) return window.HWAuth.supabase;
    if (!window.supabase || !SUPABASE_ANON_KEY) return null;
    if (!supabaseClient) supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
      } catch (error) {}
    }

    const client = getSupabaseClient();
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

    const client = getSupabaseClient();
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
      try {
        await window.HWAuth.setPoints(next, reason || 'global_points_sync');
        return next;
      } catch (error) {}
    }

    return next;
  }

  function setState(nextState) {
    state = Object.assign({}, state, nextState, { ready: true });
    mirrorBalance(state.points);
    render();
    emit('hw:points-ready');
    emit('hw:points-change');
    return getState();
  }

  function getState() {
    return Object.assign({}, state, {
      points: Math.max(toNumber(state.points), readLocalBalance())
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
            accountBacked: Boolean(snapshot.user)
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
    let hud = document.getElementById('hwGlobalPointsHud');
    if (hud) return hud;

    hud = document.createElement('aside');
    hud.id = 'hwGlobalPointsHud';
    hud.innerHTML = '<div class="hwgp-icon" data-hw-avatar>🧢</div><div><strong data-hw-points>0</strong><span>Cool Points</span></div><small data-hw-rank>Guest</small>';
    document.body.appendChild(hud);
    return hud;
  }

  function render() {
    injectHudStyles();

    const safePoints = Math.max(toNumber(state.points), readLocalBalance());
    const pointsText = safePoints.toLocaleString();
    const rank = state.rankTitle || (state.user ? 'Lobby Rookie' : 'Guest');
    const avatar = state.avatarIcon || '🧢';

    document.querySelectorAll('[data-hw-points], #cool-points, #gateCredits, #wof-points, .js-cool-points, [data-cool-points], #accountCoolPoints').forEach((el) => {
      el.textContent = pointsText;
    });

    document.querySelectorAll('[data-hw-rank]').forEach((el) => { el.textContent = rank; });
    document.querySelectorAll('[data-hw-avatar]').forEach((el) => { el.textContent = avatar; });
    document.querySelectorAll('[data-hw-user-state]').forEach((el) => { el.textContent = state.user ? 'LIVE ID' : 'GUEST'; });
    document.querySelectorAll('[data-points-mode]').forEach((el) => { el.textContent = state.user ? 'Account saved' : 'Device saved'; });

    const hud = ensureHud();
    hud.querySelector('[data-hw-avatar]').textContent = avatar;
    hud.querySelector('[data-hw-points]').textContent = pointsText;
    hud.querySelector('[data-hw-rank]').textContent = rank;
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
      const localPoints = readLocalBalance();
      const user = await getCurrentUser();
      const profile = await fetchProfile(user);

      if (user && profile) {
        const remotePoints = toNumber(profile.points);
        const bestPoints = Math.max(localPoints, remotePoints);
        const lifetimePoints = Math.max(toNumber(profile.lifetime_points), bestPoints);

        if (bestPoints > remotePoints) await pushAccountBalance(bestPoints, 'recover_higher_local_points');

        startAccountRefreshLoop();

        return setState({
          user,
          profile,
          points: bestPoints,
          lifetimePoints,
          rankTitle: profile.rank_title || 'Lobby Rookie',
          avatarIcon: profile.avatar_icon || '🧢',
          source: bestPoints > remotePoints ? 'recovered_local_to_account' : 'account_synced'
        });
      }

      return setState({
        user: null,
        profile: null,
        points: localPoints,
        lifetimePoints: localPoints,
        rankTitle: 'Guest',
        avatarIcon: '🧢',
        source: 'device_saved'
      });
    } finally {
      refreshing = false;
    }
  }

  async function add(amount, reason, metadata) {
    const delta = Math.floor(Number(amount || 0));
    if (!delta) return getState();

    if (!state.ready) pendingQueue.push({ amount: delta, reason, metadata });

    const base = Math.max(toNumber(state.points), readLocalBalance());
    const target = Math.max(0, base + delta);
    mirrorBalance(target);

    if (state.user && window.HWAuth && typeof window.HWAuth.addPoints === 'function') {
      try {
        const saved = toNumber(await window.HWAuth.addPoints(delta, reason || 'site_action', metadata || {}));
        const best = Math.max(saved, target, readLocalBalance());
        if (best > saved) await pushAccountBalance(best, reason || 'site_action_recovery');
        mirrorBalance(best);
        return refresh();
      } catch (error) {}
    }

    return setState({
      points: target,
      lifetimePoints: Math.max(toNumber(state.lifetimePoints), target),
      source: reason || 'points_added'
    });
  }

  async function spend(amount, reason, metadata) {
    const cost = Math.abs(Math.floor(Number(amount || 0)));
    if (!cost) return getState();

    const current = Math.max(toNumber(state.points), readLocalBalance());
    if (current < cost) {
      render();
      return getState();
    }

    const next = current - cost;
    mirrorBalance(next);

    if (state.user && window.HWAuth && typeof window.HWAuth.setPoints === 'function') {
      try { await window.HWAuth.setPoints(next, reason || 'spend'); } catch (error) {}
    }

    return setState({ points: next, source: reason || 'points_spent' });
  }

  async function flushPending() {
    if (!pendingQueue.length || !state.ready) return;
    const queue = pendingQueue.slice();
    pendingQueue = [];
    for (const item of queue) await add(item.amount, item.reason, item.metadata);
  }

  function get() {
    return Math.max(toNumber(state.points), readLocalBalance());
  }

  window.HWPoints = {
    __globalEngineCleanV1: true,
    refresh,
    add,
    spend,
    get,
    getState,
    render
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

  document.addEventListener('DOMContentLoaded', async () => {
    await refresh();
    await flushPending();
  });

  window.addEventListener('load', async () => {
    await refresh();
    await flushPending();
  });

  window.addEventListener('storage', (event) => {
    if (WATCHED_STORAGE_KEYS.includes(event.key)) refresh();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refresh();
  });

  window.addEventListener('focus', refresh);
})();
