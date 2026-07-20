(function (global) {
  'use strict';

  const CONFIG_FILE = 'supabase-config.js';
  const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  const FALLBACK_SUPABASE_URL = 'https://yuhxtdkhsltaqiagrtys.supabase.co';
  const FALLBACK_SUPABASE_KEY = 'sb_publishable_oYdN-75W3b7k3m1zLukI-A_BKWVDD5e';
  const LOCAL_SESSION = 'hw_auth_session_v1';
  const LOCAL_USERS = 'hw_mock_users_v1';
  const POINTS_KEY = 'hyphsworld.coolPoints.total';
  const PROFILE_TABLE = 'profiles';
  const AUTH_REDIRECT_URL = 'https://hyphsworld.com/account.html';

  const AVATARS = {
    boy: '🧢', girl: '💅', fox: '🦊', lion: '🦁', panda: '🐼', wolf: '🐺',
    alien: '👽', robot: '🤖', ghost: '👻', ninja: '🥷', crown: '👑', diamond: '💎'
  };

  let cfgPromise = null;
  let clientPromise = null;
  let client = null;
  let currentUserCache = null;
  let currentUserCacheAt = 0;
  let currentUserPromise = null;
  const CURRENT_USER_CACHE_MS = 2500;

  function clearCurrentUserCache() {
    currentUserCache = null;
    currentUserCacheAt = 0;
    currentUserPromise = null;
  }

  function jsonGet(key, fallback) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
  function jsonSet(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
  function textGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
  function textSet(key, value) { try { localStorage.setItem(key, String(value)); } catch {} }
  function textRemove(key) { try { localStorage.removeItem(key); } catch {} }
  function normalizeEmail(email) { return String(email || '').trim().toLowerCase(); }
  function displayFromEmail(email) { return String(email || '').split('@')[0] || 'HYPHSWORLD Guest'; }
  function usernameFromEmail(email) { return displayFromEmail(email).replace(/[^a-z0-9_]/gi, '_').slice(0, 30) || 'hyphsworld_guest'; }
  function num(value) { const parsed = parseInt(value, 10); return Number.isFinite(parsed) && parsed > 0 ? parsed : 0; }
  function avatarType(value) { const clean = String(value || '').toLowerCase().trim(); return AVATARS[clean] ? clean : 'boy'; }
  function avatarIcon(value) { return AVATARS[avatarType(value)] || '🧢'; }
  function isPlaceholder(value) { const text = String(value || '').trim(); return !text || /PASTE_|YOUR_|PROJECT_URL|ANON_PUBLIC_KEY/i.test(text); }

  function saveLocalSession(session) { jsonSet(LOCAL_SESSION, session); }
  function localSession() { return jsonGet(LOCAL_SESSION, null); }
  function clearLocalSession() { textRemove(LOCAL_SESSION); }
  function localUsers() { return jsonGet(LOCAL_USERS, {}); }
  function saveLocalUsers(users) { jsonSet(LOCAL_USERS, users); }
  function localPoints() { return num(textGet(POINTS_KEY) || textGet('coolPoints') || textGet('hyphsworld_points') || textGet('HW_COOL_POINTS')); }
  function saveLocalPoints(points) {
    const value = Math.max(0, parseInt(points, 10) || 0);
    textSet(POINTS_KEY, value);
    textSet('coolPoints', value);
    textSet('hyphsworld_points', value);
    textSet('HW_COOL_POINTS', value);
    textSet('hyphsworld.coolPoints.guestSession', value);
  }
  function saveLocalProfileName(name) { textSet('hyphsworld.playerName', name || 'Guest'); }
  function saveLocalAvatar(type) { const clean = avatarType(type); textSet('hyphsworld.avatarType', clean); textSet('hyphsworld.avatarIcon', avatarIcon(clean)); }
  function broadcastPoints(points, source) {
    saveLocalPoints(points);
    try {
      document.dispatchEvent(new CustomEvent('hyph:points-updated', { detail: { points: num(points), source: source || 'auth' } }));
      window.dispatchEvent(new CustomEvent('hw:points-change', { detail: { points: num(points), source: source || 'auth' } }));
    } catch (error) {}
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const old = Array.from(document.scripts).find((script) => script.src && script.src.includes(src));
      if (old) { old.addEventListener('load', resolve, { once: true }); setTimeout(resolve, 200); return; }
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Could not load ' + src));
      document.head.appendChild(script);
    });
  }

  async function getConfig() {
    if (cfgPromise) return cfgPromise;
    cfgPromise = (async () => {
      if (!global.HW_SUPABASE_CONFIG) { try { await loadScript(CONFIG_FILE); } catch {} }
      const c = global.HW_SUPABASE_CONFIG || {};
      const configuredUrl = String(c.url || '').trim();
      const configuredKey = String(c.anonKey || c.anon_key || c.publishableKey || c.publishable_key || '').trim();
      return {
        url: isPlaceholder(configuredUrl) ? FALLBACK_SUPABASE_URL : configuredUrl,
        anonKey: isPlaceholder(configuredKey) ? FALLBACK_SUPABASE_KEY : configuredKey,
        table: c.profileTable || PROFILE_TABLE
      };
    })();
    return cfgPromise;
  }

  async function getClient() {
    if (client && typeof client.from === 'function') return client;
    if (clientPromise) return clientPromise;
    clientPromise = (async () => {
      const c = await getConfig();
      if (isPlaceholder(c.url) || isPlaceholder(c.anonKey)) return null;
      if (!global.supabase || !global.supabase.createClient) await loadScript(CDN);
      if (!global.supabase || !global.supabase.createClient) return null;
      client = global.supabase.createClient(c.url, c.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      return client;
    })();
    return clientPromise;
  }

  function sessionFromUser(user) { return { email: user.email || '', userId: user.id || '', provider: 'supabase', createdAt: Date.now() }; }

  async function getSupabaseUser() {
    const sb = await getClient();
    if (!sb || !sb.auth || typeof sb.auth.getUser !== 'function') return null;
    const { data } = await sb.auth.getUser();
    return data && data.user ? data.user : null;
  }

  async function rowFor(user) {
    const sb = await getClient();
    if (!sb || !user) return null;
    const c = await getConfig();
    const { data, error } = await sb.from(c.table).select('*').eq('id', user.id).maybeSingle();
    if (error && error.code !== 'PGRST116') console.warn('HYPHSWORLD profile fetch warning:', error.message);
    return data || null;
  }

  async function walletFor(user) {
    const sb = await getClient();
    if (!sb || !user) return { balance: localPoints(), lifetime_points: localPoints() };
    try {
      const { data, error } = await sb.rpc('get_my_points');
      if (!error && data) {
        const balance = num(data.balance ?? data.cool_points ?? data.points);
        const lifetime = Math.max(num(data.lifetime_points), balance);
        broadcastPoints(balance, 'get_my_points');
        return { balance, lifetime_points: lifetime, rank_title: data.rank_title || 'Lobby Rookie' };
      }
    } catch (error) {}
    const row = await rowFor(user);
    const balance = num(row && (row.cool_points ?? row.points));
    broadcastPoints(balance, 'profile_row');
    return { balance, lifetime_points: Math.max(num(row && row.lifetime_points), balance), rank_title: row && row.rank_title || 'Lobby Rookie' };
  }

  async function upsertRow(user, updates = {}) {
    const sb = await getClient();
    if (!sb || !user) return null;
    const c = await getConfig();
    const current = await rowFor(user);
    const wallet = await walletFor(user);
    const cleanAvatar = avatarType(updates.avatarType || updates.avatar_type || current?.avatar_type || textGet('hyphsworld.avatarType') || 'boy');
    const displayName = String(updates.displayName || updates.display_name || current?.display_name || user.user_metadata?.displayName || displayFromEmail(user.email)).trim().slice(0, 40);
    const row = {
      id: user.id,
      email: user.email || current?.email || null,
      username: String(updates.username || current?.username || user.user_metadata?.username || usernameFromEmail(user.email)).slice(0, 30),
      display_name: displayName,
      duck_status: String(updates.duckStatus || updates.duck_status || current?.duck_status || user.user_metadata?.duckStatus || 'Duck Sauce is watching this account.').slice(0, 90),
      buck_clearance: String(updates.buckClearance || updates.buck_clearance || current?.buck_clearance || user.user_metadata?.buckClearance || 'Lobby clearance only').slice(0, 90),
      avatar_type: cleanAvatar,
      avatar_icon: avatarIcon(cleanAvatar),
      points: wallet.balance,
      cool_points: wallet.balance,
      lifetime_points: Math.max(wallet.lifetime_points, wallet.balance),
      updated_at: new Date().toISOString()
    };
    const { data, error } = await sb.from(c.table).upsert(row, { onConflict: 'id' }).select().maybeSingle();
    if (error) throw new Error(error.message || 'Profile save failed.');
    saveLocalProfileName(row.display_name);
    saveLocalAvatar(row.avatar_type);
    broadcastPoints(row.cool_points, 'profile_sync');
    return data || row;
  }

  async function signInWithGoogle(options = {}) {
    const sb = await getClient();
    if (!sb) throw new Error('Google sign-in needs Supabase configuration.');
    const redirectTo = options.redirectTo || AUTH_REDIRECT_URL;
    const { data, error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) throw new Error(error.message || 'Google sign-in failed.');
    return data;
  }

  async function signUpWithEmail(email, password) {
    email = normalizeEmail(email);
    if (!email || !password) throw new Error('Email and password are required.');
    const sb = await getClient();
    if (!sb) return mockSignUp(email, password);
    const displayName = displayFromEmail(email);
    const startingAvatar = avatarType(textGet('hyphsworld.avatarType') || 'boy');
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: AUTH_REDIRECT_URL, data: { displayName, username: usernameFromEmail(email), avatarType: startingAvatar, avatarIcon: avatarIcon(startingAvatar) } }
    });
    if (error) throw new Error(error.message || 'Sign up failed.');
    if (data && data.user) await upsertRow(data.user, { displayName, avatarType: startingAvatar });
    const session = data && data.user ? sessionFromUser(data.user) : { email, userId: '', provider: 'supabase' };
    saveLocalSession(session);
    saveLocalProfileName(displayName);
    saveLocalAvatar(startingAvatar);
    broadcastPoints(0, 'signup');
    return session;
  }

  async function signInWithEmail(email, password) {
    email = normalizeEmail(email);
    const sb = await getClient();
    if (!sb) return mockSignIn(email, password);
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message || 'Invalid credentials.');
    if (!data || !data.user) throw new Error('No user returned.');
    const row = (await rowFor(data.user)) || (await upsertRow(data.user, { displayName: data.user.user_metadata?.displayName || displayFromEmail(email) }));
    const wallet = await walletFor(data.user);
    saveLocalPoints(wallet.balance);
    saveLocalProfileName(row?.display_name || displayFromEmail(email));
    saveLocalAvatar(row?.avatar_type || 'boy');
    const session = sessionFromUser(data.user);
    saveLocalSession(session);
    return session;
  }

  async function signOut() {
    clearCurrentUserCache();
    const sb = await getClient();
    if (sb) await sb.auth.signOut();
    clearLocalSession();
    textRemove('hyphsworld.playerName');
    textRemove('hyphsworld.avatarType');
    textRemove('hyphsworld.avatarIcon');
    broadcastPoints(0, 'logout');
  }

  async function getSession() {
    const sb = await getClient();
    if (!sb) return localSession();
    const { data } = await sb.auth.getSession();
    if (!data || !data.session || !data.session.user) { clearLocalSession(); return null; }
    const session = sessionFromUser(data.session.user);
    saveLocalSession(session);
    return session;
  }

  async function loadCurrentUser() {
    const sb = await getClient();
    if (sb) {
      const user = await getSupabaseUser();
      if (!user) return null;
      const row = (await rowFor(user)) || (await upsertRow(user, { displayName: user.user_metadata?.displayName || displayFromEmail(user.email) }));
      const wallet = await walletFor(user);
      const type = avatarType(row?.avatar_type || user.user_metadata?.avatarType || textGet('hyphsworld.avatarType') || 'boy');
      saveLocalProfileName(row?.display_name || user.user_metadata?.displayName || displayFromEmail(user.email));
      saveLocalAvatar(type);
      return {
        email: user.email || '',
        userId: user.id || '',
        provider: 'supabase',
        displayName: row?.display_name || user.user_metadata?.displayName || displayFromEmail(user.email),
        username: row?.username || user.user_metadata?.username || usernameFromEmail(user.email),
        duckStatus: row?.duck_status || user.user_metadata?.duckStatus || 'Duck Sauce is watching this account from a folding chair.',
        buckClearance: row?.buck_clearance || user.user_metadata?.buckClearance || 'Lobby clearance only',
        avatarType: type,
        avatarIcon: avatarIcon(type),
        coolPoints: wallet.balance,
        points: wallet.balance,
        lifetimePoints: Math.max(wallet.lifetime_points, wallet.balance),
        level1Unlocked: Boolean(row?.level_1_unlocked),
        level2Unlocked: Boolean(row?.level_2_unlocked)
      };
    }

    const session = localSession();
    if (!session || !session.email) return null;
    const users = localUsers();
    const stored = users[session.email] || {};
    const type = avatarType(stored.avatarType || textGet('hyphsworld.avatarType') || 'boy');
    return { email: session.email, userId: session.userId, provider: 'mock', displayName: stored.displayName || displayFromEmail(session.email), duckStatus: stored.duckStatus || 'Duck Sauce is watching this account from a folding chair.', buckClearance: stored.buckClearance || 'Lobby clearance only', avatarType: type, avatarIcon: avatarIcon(type), coolPoints: num(stored.coolPoints), lifetimePoints: num(stored.lifetimePoints ?? stored.coolPoints), level1Unlocked: Boolean(stored.level1Unlocked), level2Unlocked: Boolean(stored.level2Unlocked) };
  }

  async function getCurrentUser(force) {
    if (!force && currentUserCacheAt && Date.now() - currentUserCacheAt < CURRENT_USER_CACHE_MS) return currentUserCache;
    if (!force && currentUserPromise) return currentUserPromise;
    currentUserPromise = loadCurrentUser();
    try {
      currentUserCache = await currentUserPromise;
      currentUserCacheAt = Date.now();
      return currentUserCache;
    } finally {
      currentUserPromise = null;
    }
  }

  async function updateProfile(updates) {
    const sb = await getClient();
    if (sb) {
      const user = await getSupabaseUser();
      if (!user) throw new Error('Login required.');
      const clean = { displayName: String(updates.displayName || displayFromEmail(user.email)).trim().slice(0, 40), duckStatus: String(updates.duckStatus || 'Duck Sauce has no official notes.').trim().slice(0, 90), buckClearance: String(updates.buckClearance || 'Lobby clearance only').trim().slice(0, 90), avatarType: avatarType(updates.avatarType || updates.avatar_type || 'boy') };
      try { await sb.auth.updateUser({ data: clean }); } catch (error) {}
      await upsertRow(user, clean);
      clearCurrentUserCache();
      return getCurrentUser(true);
    }

    const session = localSession();
    if (!session || !session.email) throw new Error('Login required.');
    const users = localUsers();
    const current = users[session.email] || { email: session.email };
    users[session.email] = { ...current, displayName: String(updates.displayName || current.displayName || displayFromEmail(session.email)).trim().slice(0, 40), duckStatus: String(updates.duckStatus || current.duckStatus || 'Duck Sauce has no official notes.').trim().slice(0, 90), buckClearance: String(updates.buckClearance || current.buckClearance || 'Lobby clearance only').trim().slice(0, 90), avatarType: avatarType(updates.avatarType || current.avatarType || 'boy'), avatarIcon: avatarIcon(updates.avatarType || current.avatarType || 'boy'), coolPoints: num(current.coolPoints), lifetimePoints: Math.max(num(current.lifetimePoints), num(current.coolPoints)), updatedAt: Date.now() };
    saveLocalUsers(users);
    return getCurrentUser();
  }

  async function getPoints() {
    const user = await getCurrentUser();
    return num(user?.coolPoints);
  }

  async function setPoints(value, reason) {
    const next = Math.max(0, parseInt(value, 10) || 0);
    const current = await getPoints();
    const delta = next - current;
    if (delta > 0) return addPoints(delta, reason || 'set_points_delta');
    if (delta < 0) {
      const sb = await getClient();
      if (!sb) { broadcastPoints(next, reason || 'set_points_local'); return next; }
      const { data, error } = await sb.rpc('spend_cool_points', { p_amount: Math.abs(delta), p_source: reason || 'set_points', p_reason: reason || 'Cool Points adjustment', p_metadata: { source: 'auth_client_set_points' } });
      if (error) throw new Error(error.message || 'Could not spend Cool Points.');
      if (data && data.ok === false) throw new Error(data.message || 'Not enough Cool Points.');
      const balance = num(data && data.balance);
      broadcastPoints(balance, reason || 'set_points');
      return balance;
    }
    broadcastPoints(next, reason || 'set_points');
    return next;
  }

  async function addPoints(amount, reason) {
    const amountInt = parseInt(amount, 10) || 0;
    const sb = await getClient();
    if (sb) {
      const user = await getSupabaseUser();
      if (!user) throw new Error('Login required to earn Cool Points.');
      const { data, error } = await sb.rpc('earn_cool_points', { p_amount: amountInt, p_source: reason || 'site_action', p_reason: reason || 'Cool Points earned', p_metadata: { source: 'auth_client' } });
      if (error) throw new Error(error.message || 'Could not earn Cool Points.');
      const balance = num(data && data.balance);
      broadcastPoints(balance, reason || 'earn_cool_points');
      return balance;
    }
    const session = localSession();
    if (!session?.email) throw new Error('Login required to earn Cool Points.');
    const next = localPoints() + amountInt;
    broadcastPoints(next, reason || 'local_add');
    return next;
  }

  async function grantVaultAccess(levelKey) {
    const normalizedLevel = levelKey || 'level_1';
    const sb = await getClient();
    if (sb) {
      const user = await getSupabaseUser();
      if (!user) throw new Error('Login required.');
      await upsertRow(user, normalizedLevel === 'level_2' ? { level2Unlocked: true } : { level1Unlocked: true });
      try { await sb.from('vault_unlocks').insert({ user_id: user.id, level_key: normalizedLevel }); } catch (error) {}
      return true;
    }
    return true;
  }

  async function getProviderStatus() {
    const c = await getConfig();
    const ready = Boolean(await getClient());
    return { provider: ready ? 'supabase' : 'mock', supabaseConfigured: ready, urlPresent: !isPlaceholder(c.url), anonKeyPresent: !isPlaceholder(c.anonKey), profileTable: c.table };
  }

  async function mockSignUp(email, password) {
    const users = localUsers();
    if (users[email]) throw new Error('Account already exists.');
    const type = avatarType(textGet('hyphsworld.avatarType') || 'boy');
    users[email] = { email, password, displayName: displayFromEmail(email), duckStatus: 'Duck Sauce has not fined this account yet.', buckClearance: 'Lobby clearance only', avatarType: type, avatarIcon: avatarIcon(type), coolPoints: 0, lifetimePoints: 0, createdAt: Date.now() };
    saveLocalUsers(users);
    const session = { email, userId: 'mock_' + btoa(email), provider: 'mock', createdAt: Date.now() };
    saveLocalSession(session); saveLocalProfileName(users[email].displayName); saveLocalAvatar(type); broadcastPoints(0, 'mock_signup');
    return session;
  }

  async function mockSignIn(email, password) {
    const users = localUsers();
    if (!users[email] || users[email].password !== password) throw new Error('Invalid credentials.');
    saveLocalProfileName(users[email].displayName || displayFromEmail(email)); saveLocalAvatar(users[email].avatarType || 'boy'); broadcastPoints(users[email].coolPoints || 0, 'mock_signin');
    const session = { email, userId: 'mock_' + btoa(email), provider: 'mock', createdAt: Date.now() };
    saveLocalSession(session);
    return session;
  }

  global.HWAuth = { getProviderStatus, getClient, signUpWithEmail, signInWithEmail, signInWithGoogle, signOut, getSession, getCurrentUser, updateProfile, getPoints, setPoints, addPoints, grantVaultAccess, avatarIcon };
})(window);
