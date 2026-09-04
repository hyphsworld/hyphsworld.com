(function () {
  'use strict';

  if (window.__HW_AUTH_STABILITY__) return;
  window.__HW_AUTH_STABILITY__ = true;

  var AVATARS = {
    boy: '🧢', girl: '💅', fox: '🦊', lion: '🦁', panda: '🐼', wolf: '🐺',
    alien: '👽', robot: '🤖', ghost: '👻', ninja: '🥷', crown: '👑', diamond: '💎'
  };
  var SESSION_TTL = 45000;
  var USER_TTL = 45000;
  var WALLET_TTL = 20000;
  var PROFILE_TTL = 45000;
  var sessionCache = null;
  var sessionAt = 0;
  var userCache = null;
  var userAt = 0;
  var walletCache = null;
  var walletAt = 0;
  var profileCache = null;
  var profileAt = 0;
  var patchStarted = false;

  function now() { return Date.now(); }
  function fresh(ts, ttl) { return ts && now() - ts < ttl; }
  function num(value) {
    var parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }
  function avatarType(value) {
    var clean = String(value || '').toLowerCase().trim();
    return AVATARS[clean] ? clean : 'boy';
  }
  function avatarIcon(value) { return AVATARS[avatarType(value)] || '🧢'; }
  function displayFromEmail(email) { return String(email || '').split('@')[0] || 'HYPHSWORLD Guest'; }
  function usernameFromEmail(email) { return displayFromEmail(email).replace(/[^a-z0-9_]/gi, '_').slice(0, 30) || 'hyphsworld_guest'; }
  function setText(key, value) { try { localStorage.setItem(key, String(value)); } catch (error) {} }
  function removeText(key) { try { localStorage.removeItem(key); } catch (error) {} }
  function getText(key) { try { return localStorage.getItem(key); } catch (error) { return null; } }
  function setJson(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) {} }
  function clearCaches() {
    sessionCache = null;
    sessionAt = 0;
    userCache = null;
    userAt = 0;
    walletCache = null;
    walletAt = 0;
    profileCache = null;
    profileAt = 0;
  }
  function saveSession(user) {
    if (!user) return;
    setJson('hw_auth_session_v1', { email: user.email || '', userId: user.id || '', provider: 'supabase', createdAt: Date.now() });
  }
  function savePoints(points, source) {
    var value = num(points);
    setText('hyphsworld.coolPoints.total', value);
    setText('coolPoints', value);
    setText('hyphsworld_points', value);
    setText('HW_COOL_POINTS', value);
    try {
      document.dispatchEvent(new CustomEvent('hyph:points-updated', { detail: { points: value, source: source || 'auth-stability' } }));
      window.dispatchEvent(new CustomEvent('hw:points-change', { detail: { points: value, source: source || 'auth-stability' } }));
    } catch (error) {}
  }
  function saveProfileBits(profile, user) {
    var name = profile && profile.display_name || displayFromEmail(user && user.email);
    var type = avatarType(profile && profile.avatar_type || getText('hyphsworld.avatarType') || 'boy');
    setText('hyphsworld.playerName', name);
    setText('hyphsworld.avatarType', type);
    setText('hyphsworld.avatarIcon', avatarIcon(type));
  }

  async function client() {
    if (!window.HWAuth || !window.HWAuth.getClient) return null;
    return window.HWAuth.getClient();
  }

  async function session(force) {
    var sb = await client();
    if (!sb || !sb.auth) return null;
    if (!force && fresh(sessionAt, SESSION_TTL)) return sessionCache;
    var result = await sb.auth.getSession();
    sessionCache = result && result.data ? result.data.session : null;
    sessionAt = now();
    userCache = sessionCache && sessionCache.user ? sessionCache.user : null;
    userAt = now();
    if (userCache) saveSession(userCache);
    return sessionCache;
  }

  async function user(force) {
    if (!force && userCache && fresh(userAt, USER_TTL)) return userCache;
    var s = await session(force);
    userCache = s && s.user ? s.user : null;
    userAt = now();
    return userCache;
  }

  async function wallet(force) {
    var sb = await client();
    var u = await user(false);
    if (!sb || !u) return { balance: 0, lifetime_points: 0, rank_title: 'Lobby Rookie' };
    if (!force && walletCache && walletCache.userId === u.id && fresh(walletAt, WALLET_TTL)) return walletCache;
    var result = await sb.rpc('get_my_points');
    if (result.error) throw new Error(result.error.message || 'Could not load Cool Points.');
    var data = result.data || {};
    var balance = num(data.balance || data.cool_points || data.points);
    walletCache = { userId: u.id, balance: balance, lifetime_points: Math.max(num(data.lifetime_points), balance), rank_title: data.rank_title || 'Lobby Rookie' };
    walletAt = now();
    savePoints(balance, 'get_my_points');
    return walletCache;
  }

  async function profile(updates, force) {
    var sb = await client();
    var u = await user(false);
    if (!sb || !u) return null;
    if (!updates && !force && profileCache && profileCache.id === u.id && fresh(profileAt, PROFILE_TTL)) return profileCache;
    if (!updates) {
      var fetched = await sb.from('profiles').select('*').eq('id', u.id).maybeSingle();
      if (fetched.error) throw new Error(fetched.error.message || 'Profile load failed.');
      profileCache = fetched.data || {};
      profileCache.id = profileCache.id || u.id;
      profileAt = now();
      saveProfileBits(profileCache, u);
      return profileCache;
    }
    var current = profileCache || {};
    var clean = updates || {};
    var payload = {
      p_display_name: clean.displayName || clean.display_name || current.display_name || displayFromEmail(u.email),
      p_avatar_type: avatarType(clean.avatarType || clean.avatar_type || current.avatar_type || getText('hyphsworld.avatarType') || 'boy')
    };
    // Identity edits use a deliberately narrow RPC. Level unlocks, points, and
    // clearance fields are not accepted by this endpoint.
    var result = await sb.rpc('update_my_identity', payload);
    if (result.error) throw new Error(result.error.message || 'Profile save failed.');
    profileCache = result.data && result.data.profile ? result.data.profile : (result.data || {});
    profileCache.id = profileCache.id || u.id;
    profileAt = now();
    saveProfileBits(profileCache, u);
    return profileCache;
  }

  function publicUser(u, p, w) {
    var type = avatarType(p && p.avatar_type || 'boy');
    return {
      email: u.email || '',
      userId: u.id || '',
      provider: 'supabase',
      displayName: p && p.display_name || displayFromEmail(u.email),
      username: p && p.username || usernameFromEmail(u.email),
      duckStatus: p && p.duck_status || 'Duck Sauce is watching this account from a folding chair.',
      buckClearance: p && p.buck_clearance || 'Lobby clearance only',
      avatarType: type,
      avatarIcon: p && p.avatar_icon || avatarIcon(type),
      coolPoints: w.balance,
      points: w.balance,
      lifetimePoints: Math.max(w.lifetime_points, w.balance),
      level1Unlocked: Boolean(p && p.level_1_unlocked),
      level2Unlocked: Boolean(p && p.level_2_unlocked)
    };
  }

  function patch() {
    if (patchStarted || !window.HWAuth || !window.HWAuth.getClient) return false;
    patchStarted = true;
    var base = Object.assign({}, window.HWAuth);

    window.HWAuth.getSession = async function () {
      var s = await session(false);
      if (!s || !s.user) return null;
      saveSession(s.user);
      return { email: s.user.email || '', userId: s.user.id || '', provider: 'supabase', createdAt: Date.now() };
    };

    window.HWAuth.getCurrentUser = async function (force) {
      var u = await user(Boolean(force));
      if (!u) return null;
      var w = await wallet(Boolean(force));
      var p = await profile(null, Boolean(force));
      return publicUser(u, p || {}, w);
    };

    window.HWAuth.updateProfile = async function (updates) {
      var u = await user(false);
      if (!u) throw new Error('Login required.');
      var p = await profile(updates || {}, true);
      if (base.getClient) {
        try {
          var sb = await base.getClient();
          if (sb && sb.auth && sb.auth.updateUser) await sb.auth.updateUser({ data: updates || {} });
        } catch (error) {}
      }
      var w = await wallet(true);
      return publicUser(u, p || {}, w);
    };

    window.HWAuth.getPoints = async function () {
      var u = await user(false);
      if (!u) return 0;
      var w = await wallet(false);
      return w.balance;
    };

    window.HWAuth.grantVaultAccess = async function (levelKey, code) {
      var sb = await client();
      var s = await session(true);
      if (!sb || !s || !s.user) throw new Error('Login required.');
      if (!code) throw new Error('Vault code required.');
      var result = await sb.functions.invoke('vault-unlock', { body: { level: levelKey || 'level_1', code: code } });
      if (result.error) throw new Error(result.error.message || 'Vault unlock failed.');
      if (!result.data || result.data.ok !== true) throw new Error(result.data && result.data.error || 'Vault unlock denied.');
      profileCache = null;
      profileAt = 0;
      return true;
    };

    if (base.signInWithEmail) {
      window.HWAuth.signInWithEmail = async function (email, password) {
        clearCaches();
        var result = await base.signInWithEmail(email, password);
        await window.HWAuth.getCurrentUser(true).catch(function (error) {
          console.warn('HYPHSWORLD post-login hydration warning:', error && error.message || error);
        });
        try { document.dispatchEvent(new CustomEvent('hyph:auth-signed-in')); } catch (error) {}
        return result;
      };
    }

    if (base.signUpWithEmail) {
      window.HWAuth.signUpWithEmail = async function (email, password) {
        clearCaches();
        var result = await base.signUpWithEmail(email, password);
        await window.HWAuth.getCurrentUser(true).catch(function () {});
        try { document.dispatchEvent(new CustomEvent('hyph:auth-signed-in')); } catch (error) {}
        return result;
      };
    }

    if (base.signOut) {
      window.HWAuth.signOut = async function () {
        try { await base.signOut(); } finally {
          clearCaches();
          removeText('hw_auth_session_v1');
          removeText('hyphsworld.playerName');
          removeText('hyphsworld.avatarType');
          removeText('hyphsworld.avatarIcon');
          savePoints(0, 'logout');
        }
      };
    }

    console.info('HYPHSWORLD auth stability layer active.');
    return true;
  }

  if (!patch()) {
    var timer = setInterval(function () {
      if (patch()) clearInterval(timer);
    }, 80);
    setTimeout(function () { clearInterval(timer); }, 8000);
  }
})();
