/*
  HYPHSWORLD Homepage Menu + Login Display + Translation Layer
  Clean route helper, account chip renderer, and free browser-language translation.
*/
(function () {
  'use strict';

  const avatarMap = {
    boy: '🧢',
    girl: '💅',
    fox: '🦊',
    lion: '🦁',
    panda: '🐼',
    wolf: '🐺',
    alien: '👽',
    robot: '🤖',
    ghost: '👻',
    ninja: '🥷',
    crown: '👑',
    diamond: '💎'
  };

  const AUTH_LABEL = 'Create / Login';
  const AUTH_URL = 'auth.html';
  const LANG_KEY = 'hyphsworld.language';

  const languageLabels = {
    en: 'English',
    es: 'Español',
    fr: 'Français',
    pt: 'Português',
    tl: 'Tagalog',
    ko: '한국어',
    ja: '日本語',
    zh: '中文'
  };

  const translations = {
    es: {
      'Create / Login': 'Crear / Iniciar sesión',
      'Manage ID': 'Administrar ID',
      'Guest Mode': 'Modo invitado',
      'Use one ID to sync Cool Points': 'Usa una ID para sincronizar Cool Points',
      'Watch 8 Minutes': 'Ver 8 Minutes',
      'Listen Music': 'Escuchar música',
      'Merch': 'Mercancía',
      'Spotlight': 'Artista destacado',
      'Vault': 'Bóveda',
      'Wall of Fame': 'Muro de fama',
      'Leaderboards': 'Clasificaciones',
      'Full Player': 'Reproductor completo',
      'Connect': 'Conectar',
      'Send Cool Points': 'Enviar Cool Points',
      'Podcast': 'Podcast',
      '🎡 Daily Spin': '🎡 Giro diario',
      'Menu ▼': 'Menú ▼',
      'Menu ▲': 'Menú ▲',
      'NOW PLAYING': 'REPRODUCIENDO',
      'WELCOME 2 HYPHSWORLD': 'BIENVENIDO A HYPHSWORLD',
      'ARTIST SPOTLIGHT LIVE': 'ARTISTA DESTACADO EN VIVO',
      'CASINO FLOOR OPEN': 'PISO DEL CASINO ABIERTO',
      'NEW VIDEO ON THE TOP SCREEN': 'NUEVO VIDEO ARRIBA',
      'SEND COOL POINTS VIA PAYPAL': 'ENVÍA COOL POINTS POR PAYPAL',
      'PODCAST RESTORED': 'PODCAST RESTAURADO',
      'Casino Floor Is Live': 'El casino está en vivo',
      'Homepage Player': 'Reproductor principal',
      'Stay Locked In': 'Mantente conectado'
    },
    fr: {
      'Create / Login': 'Créer / Connexion',
      'Manage ID': 'Gérer ID',
      'Guest Mode': 'Mode invité',
      'Use one ID to sync Cool Points': 'Utilise un ID pour synchroniser Cool Points',
      'Watch 8 Minutes': 'Voir 8 Minutes',
      'Listen Music': 'Écouter la musique',
      'Merch': 'Boutique',
      'Spotlight': 'Artiste en vedette',
      'Vault': 'Coffre',
      'Wall of Fame': 'Mur de la gloire',
      'Leaderboards': 'Classements',
      'Full Player': 'Lecteur complet',
      'Connect': 'Connexion',
      'Send Cool Points': 'Envoyer Cool Points',
      'Podcast': 'Podcast',
      '🎡 Daily Spin': '🎡 Tour quotidien',
      'Menu ▼': 'Menu ▼',
      'Menu ▲': 'Menu ▲',
      'NOW PLAYING': 'EN LECTURE',
      'WELCOME 2 HYPHSWORLD': 'BIENVENUE À HYPHSWORLD',
      'ARTIST SPOTLIGHT LIVE': 'ARTISTE EN VEDETTE EN DIRECT',
      'CASINO FLOOR OPEN': 'CASINO OUVERT',
      'NEW VIDEO ON THE TOP SCREEN': 'NOUVELLE VIDÉO EN HAUT',
      'SEND COOL POINTS VIA PAYPAL': 'ENVOYER COOL POINTS VIA PAYPAL',
      'PODCAST RESTORED': 'PODCAST RESTAURÉ',
      'Casino Floor Is Live': 'Le casino est en direct',
      'Homepage Player': 'Lecteur principal',
      'Stay Locked In': 'Reste connecté'
    },
    pt: {
      'Create / Login': 'Criar / Entrar',
      'Manage ID': 'Gerenciar ID',
      'Guest Mode': 'Modo visitante',
      'Use one ID to sync Cool Points': 'Use um ID para sincronizar Cool Points',
      'Watch 8 Minutes': 'Ver 8 Minutes',
      'Listen Music': 'Ouvir música',
      'Merch': 'Loja',
      'Spotlight': 'Artista em destaque',
      'Vault': 'Cofre',
      'Wall of Fame': 'Mural da fama',
      'Leaderboards': 'Ranking',
      'Full Player': 'Player completo',
      'Connect': 'Conectar',
      'Send Cool Points': 'Enviar Cool Points',
      'Podcast': 'Podcast',
      '🎡 Daily Spin': '🎡 Giro diário',
      'Menu ▼': 'Menu ▼',
      'Menu ▲': 'Menu ▲',
      'NOW PLAYING': 'TOCANDO AGORA',
      'WELCOME 2 HYPHSWORLD': 'BEM-VINDO AO HYPHSWORLD',
      'ARTIST SPOTLIGHT LIVE': 'ARTISTA EM DESTAQUE AO VIVO',
      'CASINO FLOOR OPEN': 'CASSINO ABERTO',
      'NEW VIDEO ON THE TOP SCREEN': 'NOVO VÍDEO NO TOPO',
      'SEND COOL POINTS VIA PAYPAL': 'ENVIE COOL POINTS PELO PAYPAL',
      'PODCAST RESTORED': 'PODCAST RESTAURADO',
      'Casino Floor Is Live': 'O cassino está ao vivo',
      'Homepage Player': 'Player da página inicial',
      'Stay Locked In': 'Fique conectado'
    },
    tl: {
      'Create / Login': 'Gumawa / Login',
      'Manage ID': 'Ayusin ang ID',
      'Guest Mode': 'Guest Mode',
      'Use one ID to sync Cool Points': 'Gumamit ng isang ID para ma-sync ang Cool Points',
      'Watch 8 Minutes': 'Panoorin ang 8 Minutes',
      'Listen Music': 'Makinig ng musika',
      'Merch': 'Merch',
      'Spotlight': 'Artist Spotlight',
      'Vault': 'Vault',
      'Wall of Fame': 'Wall of Fame',
      'Leaderboards': 'Rankings',
      'Full Player': 'Buong player',
      'Connect': 'Kumonekta',
      'Send Cool Points': 'Magpadala ng Cool Points',
      'Podcast': 'Podcast',
      '🎡 Daily Spin': '🎡 Daily Spin',
      'Menu ▼': 'Menu ▼',
      'Menu ▲': 'Menu ▲',
      'NOW PLAYING': 'TUMUTUGTOG NGAYON',
      'WELCOME 2 HYPHSWORLD': 'WELCOME SA HYPHSWORLD',
      'ARTIST SPOTLIGHT LIVE': 'ARTIST SPOTLIGHT LIVE',
      'CASINO FLOOR OPEN': 'BUKAS ANG CASINO FLOOR',
      'NEW VIDEO ON THE TOP SCREEN': 'BAGONG VIDEO SA ITAAS',
      'SEND COOL POINTS VIA PAYPAL': 'MAGPADALA NG COOL POINTS SA PAYPAL',
      'PODCAST RESTORED': 'PODCAST NAIBALIK',
      'Casino Floor Is Live': 'Live na ang casino floor',
      'Homepage Player': 'Homepage Player',
      'Stay Locked In': 'Manatiling naka-lock in'
    },
    ko: {
      'Create / Login': '생성 / 로그인',
      'Manage ID': 'ID 관리',
      'Guest Mode': '게스트 모드',
      'Use one ID to sync Cool Points': '하나의 ID로 Cool Points를 동기화하세요',
      'Watch 8 Minutes': '8 Minutes 보기',
      'Listen Music': '음악 듣기',
      'Merch': '굿즈',
      'Spotlight': '아티스트 스포트라이트',
      'Vault': '볼트',
      'Wall of Fame': '명예의 벽',
      'Leaderboards': '순위표',
      'Full Player': '전체 플레이어',
      'Connect': '연결',
      'Send Cool Points': 'Cool Points 보내기',
      'Podcast': '팟캐스트',
      '🎡 Daily Spin': '🎡 데일리 스핀',
      'Menu ▼': '메뉴 ▼',
      'Menu ▲': '메뉴 ▲',
      'NOW PLAYING': '지금 재생 중',
      'WELCOME 2 HYPHSWORLD': 'HYPHSWORLD에 오신 것을 환영합니다',
      'ARTIST SPOTLIGHT LIVE': '아티스트 스포트라이트 라이브',
      'CASINO FLOOR OPEN': '카지노 플로어 오픈',
      'NEW VIDEO ON THE TOP SCREEN': '상단 화면 새 영상',
      'SEND COOL POINTS VIA PAYPAL': 'PAYPAL로 COOL POINTS 보내기',
      'PODCAST RESTORED': '팟캐스트 복원됨',
      'Casino Floor Is Live': '카지노 플로어 라이브',
      'Homepage Player': '홈페이지 플레이어',
      'Stay Locked In': '계속 접속하기'
    },
    ja: {
      'Create / Login': '作成 / ログイン',
      'Manage ID': 'ID管理',
      'Guest Mode': 'ゲストモード',
      'Use one ID to sync Cool Points': '1つのIDでCool Pointsを同期',
      'Watch 8 Minutes': '8 Minutesを見る',
      'Listen Music': '音楽を聴く',
      'Merch': 'グッズ',
      'Spotlight': '注目アーティスト',
      'Vault': 'Vault',
      'Wall of Fame': '名誉の壁',
      'Leaderboards': 'ランキング',
      'Full Player': 'フルプレイヤー',
      'Connect': '接続',
      'Send Cool Points': 'Cool Pointsを送る',
      'Podcast': 'ポッドキャスト',
      '🎡 Daily Spin': '🎡 デイリースピン',
      'Menu ▼': 'メニュー ▼',
      'Menu ▲': 'メニュー ▲',
      'NOW PLAYING': '再生中',
      'WELCOME 2 HYPHSWORLD': 'HYPHSWORLDへようこそ',
      'ARTIST SPOTLIGHT LIVE': '注目アーティスト ライブ',
      'CASINO FLOOR OPEN': 'カジノフロア オープン',
      'NEW VIDEO ON THE TOP SCREEN': '上部に新しい動画',
      'SEND COOL POINTS VIA PAYPAL': 'PAYPALでCOOL POINTSを送る',
      'PODCAST RESTORED': 'ポッドキャスト復元',
      'Casino Floor Is Live': 'カジノフロア公開中',
      'Homepage Player': 'ホームページプレイヤー',
      'Stay Locked In': 'つながったまま'
    },
    zh: {
      'Create / Login': '创建 / 登录',
      'Manage ID': '管理 ID',
      'Guest Mode': '访客模式',
      'Use one ID to sync Cool Points': '使用一个 ID 同步 Cool Points',
      'Watch 8 Minutes': '观看 8 Minutes',
      'Listen Music': '听音乐',
      'Merch': '周边',
      'Spotlight': '艺人推荐',
      'Vault': 'Vault',
      'Wall of Fame': '名人墙',
      'Leaderboards': '排行榜',
      'Full Player': '完整播放器',
      'Connect': '联系',
      'Send Cool Points': '发送 Cool Points',
      'Podcast': '播客',
      '🎡 Daily Spin': '🎡 每日转盘',
      'Menu ▼': '菜单 ▼',
      'Menu ▲': '菜单 ▲',
      'NOW PLAYING': '正在播放',
      'WELCOME 2 HYPHSWORLD': '欢迎来到 HYPHSWORLD',
      'ARTIST SPOTLIGHT LIVE': '艺人推荐直播',
      'CASINO FLOOR OPEN': '赌场开放',
      'NEW VIDEO ON THE TOP SCREEN': '顶部新视频',
      'SEND COOL POINTS VIA PAYPAL': '通过 PAYPAL 发送 COOL POINTS',
      'PODCAST RESTORED': '播客已恢复',
      'Casino Floor Is Live': '赌场正在开放',
      'Homepage Player': '首页播放器',
      'Stay Locked In': '保持关注'
    }
  };

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function detectLanguage() {
    const saved = readLocal(LANG_KEY, '');
    if (languageLabels[saved]) return saved;
    const browser = String(navigator.language || navigator.userLanguage || 'en').toLowerCase();
    if (browser.startsWith('es')) return 'es';
    if (browser.startsWith('fr')) return 'fr';
    if (browser.startsWith('pt')) return 'pt';
    if (browser.startsWith('tl') || browser.startsWith('fil')) return 'tl';
    if (browser.startsWith('ko')) return 'ko';
    if (browser.startsWith('ja')) return 'ja';
    if (browser.startsWith('zh')) return 'zh';
    return 'en';
  }

  function setLanguage(lang) {
    const safe = languageLabels[lang] ? lang : 'en';
    try { localStorage.setItem(LANG_KEY, safe); } catch (error) {}
    document.documentElement.lang = safe;
    applyTranslations(safe);
  }

  function applyTranslations(lang) {
    const active = lang || detectLanguage();
    const dictionary = translations[active] || {};
    const selector = 'a,button,span,small,h2,h3,p';
    document.querySelectorAll(selector).forEach(function (el) {
      if (el.closest('.brand-lockup') || el.closest('script') || el.closest('style')) return;
      if (el.children.length) return;
      const current = (el.dataset.hwOriginalText || el.textContent || '').trim();
      if (!current) return;
      if (!el.dataset.hwOriginalText) el.dataset.hwOriginalText = current;
      const original = el.dataset.hwOriginalText;
      el.textContent = active === 'en' ? original : (dictionary[original] || original);
    });
    const select = document.getElementById('hwLanguageSelect');
    if (select) select.value = active;
  }

  function injectLanguageSelector() {
    if (document.getElementById('hwLanguageSelect')) return;
    const login = document.getElementById('login-section') || document.querySelector('.site-header');
    if (!login) return;
    const wrap = document.createElement('label');
    wrap.className = 'hw-language-wrap';
    wrap.setAttribute('aria-label', 'Choose site language');
    wrap.innerHTML = '<span>Language</span><select id="hwLanguageSelect"></select>';
    const select = wrap.querySelector('select');
    Object.keys(languageLabels).forEach(function (lang) {
      const option = document.createElement('option');
      option.value = lang;
      option.textContent = languageLabels[lang];
      select.appendChild(option);
    });
    select.value = detectLanguage();
    select.addEventListener('change', function () { setLanguage(select.value); });
    login.appendChild(wrap);
  }

  function cleanText(item) {
    return (item && item.textContent || '').trim().toLowerCase();
  }

  function readLocal(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch (error) { return fallback; }
  }

  function number(value) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function avatarIcon(type) {
    const key = String(type || '').toLowerCase().trim();
    return avatarMap[key] || readLocal('hyphsworld.avatarIcon', '') || '🧢';
  }

  function getPoints() {
    try {
      if (window.HWPoints && typeof window.HWPoints.get === 'function') return number(window.HWPoints.get());
      if (window.HWPoints && typeof window.HWPoints.getState === 'function') {
        const state = window.HWPoints.getState();
        return number(state && state.points);
      }
    } catch (error) {}

    const keys = ['hyphsworld.coolPoints.total', 'hyphsworld.coolPoints.guestSession', 'coolPoints', 'hyphsworld_points', 'HW_COOL_POINTS'];
    return keys.reduce(function (max, key) { return Math.max(max, number(readLocal(key, '0'))); }, 0);
  }

  function ensureNavLink(nav, href, label, className) {
    if (!nav) return;
    const selector = 'a[href="' + href + '"], a[href="/' + href + '"]';
    if (nav.querySelector(selector)) return;
    const link = document.createElement('a');
    link.href = href;
    link.textContent = label;
    link.className = className || 'nav-link';
    nav.appendChild(link);
  }

  function restoreMerchLinks() {
    [document.querySelector('.main-nav'), document.getElementById('mobile-menu-panel')].forEach(function (nav) {
      ensureNavLink(nav, 'shop.html', 'Merch', 'nav-link merch-nav-link');
    });
  }

  function restoreDailyWheelLinks() {
    [document.querySelector('.main-nav'), document.getElementById('mobile-menu-panel')].forEach(function (nav) {
      ensureNavLink(nav, 'daily-wheel.html', '🎡 Daily Spin', 'nav-link daily-spin-nav-link');
    });
  }

  function normalizeCasinoLinks() {
    document.querySelectorAll('a, button').forEach(function (item) {
      const label = cleanText(item);
      const href = item.getAttribute && (item.getAttribute('href') || '');
      const shouldCasino = label === 'games' || label === 'game' || label.includes('earn arcade') || label.includes('casino') || href === 'games.html';
      if (!shouldCasino) return;

      if (item.tagName && item.tagName.toLowerCase() === 'a') item.setAttribute('href', 'games.html');
      if (label === 'games' || label === 'game' || label.includes('earn arcade')) item.textContent = '🎰 Casino';
    });
  }

  function normalizeAuthLinks() {
    document.querySelectorAll('a').forEach(function (link) {
      const href = link.getAttribute('href') || '';
      const label = cleanText(link);
      const isAuthDoor = href === 'login.html' || href === '/login.html' || href === 'auth.html' || href === '/auth.html' || href.startsWith('auth.html?') || label === 'sign in' || label === 'login' || label === 'create id' || label === 'create/login' || label === 'create id / login';
      if (!isAuthDoor) return;
      link.setAttribute('href', AUTH_URL);
      if (!label.includes('forgot') && !label.includes('reset') && label !== 'manage id') link.textContent = AUTH_LABEL;
    });
  }

  function directO1Links() {
    document.querySelectorAll('a[href="#o1-show"]').forEach(function (link) {
      link.setAttribute('href', '#top');
      if (cleanText(link).includes('watch')) link.textContent = 'Watch 01 Show';
    });
  }

  function cleanLobbyRoutes() {
    restoreMerchLinks();
    restoreDailyWheelLinks();
    normalizeCasinoLinks();
    normalizeAuthLinks();
    directO1Links();
    setTimeout(function () { applyTranslations(); }, 0);
  }

  function injectHomepageCleanupStyles() {
    if (document.getElementById('hwHomepageCleanupStyles')) return;
    const style = document.createElement('style');
    style.id = 'hwHomepageCleanupStyles';
    style.textContent = 'body.home-page #hwGlobalPointsHud{display:none!important}body.home-page .homepage-full-episode-frame::before{content:none!important;display:none!important}body.home-page .homepage-full-episode-frame iframe{position:relative;z-index:1;display:block;width:100%;border:0}';
    document.head.appendChild(style);
  }

  function userNameFromSession(session, user) {
    return (
      user && (user.displayName || user.username || user.name) ||
      readLocal('hyphsworld.playerName', '') ||
      session && session.email && String(session.email).split('@')[0] ||
      'HYPHSWORLD ID'
    );
  }

  function renderStatusChip(options) {
    const statusEl = document.getElementById('login-status');
    if (!statusEl) return;

    const signedIn = Boolean(options && options.signedIn);
    const name = options && options.name || 'Guest';
    const email = options && options.email || '';
    const avatar = options && options.avatar || avatarIcon(readLocal('hyphsworld.avatarType', 'boy'));
    const points = getPoints();

    statusEl.className = 'hw-login-chip ' + (signedIn ? 'is-signed-in' : 'is-guest');
    statusEl.innerHTML = signedIn
      ? '<span class="hw-login-avatar">' + avatar + '</span><span class="hw-login-copy"><strong>' + escapeHtml(name) + '</strong><small>' + points.toLocaleString() + ' CP' + (email ? ' • ' + escapeHtml(email) : '') + '</small></span>'
      : '<span class="hw-login-avatar">' + avatar + '</span><span class="hw-login-copy"><strong>Guest Mode</strong><small>Use one ID to sync Cool Points</small></span>';
    setTimeout(function () { applyTranslations(); }, 0);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function setAccountLinks(label, href) {
    const authLink = document.getElementById('auth-link');
    const navAccountLink = document.getElementById('nav-account-link');
    const mobileNavAccountLink = document.getElementById('mobile-nav-account-link');

    if (authLink) { authLink.textContent = label; authLink.href = href; authLink.dataset.hwOriginalText = label; }
    if (navAccountLink) { navAccountLink.textContent = label === 'Manage ID' ? 'Manage ID' : AUTH_LABEL; navAccountLink.href = href; navAccountLink.dataset.hwOriginalText = navAccountLink.textContent; }
    if (mobileNavAccountLink) { mobileNavAccountLink.textContent = label === 'Manage ID' ? 'Manage ID' : AUTH_LABEL; mobileNavAccountLink.href = href; mobileNavAccountLink.dataset.hwOriginalText = mobileNavAccountLink.textContent; }

    cleanLobbyRoutes();
  }

  function injectLoginStyles() {
    if (document.getElementById('hwLoginChipStyles')) return;
    const style = document.createElement('style');
    style.id = 'hwLoginChipStyles';
    style.textContent = '.hw-login-chip{display:inline-flex;align-items:center;justify-content:center;gap:10px;max-width:min(92vw,560px);padding:10px 13px;border-radius:999px;border:1px solid rgba(57,255,122,.34);background:radial-gradient(circle at 10% 0%,rgba(57,255,122,.14),transparent 36%),rgba(0,0,0,.62);box-shadow:0 0 22px rgba(57,255,122,.14),0 12px 30px rgba(0,0,0,.24);color:#fff;text-align:left;vertical-align:middle}.hw-login-avatar{display:grid;place-items:center;width:38px;height:38px;border-radius:999px;background:linear-gradient(135deg,#39ff7a,#1ffcff,#ff4fd8);color:#050505;font-size:1.28rem;font-weight:1000;box-shadow:0 0 20px rgba(57,255,122,.22)}.hw-login-copy{display:grid;gap:2px}.hw-login-copy strong{font-size:.92rem;line-height:1;color:#fff}.hw-login-copy small{font-size:.72rem;line-height:1.2;color:#a9ff87;font-weight:800}.hw-login-chip.is-guest{border-color:rgba(255,228,92,.34);box-shadow:0 0 18px rgba(255,228,92,.12)}.daily-spin-nav-link{border-color:rgba(255,228,92,.42)!important;color:#ffe45c!important}.hw-language-wrap{display:inline-flex;align-items:center;gap:6px;margin-left:10px;color:#ffe45c;font-size:.72rem;font-weight:1000;letter-spacing:.08em;text-transform:uppercase}.hw-language-wrap select{min-height:32px;border-radius:999px;border:1px solid rgba(31,252,255,.45);background:#050008;color:#fff;padding:4px 10px;font-weight:900}@media(max-width:640px){.hw-login-chip{border-radius:18px}.hw-login-copy small{max-width:250px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hw-language-wrap{margin:8px auto 0;justify-content:center;display:flex}}';
    document.head.appendChild(style);
  }

  async function updateLoginDisplay() {
    injectLoginStyles();
    injectLanguageSelector();

    const logoutButton = document.getElementById('home-logout');

    if (!window.HWAuth) {
      renderStatusChip({ signedIn: false });
      setAccountLinks(AUTH_LABEL, AUTH_URL);
      if (logoutButton) logoutButton.hidden = true;
      return;
    }

    let session = null;
    let user = null;

    try { session = await HWAuth.getSession(); } catch (error) {}
    try { if (session && window.HWAuth.getCurrentUser) user = await HWAuth.getCurrentUser(); } catch (error) {}

    if (session && session.email) {
      const name = userNameFromSession(session, user);
      const localAvatarType = readLocal('hyphsworld.avatarType', user && user.avatarType || 'boy');
      const avatar = avatarIcon(localAvatarType);
      renderStatusChip({ signedIn: true, name, email: session.email, avatar });
      setAccountLinks('Manage ID', 'account.html');
      if (logoutButton) logoutButton.hidden = false;
    } else {
      renderStatusChip({ signedIn: false });
      setAccountLinks(AUTH_LABEL, AUTH_URL);
      if (logoutButton) logoutButton.hidden = true;
    }
  }

  function bindMenu() {
    const year = document.getElementById('year');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const menuPanel = document.getElementById('mobile-menu-panel');
    const logoutButton = document.getElementById('home-logout');

    if (year) year.textContent = new Date().getFullYear();

    if (menuToggle && menuPanel) {
      menuToggle.addEventListener('click', function () {
        const open = menuPanel.classList.toggle('is-open');
        menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        menuToggle.textContent = open ? 'Menu ▲' : 'Menu ▼';
        menuToggle.dataset.hwOriginalText = menuToggle.textContent;
        cleanLobbyRoutes();
      });
    }

    if (logoutButton) {
      logoutButton.addEventListener('click', async function () {
        try { if (window.HWAuth) await HWAuth.signOut(); } catch (error) {}
        renderStatusChip({ signedIn: false });
        logoutButton.hidden = true;
        setAccountLinks(AUTH_LABEL, AUTH_URL);
      });
    }
  }

  ready(function () {
    injectHomepageCleanupStyles();
    injectLoginStyles();
    injectLanguageSelector();
    cleanLobbyRoutes();
    bindMenu();
    updateLoginDisplay();
    setLanguage(detectLanguage());

    window.addEventListener('hw:points-change', updateLoginDisplay);
    document.addEventListener('hyph:points-updated', updateLoginDisplay);
    window.addEventListener('storage', updateLoginDisplay);
    window.addEventListener('focus', updateLoginDisplay);
  });
})();
