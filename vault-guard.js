(function(){
  function hasAuthClient() {
    return !!(window.HWAuth && typeof window.HWAuth.getSession === 'function');
  }

  async function hasSession() {
    if (!hasAuthClient()) return null;
    try {
      const session = await window.HWAuth.getSession();
      return !!(session && session.userId);
    } catch (_) {
      return false;
    }
  }

  function hasLegacyVaultAccess() {
    const granted = sessionStorage.getItem('hyphsworld_vault_access') === 'granted';
    const time = Number(sessionStorage.getItem('hyphsworld_vault_access_time') || 0);
    return granted && (Date.now() - time < 1000 * 60 * 60 * 4);
  }

  (async function run(){
    const authed = await hasSession();
    if (hasAuthClient() && authed === false) {
      const current = (location.pathname.split('/').pop() || 'vault.html');
      location.replace('auth.html?next=' + encodeURIComponent(current));
      return;
    }
    if (!hasLegacyVaultAccess()) {
      const current = (location.pathname.split('/').pop() || 'vault.html');
      location.replace('login.html?from=' + encodeURIComponent(current));
    }
  })();
})();
