(function () {
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(async function () {
    var statusEl = document.getElementById('login-status');
    var authLink = document.getElementById('auth-link');
    var navAccountLink = document.getElementById('nav-account-link');
    var mobileNavAccountLink = document.getElementById('mobile-nav-account-link');
    var logoutButton = document.getElementById('home-logout');
    var year = document.getElementById('year');
    var menuToggle = document.querySelector('.mobile-menu-toggle');
    var menuPanel = document.getElementById('mobile-menu-panel');

    if (year) year.textContent = new Date().getFullYear();

    if (menuToggle && menuPanel) {
      menuToggle.addEventListener('click', function () {
        var open = menuPanel.classList.toggle('is-open');
        menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        menuToggle.textContent = open ? 'Menu ▲' : 'Menu ▼';
      });
    }

    if (!window.HWAuth || !statusEl || !authLink) {
      if (statusEl) statusEl.textContent = 'Auth unavailable';
      return;
    }

    var session = await HWAuth.getSession();

    function setAccountLinks(text, href) {
      authLink.textContent = text;
      authLink.href = href;
      if (navAccountLink) {
        navAccountLink.textContent = text === 'Manage Account' ? 'Manage ID' : 'Create ID';
        navAccountLink.href = href;
      }
      if (mobileNavAccountLink) {
        mobileNavAccountLink.textContent = text === 'Manage Account' ? 'Manage ID' : 'Create ID';
        mobileNavAccountLink.href = href;
      }
    }

    if (session && session.email) {
      statusEl.textContent = 'Logged in as ' + session.email;
      setAccountLinks('Manage Account', 'account.html');
      if (logoutButton) logoutButton.hidden = false;
    } else {
      statusEl.textContent = 'Not logged in';
      setAccountLinks('Create ID / Login', 'auth.html');
      if (logoutButton) logoutButton.hidden = true;
    }

    if (logoutButton) {
      logoutButton.addEventListener('click', async function () {
        await HWAuth.signOut();
        statusEl.textContent = 'Logged out.';
        logoutButton.hidden = true;
        setAccountLinks('Create ID / Login', 'auth.html');
      });
    }
  });
})();
