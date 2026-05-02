(function (global) {
  const cfg = {
    provider: (global.AUTH_PROVIDER || 'mock').toLowerCase(),
    storageKey: 'hw_auth_session_v1',
  };

  function readSession() {
    try {
      const raw = localStorage.getItem(cfg.storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeSession(session) {
    localStorage.setItem(cfg.storageKey, JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem(cfg.storageKey);
  }

  async function signUpWithEmail(email, password) {
    if (!email || !password) throw new Error('Email and password are required.');
    const users = JSON.parse(localStorage.getItem('hw_mock_users_v1') || '{}');
    if (users[email]) throw new Error('Account already exists.');
    users[email] = {
      email,
      password,
      createdAt: Date.now(),
      displayName: email.split('@')[0],
    };
    localStorage.setItem('hw_mock_users_v1', JSON.stringify(users));
    const session = { email, userId: 'mock_' + btoa(email), createdAt: Date.now() };
    writeSession(session);
    return session;
  }

  async function signInWithEmail(email, password) {
    const users = JSON.parse(localStorage.getItem('hw_mock_users_v1') || '{}');
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

  global.HWAuth = {
    config: cfg,
    signUpWithEmail,
    signInWithEmail,
    signOut,
    getSession,
  };
})(window);
