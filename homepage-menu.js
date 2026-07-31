(function () {
  'use strict';

  if (window.__HW_HOME_SAFE_BOOT__) return;
  window.__HW_HOME_SAFE_BOOT__ = true;

  var VIDEO_ID = 'yDezFWqPbck';
  var WATCH_URL = 'https://youtu.be/yDezFWqPbck?is=lZgGifKVs8ijsZVl';
  var TITLE = 'MONEY COUNTER';
  var SUB = 'Hyph Life';
  var DROP = 'prod by K.M.T';

  function id(name) { return document.getElementById(name); }
  function one(sel) { return document.querySelector(sel); }
  function all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function escapeHTML(value) {
    return String(value || '').replace(/[&<>"']/g, function (match) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[match];
    });
  }

  function labelText(item) {
    return (item && item.textContent || '').trim().toLowerCase();
  }

  function injectSafetyCSS() {
    if (id('hwHomeMenuSafeCss')) return;
    var style = document.createElement('style');
    style.id = 'hwHomeMenuSafeCss';
    style.textContent = [
      'html{overflow-y:auto!important}',
      'body.home-page{overflow-y:auto!important;pointer-events:auto!important;touch-action:pan-y!important}',
      'body.home-page .hw-transport-overlay:not(.is-live){display:none!important;pointer-events:none!important}',
      '.mobile-menu-panel{display:none}',
      '.mobile-menu-panel.is-open{display:grid}',
      '.hw-login-chip{display:inline-flex;align-items:center;gap:10px;max-width:min(92vw,560px);padding:10px 13px;border-radius:999px;border:1px solid rgba(57,255,122,.34);background:rgba(0,0,0,.62);color:#fff}',
      '.hw-login-avatar{display:grid;place-items:center;width:38px;height:38px;border-radius:999px;background:linear-gradient(135deg,#39ff7a,#1ffcff,#ff4fd8);color:#050505;font-weight:1000}',
      '.hw-login-copy{display:grid;gap:2px;text-align:left}',
      '.hw-login-copy strong{font-size:.92rem;line-height:1;color:#fff}',
      '.hw-login-copy small{font-size:.72rem;color:#a9ff87;font-weight:800}',
      '.homepage-full-episode-strip{padding:8px 12px 9px!important;overflow:visible!important}',
      '.homepage-full-episode-strip span{display:block;font-size:clamp(14px,3.45vw,22px)!important;line-height:1.01!important;letter-spacing:.018em!important;text-shadow:0 0 6px rgba(255,255,255,.2)!important}',
      '.hw-west-sub{display:block;color:#1ffcff;font-size:.68em;line-height:.98;margin-top:3px;letter-spacing:.035em;text-shadow:0 0 8px rgba(31,252,255,.42)}',
      '.homepage-full-episode-strip .hw-west-drop{margin-top:4px;font-size:.76em;color:#1ffcff}'
    ].join('');
    document.head.appendChild(style);
  }

  function restoreMerchLinks() {
    var navTargets = [one('.main-nav'), id('mobile-menu-panel')];
    navTargets.forEach(function (nav) {
      if (!nav) return;
      var hasMerch = nav.querySelector('a[href="shop.html"], a[href="merch.html"], a[href="/shop.html"], a[href="/merch.html"]');
      if (hasMerch) return;
      var link = document.createElement('a');
      link.href = 'shop.html';
      link.textContent = 'Merch';
      link.className = 'nav-link merch-nav-link';
      nav.appendChild(link);
    });
  }

  function normalizeCasinoLinks() {
    all('a, button').forEach(function (item) {
      var label = labelText(item);
      var href = item.getAttribute && (item.getAttribute('href') || '');
      var shouldCasino = label === 'games' || label === 'game' || label.indexOf('earn arcade') !== -1 || label.indexOf('casino') !== -1 || href === 'games.html';
      if (!shouldCasino) return;
      if (item.tagName && item.tagName.toLowerCase() === 'a') item.setAttribute('href', 'games.html');
      if (label === 'games' || label === 'game' || label.indexOf('earn arcade') !== -1) item.textContent = '🎰 Casino';
    });
  }

  function directFeatureLinks() {
    all('a[href="#o1-show"]').forEach(function (link) {
      link.setAttribute('href', '#top');
      if (/watch|8 minutes|west/i.test(link.textContent || '')) link.textContent = 'Watch MONEY COUNTER';
    });
    all('a[href="#top"]').forEach(function (link) {
      if (/watch|8 minutes|west/i.test(link.textContent || '')) link.textContent = 'Watch MONEY COUNTER';
    });
  }

  function cleanLobbyRoutes() {
    restoreMerchLinks();
    normalizeCasinoLinks();
    directFeatureLinks();
  }

  function guestUI() {
    var statusEl = id('login-status');
    if (statusEl) {
      statusEl.className = 'hw-login-chip is-guest';
      statusEl.innerHTML = '<span class="hw-login-avatar">ID</span><span class="hw-login-copy"><strong>Guest Mode</strong><small>Login to sync Cool Points</small></span>';
    }
    setAccountLinks('Create ID / Login', 'auth.html');
    var logoutButton = id('home-logout');
    if (logoutButton) logoutButton.hidden = true;
  }

  function userUI(user, points) {
    var email = user && user.email || '';
    var display = user && user.user_metadata && (user.user_metadata.displayName || user.user_metadata.display_name) || String(email).split('@')[0] || 'HYPHSWORLD ID';
    var statusEl = id('login-status');
    if (statusEl) {
      statusEl.className = 'hw-login-chip is-signed-in';
      statusEl.innerHTML = '<span class="hw-login-avatar">ID</span><span class="hw-login-copy"><strong>' + escapeHTML(display) + '</strong><small>' + (Number.parseInt(points, 10) || 0).toLocaleString() + ' CP' + (email ? ' - ' + escapeHTML(email) : '') + '</small></span>';
    }
    setAccountLinks('Manage Account', 'account.html');
    var logoutButton = id('home-logout');
    if (logoutButton) logoutButton.hidden = false;
  }

  function setAccountLinks(label, href) {
    var authLink = id('auth-link');
    var navAccountLink = id('nav-account-link');
    var mobileNavAccountLink = id('mobile-nav-account-link');
    if (authLink) { authLink.textContent = label; authLink.href = href; }
    if (navAccountLink) { navAccountLink.textContent = label === 'Manage Account' ? 'Manage ID' : 'Create ID'; navAccountLink.href = href; }
    if (mobileNavAccountLink) { mobileNavAccountLink.textContent = label === 'Manage Account' ? 'Manage ID' : 'Create ID'; mobileNavAccountLink.href = href; }
    cleanLobbyRoutes();
  }

  function timeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        window.setTimeout(function () { reject(new Error('timeout')); }, ms);
      })
    ]);
  }

  async function loadSessionUI() {
    if (!window.HWAuth || typeof window.HWAuth.getSession !== 'function') {
      guestUI();
      return;
    }

    try {
      var session = await timeout(window.HWAuth.getSession(), 2600);
      var user = session && (session.user || session);
      if (!user || !user.email) {
        guestUI();
        return;
      }

      var points = 0;
      try {
        if (window.HWAuth.getPoints) points = await timeout(window.HWAuth.getPoints(), 2600);
        else if (window.HWPoints && window.HWPoints.get) points = window.HWPoints.get();
      } catch (error) {}
      userUI(user, points);
    } catch (error) {
      guestUI();
    }
  }

  function wireMobileMenu() {
    var menuToggle = one('.mobile-menu-toggle');
    var menuPanel = id('mobile-menu-panel');
    if (!menuToggle || !menuPanel || menuToggle.__hwMenuBound) return;
    menuToggle.__hwMenuBound = true;
    menuToggle.addEventListener('click', function () {
      var open = menuPanel.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuToggle.textContent = open ? 'Menu ▲' : 'Menu ▼';
      cleanLobbyRoutes();
    });
  }

  function wireLogout() {
    var logoutButton = id('home-logout');
    if (!logoutButton || logoutButton.__hwLogoutBound) return;
    logoutButton.__hwLogoutBound = true;
    logoutButton.addEventListener('click', async function () {
      try {
        if (window.HWAuth && typeof window.HWAuth.signOut === 'function') await window.HWAuth.signOut();
      } catch (error) {}
      guestUI();
    });
  }

  function polishFeature() {
    document.title = 'HYPHSWORLD | MONEY COUNTER';
    directFeatureLinks();
    all('.ticker-track span').forEach(function (span) {
      if (/8 MINUTES|FREESTYLE|WEST VISUAL|NEW VIDEO/i.test(span.textContent || '')) span.textContent = 'MONEY COUNTER NOW PLAYING';
    });
    var frame = one('.homepage-full-episode-frame');
    var iframe = frame && frame.querySelector('iframe');
    if (frame) frame.setAttribute('data-featured-video', VIDEO_ID + '-money-counter');
    if (iframe) {
      iframe.src = 'https://www.youtube.com/embed/' + VIDEO_ID + '?rel=0&modestbranding=1&playsinline=1';
      iframe.title = 'MONEY COUNTER - Hyph Life - prod by K.M.T';
    }
    var strip = one('.homepage-full-episode-strip span');
    if (strip) {
      strip.innerHTML = TITLE + '<span class="hw-west-sub">' + SUB + '</span><span class="hw-west-sub hw-west-drop">' + DROP + '</span>';
    }
    var openLink = one('.hw-west-open-link');
    if (!openLink && frame) {
      openLink = document.createElement('a');
      openLink.className = 'hw-west-open-link';
      openLink.target = '_blank';
      openLink.rel = 'noopener';
      openLink.style.cssText = 'position:absolute;right:12px;top:12px;z-index:3;padding:8px 10px;border-radius:999px;background:rgba(0,0,0,.68);border:1px solid rgba(255,255,255,.18);color:#fff;font-weight:1000;text-decoration:none;font-size:.75rem';
      frame.style.position = 'relative';
      frame.appendChild(openLink);
    }
    if (openLink) {
      openLink.href = WATCH_URL;
      openLink.setAttribute('aria-label', 'Open MONEY COUNTER on YouTube');
      openLink.textContent = 'MONEY COUNTER ↗';
    }
  }

  function boot() {
    injectSafetyCSS();
    cleanLobbyRoutes();
    wireMobileMenu();
    wireLogout();
    polishFeature();
    var year = id('year');
    if (year) year.textContent = new Date().getFullYear();
    guestUI();
    window.setTimeout(loadSessionUI, 250);
  }

  ready(boot);
  window.addEventListener('pageshow', function () {
    window.setTimeout(function () {
      cleanLobbyRoutes();
      polishFeature();
      loadSessionUI();
    }, 150);
  });
})();