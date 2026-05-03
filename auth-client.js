(function (global) {
  'use strict';

  const CONFIG_FILE = 'supabase-config.js';
  const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  const LOCAL_SESSION = 'hw_auth_session_v1';
  const LOCAL_USERS = 'hw_mock_users_v1';
  const POINTS_KEY = 'hyphsworld.coolPoints.total';
  const PROFILE_TABLE = 'hw_profiles';

  let cfgPromise = null;
  let clientPromise = null;
  let client = null;

  function jsonGet(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch { return fallback; }
  }

  function jsonSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function textGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function textSet(key, value) {
    try { localStorage.setItem(key, String(value)); } catch {}
  }

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function displayFromEmail(email) {
    return String(email || '').split('@')[0] || 'HYPHSWORLD Guest';
  }

  function num(value) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function isPlaceholder(value) {
    const text = String(value || '').trim();
    return !text || /PASTE_|YOUR_|PROJECT_URL|ANON_PUBLIC_KEY/i.test(text);
  }

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
      if (!global.HW_SUPABASE_CONFIG) {
        try { await loadScript(CONFIG_FILE); } catch {}
      }
      const c = global.HW_SUPABASE_CONFIG || {};
      return {
        url: String(c.url || '').trim(),
        anonKey: String(c.anonKey || c.anon_key || '').trim(),
        table: c.profileTable || PROFILE_TABLE
      };
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
      client = global.supabase.createClient(c.url, c.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
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

  async function rowFor(user) {
    const sb = await getClient();
    if (!sb || !user) return null;
    const c = await getConfig();
    const { data } = await sb.from(c.table).select('*').eq('id', user.id).maybeSingle();
    return data || null;
  }

  async function upsertRow(user, updates) {
    const sb = await getClient();
    if (!sb || !user) return null;
    const c = await getConfig();
    const meta = user.user_metadata || {};
    const row = {
      id: user.id,
      email: user.email || '',
      display_name: String(updates.displayName || updates.display_name || meta.displayName || displayFromEmail(user.email)).slice(0, 40),
      duck_status: String(updates.duckStatus || updates.duck_status || meta.duckStatus || 'Duck Sauce is watching this account.').slice(0, 90),
      buck_clearance: String(updates.buckClearance || updates.buck_clearance || meta.buckClearance || 'Lobby clearance only').slice(0, 90),
      cool_points: Math.max(0, parseInt(updates.coolPoints ?? updates.cool_points ?? localPoints(), 10) || 0),
      updated_at: new Date().toISOString()
    };
    if (updates.level1Unlocked || updates.level_1_unlocked) {
      row.level_1_unlocked = true;
      row.vault_access_granted_at = new Date().toISOString();
    }
    const { data } = await sb.from(c.table).upsert(row, { onConflict: 'id' }).select().maybeSingle();
    return data || row;
  }

  function sessionFromUser(user) {
    return { email: user.email || '', userId: user.id || '', provider: 'supabase', createdAt: Date.now() };
  }

  async function signUpWithEmail(email, password) {
    email = normalizeEmail(email);
    if (!email || !password) throw new Error('Email and password are required.');
    const sb = await getClient();
    if (!sb) return mockSignUp(email, password);
    const displayName = displayFromEmail(email);
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { displayName, duckStatus: 'Duck Sauce has not fined this account yet.', buckClearance: 'Lobby clearance only', coolPoints: localPoints() } }
    });
    if (error) throw new Error(error.message || 'Sign up failed.');
    if (data && data.user) await upsertRow(data.user, { displayName, coolPoints: localPoints() });
    const session = data && data.user ? sessionFromUser(data.user) : { email, userId: '', provider: 'supabase' };
    saveLocalSession(session);
    return session;
  }

  async function signInWithEmail(email, password) {
    email = normalizeEmail(email);
    const sb = await getClient();
    if (!sb) return mockSignIn(email, password);
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message || 'Invalid credentials.');
    if (!data || !data.user) throw new Error('No user returned.');
    const row = await upsertRow(data.user, { displayName: data.user.user_metadata?.displayName || displayFromEmail(email) });
    if (row && Number.isFinite(Number(row.cool_points))) saveLocalPoints(row.cool_points);
    const session = sessionFromUser(data.user);
    saveLocalSession(session);
    return session;
  }

  async function signOut() {
    const sb = await getClient();
    if (sb) await sb.auth.signOut();
    clearLocalSession();
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

  async function getCurrentUser() {
    const sb = await getClient();
    if (sb) {
      const { data } = await sb.auth.getUser();
      if (!data || !data.user) return null;
      const user = data.user;
      const row = (await rowFor(user)) || (await upsertRow(user, { displayName: user.user_metadata?.displayName || displayFromEmail(user.email) }));
      const points = num(row?.cool_points ?? user.user_metadata?.coolPoints ?? localPoints());
      saveLocalPoints(points);
      return {
        email: user.email || '',
        userId: user.id || '',
        provider: 'supabase',
        displayName: row?.display_name || user.user_metadata?.displayName || displayFromEmail(user.email),
        duckStatus: row?.duck_status || user.user_metadata?.duckStatus || 'Duck Sauce is watching this account from a folding chair.',
        buckClearance: row?.buck_clearance || user.user_metadata?.buckClearance || 'Lobby clearance only',
        coolPoints: points,
        level1Unlocked: Boolean(row?.level_1_unlocked)
      };
    }
    const session = localSession();
    if (!session || !session.email) return null;
    const users = localUsers();
    const stored = users[session.email] || {};
    return {
      email: session.email,
      userId: session.userId,
      provider: 'mock',
      displayName: stored.displayName || displayFromEmail(session.email),
      duckStatus: stored.duckStatus || 'Duck Sauce is watching this account from a folding chair.',
      buckClearance: stored.buckClearance || 'Lobby clearance only',
      coolPoints: num(stored.coolPoints ?? localPoints()),
      level1Unlocked: Boolean(stored.level1Unlocked)
    };
  }

  async function updateProfile(updates) {
    const sb = await getClient();
    if (sb) {
      const { data } = await sb.auth.getUser();
      if (!data || !data.user) throw new Error('Login required.');
      const clean = {
        displayName: String(updates.displayName || displayFromEmail(data.user.email)).trim().slice(0, 40),
        duckStatus: String(updates.duckStatus || 'Duck Sauce has no official notes.').trim().slice(0, 90),
        buckClearance: String(updates.buckClearance || 'Lobby clearance only').trim().slice(0, 90),
        coolPoints: localPoints()
      };
      await sb.auth.updateUser({ data: clean });
      await upsertRow(data.user, clean);
      return getCurrentUser();
    }
    const session = localSession();
    if (!session || !session.email) throw new Error('Login required.');
    const users = localUsers();
    const current = users[session.email] || { email: session.email };
    users[session.email] = {
      ...current,
      displayName: String(updates.displayName || current.displayName || displayFromEmail(session.email)).trim().slice(0, 40),
      duckStatus: String(updates.duckStatus || current.duckStatus || 'Duck Sauce has no official notes.').trim().slice(0, 90),
      buckClearance: String(updates.buckClearance || current.buckClearance || 'Lobby clearance only').trim().slice(0, 90),
      coolPoints: localPoints(),
      updatedAt: Date.now()
    };
    saveLocalUsers(users);
    return getCurrentUser();
  }

  async function getPoints() {
    const user = await getCurrentUser();
    return num(user?.coolPoints ?? localPoints());
  }

  async function setPoints(value) {
    const next = Math.max(0, parseInt(value, 10) || 0);
    saveLocalPoints(next);
    const sb = await getClient();
    if (sb) {
      const { data } = await sb.auth.getUser();
      if (data && data.user) {
        await sb.auth.updateUser({ data: { coolPoints: next } });
        await upsertRow(data.user, { coolPoints: next });
      }
    } else {
      const session = localSession();
      if (session?.email) {
        const users = localUsers();
        if (users[session.email]) { users[session.email].coolPoints = next; saveLocalUsers(users); }
      }
    }
    return next;
  }

  async function addPoints(amount) {
    return setPoints((await getPoints()) + (parseInt(amount, 10) || 0));
  }

  async function grantVaultAccess() {
    const sb = await getClient();
    if (sb) {
      const { data } = await sb.auth.getUser();
      if (data && data.user) await upsertRow(data.user, { level1Unlocked: true, coolPoints: localPoints() });
    } else {
      const session = localSession();
      if (session?.email) {
        const users = localUsers();
        if (users[session.email]) { users[session.email].level1Unlocked = true; saveLocalUsers(users); }
      }
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
    users[email] = { email, password, displayName: displayFromEmail(email), duckStatus: 'Duck Sauce has not fined this account yet.', buckClearance: 'Lobby clearance only', coolPoints: localPoints(), createdAt: Date.now() };
    saveLocalUsers(users);
    const session = { email, userId: 'mock_' + btoa(email), provider: 'mock', createdAt: Date.now() };
    saveLocalSession(session);
    return session;
  }

  async function mockSignIn(email, password) {
    const users = localUsers();
    if (!users[email] || users[email].password !== password) throw new Error('Invalid credentials.');
    saveLocalPoints(users[email].coolPoints || 0);
    const session = { email, userId: 'mock_' + btoa(email), provider: 'mock', createdAt: Date.now() };
    saveLocalSession(session);
    return session;
  }

  global.HWAuth = { getProviderStatus, signUpWithEmail, signInWithEmail, signOut, getSession, getCurrentUser, updateProfile, getPoints, setPoints, addPoints, grantVaultAccess };
})(window);
