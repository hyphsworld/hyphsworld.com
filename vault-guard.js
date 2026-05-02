(function(){
  async function hasSession() {
    if (!window.HWAuth) return null;
    const session = await window.HWAuth.getSession();
    return !!(session && session.userId);
  }

  function hasLegacyVaultAccess() {
    const granted = sessionStorage.getItem('hyphsworld_vault_access') === 'granted';
    const time = Number(sessionStorage.getItem('hyphsworld_vault_access_time') || 0);
    return granted && (Date.now() - time < 1000 * 60 * 60 * 4);
  }

  (async function run(){
    const authed = await hasSession();
    if (authed === false) {
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
