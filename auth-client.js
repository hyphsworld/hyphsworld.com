(function (global) {
  'use strict';

  const CONFIG_FILE = 'supabase-config.js';
  const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  const LOCAL_SESSION = 'hw_auth_session_v1';
  const LOCAL_USERS = 'hw_mock_users_v1';
  const POINTS_KEY = 'hyphsworld.coolPoints.total';
  const PROFILE_TABLE = 'profiles';
  const AUTH_REDIRECT_URL = 'https://hyphsworld.com/login.html';

  let cfgPromise = null;
  let clientPromise = null;
  let client = null;

  function jsonGet(key, fallback) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
  function jsonSet(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
  function textGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
  function textSet(key, value) { try { localStorage.setItem(key, String(value)); } catch {} }
  function normalizeEmail(email) { return String(email || '').trim().toLowerCase(); }
  function displayFromEmail(email) { return String(email || '').split('@')[0] || 'HYPHSWORLD Guest'; }
  function usernameFromEmail(email) { return displayFromEmail(email).replace(/[^a-z0-9_]/gi, '_').slice(0, 30) || 'hyphsworld_guest'; }
  function num(value) { const parsed = parseInt(value, 10); return Number.isFinite(parsed) && parsed > 0 ? parsed : 0; }
  function hasOwn(obj, key) { return Object.prototype.hasOwnProperty.call(obj || {}, key); }
  function avatarType(value) { return String(value || '').toLowerCase() === 'girl' ? 'girl' : 'boy'; }
  function avatarIcon(value) { return avatarType(value) === 'girl' ? '💅' : '🧢'; }
  function explicitPoints(updates) { return hasOwn(updates, 'points') || hasOwn(updates, 'coolPoints') || hasOwn(updates, 'cool_points'); }
  function readUpdatePoints(updates, fallback) { if (hasOwn(updates, 'points')) return num(updates.points); if (hasOwn(updates, 'coolPoints')) return num(updates.coolPoints); if (hasOwn(updates, 'cool_points')) return num(updates.cool_points); return num(fallback); }
  function isPlaceholder(value) { const text = String(value || '').trim(); return !text || /PASTE_|YOUR_|PROJECT_URL|ANON_PUBLIC_KEY/i.test(text); }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const old = Array.from(document.scripts).find((s) => s.src && s.src.includes(src));
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
      return { url: String(c.url || '').trim(), anonKey: String(c.anonKey || c.anon_key || '').trim(), table: c.profileTable || PROFILE_TABLE };
    })();
    return cfgPromise;
  }

  async function getClient() {
    if (client) return client;
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

  function localSession() { return jsonGet(LOCAL_SESSION, null); }
  function saveLocalSession(session) { jsonSet(LOCAL_SESSION, session); }
  function clearLocalSession() { try { localStorage.removeItem(LOCAL_SESSION); } catch {} }
  function localUsers() { return jsonGet(LOCAL_USERS, {}); }
  function saveLocalUsers(users) { jsonSet(LOCAL_USERS, users); }
  function localPoints() { return num(textGet(POINTS_KEY)); }
  function saveLocalPoints(points) { textSet(POINTS_KEY, Math.max(0, parseInt(points, 10) || 0)); }
  function saveLocalProfileName(name) { textSet('hyphsworld.playerName', name || 'Guest'); }
  function saveLocalAvatar(type) { textSet('hyphsworld.avatarType', avatarType(type)); textSet('hyphsworld.avatarIcon', avatarIcon(type)); }

  async function rowFor(user) {
    const sb = await getClient();
    if (!sb || !user) return null;
    const c = await getConfig();
    const { data, error } = await sb.from(c.table).select('*').eq('id', user.id).maybeSingle();
    if (error && error.code !== 'PGRST116') console.warn('HYPHSWORLD profile fetch warning:', error.message);
    return data || null;
  }

  async function upsertRow(user, updates = {}) {
    const sb = await getClient();
    if (!sb || !user) return null;
    const c = await getConfig();
    const meta = user.user_metadata || {};
    const current = await rowFor(user);
    const nextPoints = explicitPoints(updates) ? readUpdatePoints(updates, current?.points ?? meta.points ?? 0) : num(current?.points ?? meta.points ?? 0);
    const currentLifetime = num(current?.lifetime_points ?? meta.lifetimePoints ?? nextPoints);
    const requestedLifetime = hasOwn(updates, 'lifetimePoints') ? num(updates.lifetimePoints) : num(updates.lifetime_points);
    const nextLifetime = Math.max(currentLifetime, requestedLifetime, nextPoints);
    const nextAvatarType = avatarType(updates.avatarType || updates.avatar_type || current?.avatar_type || meta.avatarType || 'boy');

    const row = {
      id: user.id,
      username: String(updates.username || current?.username || meta.username || usernameFromEmail(user.email)).slice(0, 30),
      display_name: String(updates.displayName || updates.display_name || current?.display_name || meta.displayName || displayFromEmail(user.email)).slice(0, 40),
      duck_status: String(updates.duckStatus || updates.duck_status || current?.duck_status || meta.duckStatus || 'Duck Sauce is watching this account.').slice(0, 90),
      buck_clearance: String(updates.buckClearance || updates.buck_clearance || current?.buck_clearance || meta.buckClearance || 'Lobby clearance only').slice(0, 90),
      avatar_type: nextAvatarType,
      avatar_icon: avatarIcon(nextAvatarType),
      points: nextPoints,
      lifetime_points: nextLifetime,
      level_1_unlocked: Boolean(current?.level_1_unlocked || updates.level1Unlocked || updates.level_1_unlocked),
      level_2_unlocked: Boolean(current?.level_2_unlocked || updates.level2Unlocked || updates.level_2_unlocked),
      updated_at: new Date().toISOString()
    };

    if (row.level_1_unlocked && !current?.vault_access_granted_at) row.vault_access_granted_at = new Date().toISOString();
    if (current?.vault_access_granted_at) row.vault_access_granted_at = current.vault_access_granted_at;

    const { data, error } = await sb.from(c.table).upsert(row, { onConflict: 'id' }).select().maybeSingle();
    if (error) throw new Error(error.message || 'Profile save failed.');
    return data || row;
  }

  async function addLedger(user, amount, reason) {
    const sb = await getClient();
    if (!sb || !user || !amount) return;
    try { await sb.from('points_ledger').insert({ user_id: user.id, amount, reason: reason || 'site_action', metadata: { source: 'hyphsworld_frontend' } }); } catch (error) {}
  }

  async function addVaultUnlock(user, levelKey) {
    const sb = await getClient();
    if (!sb || !user) return;
    try { await sb.from('vault_unlocks').insert({ user_id: user.id, level_key: levelKey || 'level_1' }); } catch (error) {}
  }

  function sessionFromUser(user) { return { email: user.email || '', userId: user.id || '', provider: 'supabase', createdAt: Date.now() }; }

  async function signUpWithEmail(email, password) {
    email = normalizeEmail(email);
    if (!email || !password) throw new Error('Email and password are required.');
    const sb = await getClient();
    if (!sb) return mockSignUp(email, password);
    const displayName = displayFromEmail(email);
    const startingPoints = localPoints();
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: AUTH_REDIRECT_URL, data: { displayName, username: usernameFromEmail(email), duckStatus: 'Duck Sauce has not fined this account yet.', buckClearance: 'Lobby clearance only', avatarType: 'boy', avatarIcon: '🧢', points: startingPoints, lifetimePoints: startingPoints } }
    });
    if (error) throw new Error(error.message || 'Sign up failed.');
    if (data && data.user) await upsertRow(data.user, { displayName, avatarType: 'boy', points: startingPoints, lifetimePoints: startingPoints });
    const session = data && data.user ? sessionFromUser(data.user) : { email, userId: '', provider: 'supabase' };
    saveLocalSession(session);
    saveLocalProfileName(displayName);
    saveLocalAvatar('boy');
    return session;
  }

  async function signInWithEmail(email, password) {
    email = normalizeEmail(email);
    const sb = await getClient();
    if (!sb) return mockSignIn(email, password);
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message || 'Invalid credentials.');
    if (!data || !data.user) throw new Error('No user returned.');
    let row = await rowFor(data.user);
    if (!row) row = await upsertRow(data.user, { displayName: data.user.user_metadata?.displayName || displayFromEmail(email) });
    saveLocalPoints(row?.points ?? 0);
    saveLocalProfileName(row?.display_name || displayFromEmail(email));
    saveLocalAvatar(row?.avatar_type || 'boy');
    const session = sessionFromUser(data.user);
    saveLocalSession(session);
    return session;
  }

  async function signOut() { const sb = await getClient(); if (sb) await sb.auth.signOut(); clearLocalSession(); }

  async function getSession() {
    const sb = await getClient();
    if (!sb) return localSession();
    const { data } = await sb.auth.getSession();
    if (!data || !data.session || !data.session.user) { clearLocalSession(); return null; }
    const session = sessionFromUser(data.session.user);
    saveLocalSession(session);
    return session;
  }

  async function getCurrentUser() {
    const sb = await getClient();
    if (sb) {
      const { data } = await sb.auth.getUser();
      if (!data || !data.user) return null;
      const user = data.user;
      const row = (await rowFor(user)) || (await upsertRow(user, { displayName: user.user_metadata?.displayName || displayFromEmail(user.email) }));
      const points = num(row?.points ?? user.user_metadata?.points ?? 0);
      const type = avatarType(row?.avatar_type || user.user_metadata?.avatarType || 'boy');
      saveLocalPoints(points);
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
        avatarIcon: row?.avatar_icon || avatarIcon(type),
        coolPoints: points,
        lifetimePoints: num(row?.lifetime_points ?? points),
        level1Unlocked: Boolean(row?.level_1_unlocked),
        level2Unlocked: Boolean(row?.level_2_unlocked)
      };
    }
    const session = localSession();
    if (!session || !session.email) return null;
    const users = localUsers();
    const stored = users[session.email] || {};
    const type = avatarType(stored.avatarType || 'boy');
    return { email: session.email, userId: session.userId, provider: 'mock', displayName: stored.displayName || displayFromEmail(session.email), duckStatus: stored.duckStatus || 'Duck Sauce is watching this account from a folding chair.', buckClearance: stored.buckClearance || 'Lobby clearance only', avatarType: type, avatarIcon: avatarIcon(type), coolPoints: num(stored.coolPoints ?? localPoints()), lifetimePoints: num(stored.lifetimePoints ?? stored.coolPoints ?? localPoints()), level1Unlocked: Boolean(stored.level1Unlocked), level2Unlocked: Boolean(stored.level2Unlocked) };
  }

  async function updateProfile(updates) {
    const sb = await getClient();
    const type = avatarType(updates.avatarType || updates.avatar_type || 'boy');
    if (sb) {
      const { data } = await sb.auth.getUser();
      if (!data || !data.user) throw new Error('Login required.');
      const current = await rowFor(data.user);
      const clean = { displayName: String(updates.displayName || current?.display_name || displayFromEmail(data.user.email)).trim().slice(0, 40), duckStatus: String(updates.duckStatus || current?.duck_status || 'Duck Sauce has no official notes.').trim().slice(0, 90), buckClearance: String(updates.buckClearance || current?.buck_clearance || 'Lobby clearance only').trim().slice(0, 90), avatarType: type, avatarIcon: avatarIcon(type) };
      await sb.auth.updateUser({ data: clean });
      await upsertRow(data.user, clean);
      saveLocalProfileName(clean.displayName);
      saveLocalAvatar(type);
      return getCurrentUser();
    }
    const session = localSession();
    if (!session || !session.email) throw new Error('Login required.');
    const users = localUsers();
    const current = users[session.email] || { email: session.email };
    users[session.email] = { ...current, displayName: String(updates.displayName || current.displayName || displayFromEmail(session.email)).trim().slice(0, 40), duckStatus: String(updates.duckStatus || current.duckStatus || 'Duck Sauce has no official notes.').trim().slice(0, 90), buckClearance: String(updates.buckClearance || current.buckClearance || 'Lobby clearance only').trim().slice(0, 90), avatarType: type, avatarIcon: avatarIcon(type), coolPoints: num(current.coolPoints ?? localPoints()), lifetimePoints: Math.max(num(current.lifetimePoints), num(current.coolPoints ?? localPoints())), updatedAt: Date.now() };
    saveLocalUsers(users);
    saveLocalProfileName(users[session.email].displayName);
    saveLocalAvatar(type);
    return getCurrentUser();
  }

  async function getPoints() { const user = await getCurrentUser(); return num(user?.coolPoints ?? localPoints()); }

  async function setPoints(value, reason) {
    const next = Math.max(0, parseInt(value, 10) || 0);
    const sb = await getClient();
    if (sb) {
      const { data } = await sb.auth.getUser();
      if (data && data.user) { const current = await rowFor(data.user); const lifetime = Math.max(num(current?.lifetime_points), next); saveLocalPoints(next); await sb.auth.updateUser({ data: { points: next, lifetimePoints: lifetime } }); await upsertRow(data.user, { points: next, lifetimePoints: lifetime }); return next; }
    } else {
      const session = localSession();
      if (session?.email) { const users = localUsers(); if (users[session.email]) { users[session.email].coolPoints = next; users[session.email].lifetimePoints = Math.max(num(users[session.email].lifetimePoints), next); saveLocalUsers(users); } }
    }
    saveLocalPoints(next);
    return next;
  }

  async function addPoints(amount, reason) {
    const n = parseInt(amount, 10) || 0;
    const sb = await getClient();
    if (sb) {
      const { data } = await sb.auth.getUser();
      if (data && data.user) { const current = await rowFor(data.user); const currentPoints = num(current?.points ?? 0); const currentLifetime = num(current?.lifetime_points ?? currentPoints); const next = Math.max(0, currentPoints + n); saveLocalPoints(next); await upsertRow(data.user, { points: next, lifetimePoints: Math.max(currentLifetime, next) }); await addLedger(data.user, n, reason || 'site_action'); return next; }
    }
    return setPoints((await getPoints()) + n, reason);
  }

  async function grantVaultAccess(levelKey) {
    const normalizedLevel = levelKey || 'level_1';
    const sb = await getClient();
    if (sb) { const { data } = await sb.auth.getUser(); if (data && data.user) { await upsertRow(data.user, normalizedLevel === 'level_2' ? { level2Unlocked: true } : { level1Unlocked: true }); await addVaultUnlock(data.user, normalizedLevel); } }
    else { const session = localSession(); if (session?.email) { const users = localUsers(); if (users[session.email]) { if (normalizedLevel === 'level_2') users[session.email].level2Unlocked = true; else users[session.email].level1Unlocked = true; saveLocalUsers(users); } } }
    return true;
  }

  async function getProviderStatus() { const c = await getConfig(); const ready = Boolean(await getClient()); return { provider: ready ? 'supabase' : 'mock', supabaseConfigured: ready, urlPresent: !isPlaceholder(c.url), anonKeyPresent: !isPlaceholder(c.anonKey), profileTable: c.table }; }

  async function mockSignUp(email, password) { const users = localUsers(); if (users[email]) throw new Error('Account already exists.'); const startingPoints = localPoints(); users[email] = { email, password, displayName: displayFromEmail(email), duckStatus: 'Duck Sauce has not fined this account yet.', buckClearance: 'Lobby clearance only', avatarType: 'boy', avatarIcon: '🧢', coolPoints: startingPoints, lifetimePoints: startingPoints, createdAt: Date.now() }; saveLocalUsers(users); const session = { email, userId: 'mock_' + btoa(email), provider: 'mock', createdAt: Date.now() }; saveLocalSession(session); return session; }
  async function mockSignIn(email, password) { const users = localUsers(); if (!users[email] || users[email].password !== password) throw new Error('Invalid credentials.'); saveLocalPoints(users[email].coolPoints || 0); saveLocalProfileName(users[email].displayName || displayFromEmail(email)); saveLocalAvatar(users[email].avatarType || 'boy'); const session = { email, userId: 'mock_' + btoa(email), provider: 'mock', createdAt: Date.now() }; saveLocalSession(session); return session; }

  global.HWAuth = { getProviderStatus, signUpWithEmail, signInWithEmail, signOut, getSession, getCurrentUser, updateProfile, getPoints, setPoints, addPoints, grantVaultAccess };
})(window);
