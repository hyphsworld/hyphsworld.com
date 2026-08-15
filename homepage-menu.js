(function () {
  'use strict';

  if (window.__HW_HOME_SAFE_BOOT__) return;
  window.__HW_HOME_SAFE_BOOT__ = true;

  var VIDEO_ID = 'yDezFWqPbck';
  var WATCH_URL = 'https://youtu.be/yDezFWqPbck?is=lZgGifKVs8ijsZVl';
  var TITLE = 'MONEY COUNTER';
  var SUB = 'Hyph Life';
  var DROP = 'prod by K.M.T';
  var LANGUAGE_KEY = 'hyphsworld.language';
  var LANGUAGE_LABELS = {
    en: 'English', es: 'Español', fr: 'Français', pt: 'Português',
    tl: 'Tagalog', ko: '한국어', ja: '日本語', zh: '中文'
  };
  var TRANSLATIONS = {
    es: {'Guest Mode':'Modo invitado','Login to sync Cool Points':'Inicia sesión para sincronizar Cool Points','Create ID / Login':'Crear ID / Iniciar sesión','Manage Account':'Administrar cuenta','Listen Music':'Escuchar música','Spotlight':'Artista destacado','Vault':'Bóveda','Wall of Fame':'Muro de fama','Leaderboards':'Clasificaciones','Full Player':'Reproductor completo','Connect':'Conectar','Send Cool Points':'Enviar Cool Points','Menu ▼':'Menú ▼','Menu ▲':'Menú ▲','NOW PLAYING':'REPRODUCIENDO','Casino Floor Is Live':'El casino está en vivo','Homepage Player':'Reproductor principal','Stay Locked In':'Mantente conectado','Logout':'Cerrar sesión'},
    fr: {'Guest Mode':'Mode invité','Login to sync Cool Points':'Connectez-vous pour synchroniser Cool Points','Create ID / Login':'Créer un ID / Connexion','Manage Account':'Gérer le compte','Listen Music':'Écouter la musique','Spotlight':'Artiste en vedette','Vault':'Coffre','Wall of Fame':'Mur de la gloire','Leaderboards':'Classements','Full Player':'Lecteur complet','Connect':'Connexion','Send Cool Points':'Envoyer Cool Points','Menu ▼':'Menu ▼','Menu ▲':'Menu ▲','NOW PLAYING':'EN LECTURE','Casino Floor Is Live':'Le casino est en direct','Homepage Player':'Lecteur principal','Stay Locked In':'Restez connecté','Logout':'Déconnexion'},
    pt: {'Guest Mode':'Modo visitante','Login to sync Cool Points':'Entre para sincronizar Cool Points','Create ID / Login':'Criar ID / Entrar','Manage Account':'Gerenciar conta','Listen Music':'Ouvir música','Spotlight':'Artista em destaque','Vault':'Cofre','Wall of Fame':'Mural da fama','Leaderboards':'Ranking','Full Player':'Player completo','Connect':'Conectar','Send Cool Points':'Enviar Cool Points','Menu ▼':'Menu ▼','Menu ▲':'Menu ▲','NOW PLAYING':'TOCANDO AGORA','Casino Floor Is Live':'O cassino está ao vivo','Homepage Player':'Player da página inicial','Stay Locked In':'Fique conectado','Logout':'Sair'},
    tl: {'Guest Mode':'Guest mode','Login to sync Cool Points':'Mag-login para ma-sync ang Cool Points','Create ID / Login':'Gumawa ng ID / Login','Manage Account':'Ayusin ang account','Listen Music':'Makinig ng musika','Spotlight':'Artist spotlight','Vault':'Vault','Wall of Fame':'Wall of Fame','Leaderboards':'Mga ranking','Full Player':'Buong player','Connect':'Kumonekta','Send Cool Points':'Magpadala ng Cool Points','Menu ▼':'Menu ▼','Menu ▲':'Menu ▲','NOW PLAYING':'TUMUTUGTOG NGAYON','Casino Floor Is Live':'Live na ang casino floor','Homepage Player':'Homepage player','Stay Locked In':'Manatiling naka-lock in','Logout':'Mag-logout'},
    ko: {'Guest Mode':'게스트 모드','Login to sync Cool Points':'Cool Points를 동기화하려면 로그인하세요','Create ID / Login':'ID 생성 / 로그인','Manage Account':'계정 관리','Listen Music':'음악 듣기','Spotlight':'아티스트 스포트라이트','Vault':'볼트','Wall of Fame':'명예의 벽','Leaderboards':'순위표','Full Player':'전체 플레이어','Connect':'연결','Send Cool Points':'Cool Points 보내기','Menu ▼':'메뉴 ▼','Menu ▲':'메뉴 ▲','NOW PLAYING':'지금 재생 중','Casino Floor Is Live':'카지노 플로어 라이브','Homepage Player':'홈페이지 플레이어','Stay Locked In':'계속 접속하기','Logout':'로그아웃'},
    ja: {'Guest Mode':'ゲストモード','Login to sync Cool Points':'Cool Pointsを同期するにはログイン','Create ID / Login':'ID作成 / ログイン','Manage Account':'アカウント管理','Listen Music':'音楽を聴く','Spotlight':'注目アーティスト','Vault':'Vault','Wall of Fame':'名誉の壁','Leaderboards':'ランキング','Full Player':'フルプレイヤー','Connect':'接続','Send Cool Points':'Cool Pointsを送る','Menu ▼':'メニュー ▼','Menu ▲':'メニュー ▲','NOW PLAYING':'再生中','Casino Floor Is Live':'カジノフロア公開中','Homepage Player':'ホームページプレイヤー','Stay Locked In':'つながったまま','Logout':'ログアウト'},
    zh: {'Guest Mode':'访客模式','Login to sync Cool Points':'登录以同步 Cool Points','Create ID / Login':'创建 ID / 登录','Manage Account':'管理账户','Listen Music':'听音乐','Spotlight':'艺人推荐','Vault':'Vault','Wall of Fame':'名人墙','Leaderboards':'排行榜','Full Player':'完整播放器','Connect':'联系','Send Cool Points':'发送 Cool Points','Menu ▼':'菜单 ▼','Menu ▲':'菜单 ▲','NOW PLAYING':'正在播放','Casino Floor Is Live':'赌场正在开放','Homepage Player':'首页播放器','Stay Locked In':'保持关注','Logout':'退出登录'}
  };

  function id(name) { return document.getElementById(name); }
  function one(sel) { return document.querySelector(sel); }
  function all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function detectLanguage() {
    var saved = '';
    try { saved = window.localStorage.getItem(LANGUAGE_KEY) || ''; } catch (error) {}
    if (LANGUAGE_LABELS[saved]) return saved;
    var browser = String(navigator.language || navigator.userLanguage || 'en').toLowerCase();
    if (browser.indexOf('fil') === 0) return 'tl';
    var code = browser.split('-')[0];
    return LANGUAGE_LABELS[code] ? code : 'en';
  }

  function translatePage(language) {
    var active = LANGUAGE_LABELS[language] ? language : 'en';
    var dictionary = TRANSLATIONS[active] || {};
    document.documentElement.lang = active;
    all('a,button,span,small,h2,h3,p').forEach(function (item) {
      if (item.id === 'hwLanguageLabel' || item.closest('.brand-lockup') || item.children.length) return;
      var current = (item.textContent || '').trim();
      if (!current) return;
      if (!item.dataset.hwOriginalText) item.dataset.hwOriginalText = current;
      var original = item.dataset.hwOriginalText;
      item.textContent = active === 'en' ? original : (dictionary[original] || original);
    });
    var selector = id('hwLanguageSelect');
    if (selector) selector.value = active;
  }

  function setLanguage(language) {
    var active = LANGUAGE_LABELS[language] ? language : 'en';
    try { window.localStorage.setItem(LANGUAGE_KEY, active); } catch (error) {}
    translatePage(active);
  }

  function injectLanguageSelector() {
    if (id('hwLanguageSelect')) return;
    var host = id('login-section') || one('.site-header');
    if (!host) return;
    var wrapper = document.createElement('label');
    wrapper.className = 'hw-language-wrap';
    wrapper.setAttribute('for', 'hwLanguageSelect');
    wrapper.innerHTML = '<span id="hwLanguageLabel">Language</span><select id="hwLanguageSelect" aria-label="Choose site language"></select>';
    var selector = wrapper.querySelector('select');
    Object.keys(LANGUAGE_LABELS).forEach(function (code) {
      var option = document.createElement('option');
      option.value = code;
      option.textContent = LANGUAGE_LABELS[code];
      selector.appendChild(option);
    });
    selector.value = detectLanguage();
    selector.addEventListener('change', function () { setLanguage(selector.value); });
    host.appendChild(wrapper);
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
      '.hw-language-wrap{display:inline-flex;align-items:center;gap:7px;margin-left:12px;color:#ffe45c;font-size:.72rem;font-weight:1000;letter-spacing:.08em;text-transform:uppercase}',
      '.hw-language-wrap select{min-height:34px;border:1px solid rgba(31,252,255,.58);border-radius:999px;background:#050008;color:#fff;padding:5px 28px 5px 10px;font:900 .78rem/1 Arial,sans-serif;cursor:pointer}',
      '.hw-language-wrap select:focus-visible{outline:3px solid #ffe45c;outline-offset:2px}',
      '.homepage-full-episode-strip{padding:8px 12px 9px!important;overflow:visible!important}',
      '.homepage-full-episode-strip span{display:block;font-size:clamp(14px,3.45vw,22px)!important;line-height:1.01!important;letter-spacing:.018em!important;text-shadow:0 0 6px rgba(255,255,255,.2)!important}',
      '.hw-west-sub{display:block;color:#1ffcff;font-size:.68em;line-height:.98;margin-top:3px;letter-spacing:.035em;text-shadow:0 0 8px rgba(31,252,255,.42)}',
      '.homepage-full-episode-strip .hw-west-drop{margin-top:4px;font-size:.76em;color:#1ffcff}',
      '@media(max-width:640px){.hw-language-wrap{display:flex;width:max-content;margin:8px auto 0}}'
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
    translatePage(detectLanguage());
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
    translatePage(detectLanguage());
  }

  function setAccountLinks(label, href) {
    var authLink = id('auth-link');
    var navAccountLink = id('nav-account-link');
    var mobileNavAccountLink = id('mobile-nav-account-link');
    if (authLink) { authLink.textContent = label; authLink.href = href; authLink.dataset.hwOriginalText = label; }
    if (navAccountLink) { navAccountLink.textContent = label === 'Manage Account' ? 'Manage ID' : 'Create ID'; navAccountLink.href = href; navAccountLink.dataset.hwOriginalText = navAccountLink.textContent; }
    if (mobileNavAccountLink) { mobileNavAccountLink.textContent = label === 'Manage Account' ? 'Manage ID' : 'Create ID'; mobileNavAccountLink.href = href; mobileNavAccountLink.dataset.hwOriginalText = mobileNavAccountLink.textContent; }
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
      menuToggle.dataset.hwOriginalText = menuToggle.textContent;
      cleanLobbyRoutes();
      translatePage(detectLanguage());
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
    injectLanguageSelector();
    cleanLobbyRoutes();
    wireMobileMenu();
    wireLogout();
    polishFeature();
    var year = id('year');
    if (year) year.textContent = new Date().getFullYear();
    guestUI();
    setLanguage(detectLanguage());
    window.setTimeout(loadSessionUI, 250);
  }

  ready(boot);
  window.addEventListener('pageshow', function () {
    window.setTimeout(function () {
      cleanLobbyRoutes();
      polishFeature();
      loadSessionUI();
      translatePage(detectLanguage());
    }, 150);
  });
})();
