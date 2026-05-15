(function () {
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function text(item) {
    return (item.textContent || '').trim().toLowerCase();
  }

  function removeMerchLinks() {
    var selectors = [
      'a[href="shop.html"]',
      'a[href="merch.html"]',
      'a[href="/shop.html"]',
      'a[href="/merch.html"]',
      '.main-nav a[href*="shop"]',
      '.main-nav a[href*="merch"]',
      '.button-row a[href*="shop"]',
      '.button-row a[href*="merch"]',
      '.mobile-menu-panel a[href*="shop"]',
      '.mobile-menu-panel a[href*="merch"]'
    ];

    selectors.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (link) {
        link.remove();
      });
    });

    document.querySelectorAll('a, button').forEach(function (item) {
      var label = text(item);
      if (label === 'merch' || label === 'shop' || label.indexOf('merch floor') !== -1) {
        item.remove();
      }
    });
  }

  function normalizeCasinoLinks() {
    document.querySelectorAll('a, button').forEach(function (item) {
      var label = text(item);
      var href = item.getAttribute && (item.getAttribute('href') || '');
      var shouldCasino =
        label === 'games' ||
        label === 'game' ||
        label.indexOf('earn arcade') !== -1 ||
        label.indexOf('casino') !== -1 ||
        href === 'games.html';

      if (!shouldCasino) return;

      if (item.tagName && item.tagName.toLowerCase() === 'a') {
        item.setAttribute('href', 'games.html');
      }

      if (label === 'games' || label === 'game' || label.indexOf('earn arcade') !== -1) {
        item.textContent = '🎰 Casino';
      }
    });
  }

  function directO1Links() {
    document.querySelectorAll('a[href="#o1-show"]').forEach(function (link) {
      link.setAttribute('href', '#top');
      if (text(link).indexOf('watch') !== -1) link.textContent = 'Watch 01 Show';
    });
  }

  function cleanLobbyRoutes() {
    removeMerchLinks();
    normalizeCasinoLinks();
    directO1Links();
  }

  ready(async function () {
    cleanLobbyRoutes();

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
        cleanLobbyRoutes();
      });
    }

    if (!window.HWAuth || !statusEl || !authLink) {
      if (statusEl) statusEl.textContent = 'Auth unavailable';
      return;
    }

    var session = await HWAuth.getSession();

    function setAccountLinks(label, href) {
      authLink.textContent = label;
      authLink.href = href;
      if (navAccountLink) {
        navAccountLink.textContent = label === 'Manage Account' ? 'Manage ID' : 'Create ID';
        navAccountLink.href = href;
      }
      if (mobileNavAccountLink) {
        mobileNavAccountLink.textContent = label === 'Manage Account' ? 'Manage ID' : 'Create ID';
        mobileNavAccountLink.href = href;
      }
      cleanLobbyRoutes();
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
