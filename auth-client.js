(function (global) {
  const cfg = {
    provider: (global.AUTH_PROVIDER || 'disabled').toLowerCase(),
    storageKey: 'hw_auth_session_v1',
    allowMockOnHosts: ['localhost', '127.0.0.1'],
  };

  function isMockAllowed() {
    return cfg.provider === 'mock' && cfg.allowMockOnHosts.includes(location.hostname);
  }

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

  function canUseLocalEmailAuth() {
    return cfg.provider === 'disabled' || isMockAllowed();
  }

  function notConfiguredError() {
    return new Error('Auth provider not configured. Set AUTH_PROVIDER=mock for restricted local mock login or connect Supabase/Firebase for real accounts.');
  }

  async function signUpWithEmail(email, password) {
    if (!email || !password) throw new Error('Email and password are required.');
    if (!canUseLocalEmailAuth()) throw notConfiguredError();
    const mode = cfg.provider === 'disabled' ? 'local' : 'mock';
    const session = { email, userId: 'dev_' + btoa(email), createdAt: Date.now(), mode };
    writeSession(session);
    return session;
  }

  async function signInWithEmail(email, password) {
    if (!email || !password) throw new Error('Email and password are required.');
    if (!canUseLocalEmailAuth()) throw notConfiguredError();
    const mode = cfg.provider === 'disabled' ? 'local' : 'mock';
    const session = { email, userId: 'dev_' + btoa(email), createdAt: Date.now(), mode };
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
    isMockAllowed,
  };
})(window);
