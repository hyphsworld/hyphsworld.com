/* HYPHSWORLD VAULT GUARD
   Add this script to protected Vault pages:
   <script src="vault-guard.js" defer></script>

   This checks the session created by login.html.
*/

(function () {
  const AUTH_KEY = "hyphsworld_vault_access";
  const AUTH_TIME_KEY = "hyphsworld_vault_access_time";
  const ACCESS_DURATION_MS = 1000 * 60 * 60 * 4;
  const LOGIN_PAGE = "login.html";

  function hasAccess() {
    const granted = sessionStorage.getItem(AUTH_KEY) === "granted";
    const timestamp = Number(sessionStorage.getItem(AUTH_TIME_KEY) || 0);
    const fresh = Date.now() - timestamp < ACCESS_DURATION_MS;
    return granted && fresh;
  }

  if (!hasAccess()) {
    const current = window.location.pathname.split("/").pop() || "vault.html";
    const target = `${LOGIN_PAGE}?from=${encodeURIComponent(current)}`;
    window.location.replace(target);
  }
})();
