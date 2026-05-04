(function () {
  "use strict";

  async function boot() {
    const year = document.getElementById("year");
    const authLink = document.getElementById("gamesAuthLink");
    if (year) year.textContent = new Date().getFullYear();

    if (!window.HWAuth || !authLink) return;

    try {
      const session = await window.HWAuth.getSession();
      if (session && session.email) {
        authLink.textContent = "Manage ID";
        authLink.href = "account.html";
      }
    } catch (error) {}
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
