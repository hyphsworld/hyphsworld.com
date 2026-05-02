(function (global) {
  const cfg = {
    provider: (global.AUTH_PROVIDER || 'mock').toLowerCase(),
    storageKey: 'hw_auth_session_v1',
    usersKey: 'hw_mock_users_v1',
  };

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function readSession() {
    return readJson(cfg.storageKey, null);
  }

  function writeSession(session) {
    writeJson(cfg.storageKey, session);
  }

  function clearSession() {
    localStorage.removeItem(cfg.storageKey);
  }

  function readUsers() {
    return readJson(cfg.usersKey, {});
  }

  function writeUsers(users) {
    writeJson(cfg.usersKey, users);
  }

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function getDisplayNameFromEmail(email) {
    return String(email || '').split('@')[0] || 'HYPHSWORLD Guest';
  }

  async function signUpWithEmail(email, password) {
    email = normalizeEmail(email);
    if (!email || !password) throw new Error('Email and password are required.');
    const users = readUsers();
    if (users[email]) throw new Error('Account already exists.');
    users[email] = {
      email,
      password,
      createdAt: Date.now(),
      displayName: getDisplayNameFromEmail(email),
      duckStatus: 'Duck Sauce has not fined this account yet.',
      buckClearance: 'Lobby clearance only',
    };
    writeUsers(users);
    const session = { email, userId: 'mock_' + btoa(email), createdAt: Date.now() };
    writeSession(session);
    return session;
  }

  async function signInWithEmail(email, password) {
    email = normalizeEmail(email);
    const users = readUsers();
    const user = users[email];
    if (!user || user.password !== password) throw new Error('Invalid credentials.');
    const session = { email, userId: 'mock_' + btoa(email), createdAt: Date.now() };
    writeSession(session);
    return session;
  }

  async function signOut() {
    clearSession();
  }

  async function getSession() {
    return readSession();
  }

  async function getCurrentUser() {
    const session = readSession();
    if (!session || !session.email) return null;
    const users = readUsers();
    const stored = users[session.email] || {};
    return {
      email: session.email,
      userId: session.userId,
      createdAt: stored.createdAt || session.createdAt || Date.now(),
      displayName: stored.displayName || getDisplayNameFromEmail(session.email),
      duckStatus: stored.duckStatus || 'Duck Sauce is watching this account from a folding chair.',
      buckClearance: stored.buckClearance || 'Lobby clearance only',
    };
  }

  async function updateProfile(updates) {
    const session = readSession();
    if (!session || !session.email) throw new Error('Login required.');
    const users = readUsers();
    const current = users[session.email] || { email: session.email, createdAt: Date.now() };
    const next = {
      ...current,
      displayName: String(updates.displayName || current.displayName || getDisplayNameFromEmail(session.email)).trim() || getDisplayNameFromEmail(session.email),
      duckStatus: String(updates.duckStatus || current.duckStatus || 'Duck Sauce has no official notes. Suspicious.').trim(),
      buckClearance: String(updates.buckClearance || current.buckClearance || 'Lobby clearance only').trim(),
      updatedAt: Date.now(),
    };
    users[session.email] = next;
    writeUsers(users);
    return getCurrentUser();
  }

  global.HWAuth = {
    config: cfg,
    signUpWithEmail,
    signInWithEmail,
    signOut,
    getSession,
    getCurrentUser,
    updateProfile,
  };
})(window);
