(() => {
  'use strict';

  const LEVEL_TWO_TOKEN_KEY = 'HW_LEVEL2_ACCESS_V1';
  const LEVEL_TWO_LEGACY_KEY = 'hyphsworld_level2_access';
  const LEVEL_TWO_LEGACY_TIME_KEY = 'hyphsworld_level2_access_time';
  const LEVEL_TWO_WINDOW = 1000 * 60 * 60 * 4;
  const DESTINATION = 'level-2.html';
  const REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SUPABASE_CONFIG_FILE = 'supabase-config.js';
  const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  const VERIFY_FUNCTION = 'verify-vault-code';

  let supabaseClientPromise = null;

  const $ = (id) => document.getElementById(id);

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
  }

  function isFresh(timeValue) {
    const time = Number(timeValue || 0);
    return Number.isFinite(time) && time > 0 && Date.now() - time >= 0 && Date.now() - time < LEVEL_TWO_WINDOW;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts).find((script) => script.src && script.src.includes(src));
      if (existing) {
        if (existing.dataset.loaded === 'true') return resolve();
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', () => reject(new Error('Could not load ' + src)), { once: true });
        setTimeout(resolve, 250);
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = () => {
        script.dataset.loaded = 'true';
        resolve();
      };
      script.onerror = () => reject(new Error('Could not load ' + src));
      document.head.appendChild(script);
    });
  }

  function configReady(config) {
    const url = String(config?.url || '').trim();
    const anonKey = String(config?.anonKey || config?.anon_key || '').trim();
    return Boolean(url && anonKey && !/PASTE_|YOUR_|PROJECT_URL|ANON_PUBLIC_KEY/i.test(url + anonKey));
  }

  async function getSupabaseClient() {
    if (supabaseClientPromise) return supabaseClientPromise;

    supabaseClientPromise = (async () => {
      if (!window.HW_SUPABASE_CONFIG) await loadScript(SUPABASE_CONFIG_FILE);

      const config = window.HW_SUPABASE_CONFIG || {};
      if (!configReady(config)) throw new Error('Supabase is not configured.');

      if (!window.supabase || !window.supabase.createClient) await loadScript(SUPABASE_CDN);
      if (!window.supabase || !window.supabase.createClient) throw new Error('Supabase client did not load.');

      return window.supabase.createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    })();

    return supabaseClientPromise;
  }

  async function verifyLevelTwoCode(code) {
    const sb = await getSupabaseClient();
    const { data: sessionData } = await sb.auth.getSession();

    if (!sessionData?.session?.access_token) {
      return { granted: false, error: 'LOGIN_REQUIRED' };
    }

    const { data, error } = await sb.functions.invoke(VERIFY_FUNCTION, {
      body: { code }
    });

    if (error) return { granted: false, error: error.message || 'VERIFY_FAILED' };
    if (!data || data.levelKey !== 'level_2') return { granted: false, error: data?.error || 'LEVEL_TWO_REQUIRED' };

    return data;
  }

  async function hasAccountLevelTwoAccess() {
    try {
      if (!window.HWAuth || typeof window.HWAuth.getCurrentUser !== 'function') return false;
      const user = await window.HWAuth.getCurrentUser();
      return Boolean(user && user.level2Unlocked);
    } catch (error) {
      return false;
    }
  }

  async function hasLevelTwoAccess() {
    if (await hasAccountLevelTwoAccess()) return true;

    try {
      if (sessionStorage.getItem(LEVEL_TWO_LEGACY_KEY) === 'granted' && isFresh(sessionStorage.getItem(LEVEL_TWO_LEGACY_TIME_KEY))) {
        return true;
      }
    } catch (error) {}

    try {
      const raw = sessionStorage.getItem(LEVEL_TWO_TOKEN_KEY);
      if (!raw) return false;
      const token = JSON.parse(raw);
      const route = String(token.route || token.href || '').toLowerCase();
      const level = String(token.level || '').toLowerCase();
      return (level === 'level_2' || level === 'level-two') && (route.includes('level-2') || route.includes('floor2')) && isFresh(token.grantedAt);
    } catch (error) {
      return false;
    }
  }

  function grantLevelTwoAccess(result) {
    const grantedAt = Date.now();
    const nonce = Math.random().toString(36).slice(2);
    const token = {
      level: 'level_2',
      route: result?.route || 'level-2',
      href: result?.destination || DESTINATION,
      grantedAt,
      nonce
    };

    try {
      sessionStorage.setItem(LEVEL_TWO_LEGACY_KEY, 'granted');
      sessionStorage.setItem(LEVEL_TWO_LEGACY_TIME_KEY, String(grantedAt));
      sessionStorage.setItem(LEVEL_TWO_TOKEN_KEY, JSON.stringify(token));
      sessionStorage.removeItem('HW_LEVEL2_ARRIVAL_SEEN');
    } catch (error) {}

    return token.href;
  }

  function friendlyError(error) {
    const text = String(error || '').toUpperCase();
    if (text.includes('LOGIN_REQUIRED') || text.includes('JWT') || text.includes('SESSION')) {
      return 'Buck needs you logged in before Falcon lane can verify Level 2 clearance.';
    }
    if (text.includes('LEVEL_TWO_REQUIRED')) {
      return 'That code is real, but it is not the Level 2 Falcon code.';
    }
    if (text.includes('DENIED') || text.includes('FORBIDDEN')) {
      return 'ACCESS DENIED. Buck: Wrong Level 2 code. Back up from the premium rope.';
    }
    return 'Falcon server did not clear it. Refresh and try again.';
  }

  function ensureTransportOverlay() {
    let overlay = $('levelTwoTransportOverlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'levelTwoTransportOverlay';
    overlay.className = 'level-two-transport-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="falcon-warp-grid" aria-hidden="true"></div>
      <div class="falcon-smoke falcon-smoke-one" aria-hidden="true"></div>
      <div class="falcon-smoke falcon-smoke-two" aria-hidden="true"></div>
      <div class="falcon-lock-ring" aria-hidden="true">
        <span></span><span></span><span></span><span></span>
      </div>
      <section class="falcon-transport-card" role="status" aria-live="polite">
        <p class="falcon-eyebrow">AMS WEST VAULT SYSTEM</p>
        <h2 id="falconTransportTitle">FALCON LANE SCANNING</h2>
        <div class="falcon-stage-meter" aria-hidden="true"><span id="falconStageMeter"></span></div>
        <ul class="falcon-checklist" aria-label="Level 2 access checklist">
          <li id="falconCheckOne">Buck verifying code server-side…</li>
          <li id="falconCheckTwo">Duck Sauce warming the tunnel…</li>
          <li id="falconCheckThree">HYPHSWORLD 5 gate standing by…</li>
        </ul>
        <p id="falconTransportLine" class="falcon-line">Do not refresh. The floor is opening.</p>
      </section>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  function runTransportSequence(onComplete) {
    const overlay = ensureTransportOverlay();
    const title = $('falconTransportTitle');
    const line = $('falconTransportLine');
    const meter = $('falconStageMeter');
    const checkOne = $('falconCheckOne');
    const checkTwo = $('falconCheckTwo');
    const checkThree = $('falconCheckThree');

    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('level-two-transporting');

    const fastFinish = () => {
      if (typeof onComplete === 'function') onComplete();
    };

    if (REDUCED_MOTION) {
      if (title) title.textContent = 'ACCESS GRANTED';
      if (line) line.textContent = 'Opening Level 2 now…';
      window.setTimeout(fastFinish, 450);
      return;
    }

    const stages = [
      {
        delay: 220,
        pct: '28%',
        title: 'SERVER CHECK ACTIVE',
        line: 'Buck: Hold still, P. Falcon lane is checking your login and code off-site.',
        el: checkOne,
        text: 'Server-side Level 2 verification cleared.'
      },
      {
        delay: 980,
        pct: '63%',
        title: 'FALCON TUNNEL OPEN',
        line: 'Duck Sauce: I charged the tunnel up. Nobody touch nothing shiny.',
        el: checkTwo,
        text: 'Falcon tunnel charged.'
      },
      {
        delay: 1720,
        pct: '100%',
        title: 'ACCESS GRANTED',
        line: 'Transport locked. Dropping you inside HYPHSWORLD 5…',
        el: checkThree,
        text: 'Level 2 floor unlocked.'
      },
      {
        delay: 2520,
        pct: '100%',
        title: 'TELEPORTING',
        line: '3… 2… 1… Welcome to the premium floor.',
        complete: true
      }
    ];

    stages.forEach((stage) => {
      window.setTimeout(() => {
        if (meter) meter.style.width = stage.pct;
        if (title) title.textContent = stage.title;
        if (line) line.textContent = stage.line;
        if (stage.el) {
          stage.el.textContent = stage.text;
          stage.el.classList.add('is-complete');
        }
        if (stage.complete) {
          document.body.classList.add('level-two-flash-out');
          window.setTimeout(fastFinish, 460);
        }
      }, stage.delay);
    });
  }

  function enhanceLevelTwoGate() {
    const gate = $('level2-gate');
    if (!gate || gate.dataset.falconEnhanced === 'true') return;
    gate.dataset.falconEnhanced = 'true';

    const stage = document.createElement('div');
    stage.className = 'falcon-gate-stage';
    stage.setAttribute('aria-hidden', 'true');
    stage.innerHTML = `
      <div class="falcon-door-shell">
        <div class="falcon-door-left"></div>
        <div class="falcon-door-right"></div>
        <div class="falcon-core">02</div>
        <div class="falcon-scan-beam"></div>
      </div>
      <div class="falcon-mini-hud">
        <span>VAULT CAM ONLINE</span>
        <span>BUCK: WATCHING</span>
        <span>DUCK: TALKING</span>
      </div>
    `;

    const form = $('level2GateForm');
    gate.insertBefore(stage, form || null);
  }

  async function bindLevelOneGate() {
    const form = $('level2GateForm');
    const input = $('level2AccessCode');
    const clear = $('level2ClearCode');
    const button = $('level2UnlockButton');

    enhanceLevelTwoGate();

    if (!form || !input) return;

    if (await hasLevelTwoAccess()) {
      setText('level2GateStatus', 'FALCON clearance already active on this account. Level 2 door is ready.');
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const code = input.value.trim();

      if (!code) {
        setText('level2GateStatus', 'Buck: Type the Level 2 code first. Duck keeps trying to guess it.');
        input.focus();
        return;
      }

      if (button) button.disabled = true;
      document.body.classList.add('level-two-unlocking');
      setText('level2GateStatus', 'Running Level 2 server scan… Buck is checking the FALCON lane.');

      const result = await verifyLevelTwoCode(code).catch((error) => ({ granted: false, error: error?.message || 'VERIFY_FAILED' }));
      input.value = '';

      window.setTimeout(() => {
        if (!result.granted) {
          document.body.classList.remove('level-two-unlocking');
          setText('level2GateStatus', friendlyError(result.error));
          if (button) button.disabled = false;
          input.focus();
          return;
        }

        const destination = grantLevelTwoAccess(result);
        setText('level2GateStatus', 'ACCESS GRANTED. FALCON cleared server-side. Transporting to HYPHSWORLD 5…');
        document.body.classList.add('level-two-granted');
        runTransportSequence(() => {
          window.location.href = destination;
        });
      }, 780);
    });

    if (clear) {
      clear.addEventListener('click', () => {
        input.value = '';
        input.focus();
        setText('level2GateStatus', 'Level 2 terminal cleared. FALCON lane still locked.');
      });
    }
  }

  function injectGuardStyles() {
    if (document.getElementById('level2GuardStyles')) return;
    const style = document.createElement('style');
    style.id = 'level2GuardStyles';
    style.textContent = `
      .level-two-gate-card {
        position: relative;
        overflow: hidden;
        isolation: isolate;
        border: 1px solid rgba(31,252,255,.42) !important;
        background:
          linear-gradient(115deg, rgba(0,0,0,.78), rgba(11,5,23,.82)),
          radial-gradient(circle at 15% 12%, rgba(57,255,122,.28), transparent 30%),
          radial-gradient(circle at 85% 18%, rgba(31,252,255,.25), transparent 32%),
          radial-gradient(circle at 50% 110%, rgba(255,39,93,.24), transparent 42%) !important;
        box-shadow: 0 0 34px rgba(31,252,255,.20), 0 0 58px rgba(57,255,122,.12) !important;
      }
      .level-two-gate-card:before {
        content: "";
        position: absolute;
        inset: -40%;
        z-index: -1;
        background: conic-gradient(from 0deg, transparent, rgba(57,255,122,.18), transparent, rgba(255,39,93,.16), transparent, rgba(31,252,255,.18), transparent);
        animation: falconAuraSpin 8s linear infinite;
        opacity: .72;
      }
      .level-two-gate-card:after {
        content: "FALCON // LEVEL 02 // AMS WEST // HYPHSWORLD 5";
        position: absolute;
        left: 18px;
        right: 18px;
        bottom: 10px;
        color: rgba(255,255,255,.24);
        font-size: .68rem;
        font-weight: 1000;
        letter-spacing: .18em;
        white-space: nowrap;
        overflow: hidden;
        text-transform: uppercase;
      }
      .falcon-gate-stage {
        position: relative;
        display: grid;
        gap: 12px;
        margin: 18px 0;
        padding: 16px;
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 24px;
        background: rgba(0,0,0,.42);
        box-shadow: inset 0 0 24px rgba(31,252,255,.08);
      }
      .falcon-door-shell {
        position: relative;
        min-height: 162px;
        border-radius: 22px;
        overflow: hidden;
        border: 1px solid rgba(31,252,255,.24);
        background:
          repeating-linear-gradient(90deg, rgba(255,255,255,.04) 0 1px, transparent 1px 18px),
          linear-gradient(135deg, rgba(57,255,122,.10), rgba(184,77,255,.12), rgba(255,39,93,.10));
      }
      .falcon-door-left,
      .falcon-door-right {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 50%;
        background: linear-gradient(180deg, rgba(255,255,255,.10), rgba(0,0,0,.62));
        border: 1px solid rgba(255,255,255,.10);
        transition: transform .75s cubic-bezier(.2,.8,.2,1);
      }
      .falcon-door-left { left: 0; border-right-color: rgba(57,255,122,.38); }
      .falcon-door-right { right: 0; border-left-color: rgba(31,252,255,.38); }
      .falcon-core {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 86px;
        height: 86px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        color: #050505;
        font-weight: 1000;
        font-size: 2.2rem;
        background: linear-gradient(135deg, #39ff7a, #1ffcff, #ffe45c, #ff275d);
        box-shadow: 0 0 36px rgba(57,255,122,.44);
        animation: falconCorePulse 1.4s infinite alternate;
      }
      .falcon-scan-beam {
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent, rgba(57,255,122,.36), rgba(31,252,255,.36), transparent);
        transform: translateX(-120%);
        animation: falconBeam 2.4s ease-in-out infinite;
        mix-blend-mode: screen;
      }
      .falcon-mini-hud { display: flex; flex-wrap: wrap; gap: 8px; }
      .falcon-mini-hud span {
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 999px;
        padding: 7px 10px;
        background: rgba(0,0,0,.36);
        color: #dfffee;
        font-size: .68rem;
        font-weight: 1000;
        letter-spacing: .08em;
      }
      .level-two-unlocking .falcon-door-shell { box-shadow: 0 0 26px rgba(31,252,255,.24); }
      .level-two-granted .falcon-door-left { transform: translateX(-86%); }
      .level-two-granted .falcon-door-right { transform: translateX(86%); }
      .level-two-granted .falcon-core { animation: falconCoreBlast .55s ease-in-out infinite alternate; }
      .level-two-locked main,
      .level-two-locked [data-floor="floor2"] { display: none !important; }
      .level-two-lock-screen {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 28px;
        color: #fff;
        font-family: Arial, Helvetica, sans-serif;
        background:
          radial-gradient(circle at 18% 18%, rgba(57,255,122,.24), transparent 30%),
          radial-gradient(circle at 82% 12%, rgba(31,252,255,.18), transparent 30%),
          radial-gradient(circle at 50% 100%, rgba(255,39,93,.22), transparent 38%),
          #050505;
      }
      .level-two-lock-card {
        width: min(760px, 100%);
        border: 1px solid rgba(255,255,255,.18);
        border-radius: 30px;
        padding: 28px;
        background: linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.035));
        box-shadow: 0 0 34px rgba(57,255,122,.18);
      }
      .level-two-lock-card .eyebrow {
        display: inline-flex;
        color: #070707;
        background: linear-gradient(90deg, #39ff7a, #1ffcff, #ffe45c);
        border-radius: 999px;
        padding: 8px 12px;
        font-weight: 1000;
        text-transform: uppercase;
        letter-spacing: .08em;
        font-size: .78rem;
      }
      .level-two-lock-card h1 {
        margin: 18px 0 10px;
        font-size: clamp(2.5rem, 9vw, 5.5rem);
        line-height: .9;
        letter-spacing: -.06em;
        text-transform: uppercase;
      }
      .level-two-lock-card p { color: #ccd6d2; line-height: 1.55; font-size: 1.05rem; }
      .level-two-lock-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
      .level-two-lock-actions a {
        color: #fff;
        text-decoration: none;
        border: 1px solid rgba(255,255,255,.18);
        border-radius: 999px;
        padding: 11px 15px;
        font-weight: 900;
        background: linear-gradient(135deg, rgba(57,255,122,.2), rgba(255,39,93,.14));
      }
      .level-two-transport-overlay {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: grid;
        place-items: center;
        padding: 24px;
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        color: #fff;
        background:
          radial-gradient(circle at 50% 50%, rgba(57,255,122,.24), transparent 16%),
          radial-gradient(circle at 20% 18%, rgba(255,39,93,.26), transparent 28%),
          radial-gradient(circle at 82% 20%, rgba(31,252,255,.22), transparent 30%),
          linear-gradient(180deg, rgba(0,0,0,.78), rgba(0,0,0,.98));
        transition: opacity .24s ease, visibility .24s ease;
        overflow: hidden;
        font-family: Arial, Helvetica, sans-serif;
      }
      .level-two-transporting .level-two-transport-overlay {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }
      .falcon-warp-grid {
        position: absolute;
        inset: -40%;
        background:
          repeating-linear-gradient(0deg, rgba(255,255,255,.045) 0 1px, transparent 1px 34px),
          repeating-linear-gradient(90deg, rgba(31,252,255,.05) 0 1px, transparent 1px 34px);
        transform: perspective(620px) rotateX(64deg) translateY(22%);
        animation: falconWarpGrid 1.15s linear infinite;
      }
      .falcon-smoke {
        position: absolute;
        width: 52vmin;
        height: 52vmin;
        border-radius: 50%;
        filter: blur(34px);
        opacity: .24;
        animation: falconSmokeDrift 3.2s ease-in-out infinite alternate;
      }
      .falcon-smoke-one { left: -12vmin; bottom: -10vmin; background: #39ff7a; }
      .falcon-smoke-two { right: -16vmin; top: -12vmin; background: #ff275d; animation-delay: -.9s; }
      .falcon-lock-ring {
        position: absolute;
        width: min(76vmin, 620px);
        height: min(76vmin, 620px);
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,.14);
        animation: falconRingSpin 4s linear infinite;
        box-shadow: inset 0 0 52px rgba(31,252,255,.12), 0 0 56px rgba(57,255,122,.16);
      }
      .falcon-lock-ring span {
        position: absolute;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: linear-gradient(135deg, #39ff7a, #1ffcff, #ffe45c);
        box-shadow: 0 0 22px rgba(57,255,122,.85);
      }
      .falcon-lock-ring span:nth-child(1){top:-10px;left:50%}
      .falcon-lock-ring span:nth-child(2){right:-10px;top:50%}
      .falcon-lock-ring span:nth-child(3){bottom:-10px;left:50%}
      .falcon-lock-ring span:nth-child(4){left:-10px;top:50%}
      .falcon-transport-card {
        position: relative;
        width: min(680px, 100%);
        border: 1px solid rgba(255,255,255,.20);
        border-radius: 34px;
        padding: clamp(22px, 5vw, 36px);
        background: linear-gradient(180deg, rgba(0,0,0,.72), rgba(0,0,0,.50));
        backdrop-filter: blur(20px);
        box-shadow: 0 0 52px rgba(57,255,122,.24), 0 0 80px rgba(31,252,255,.12);
        text-align: left;
      }
      .falcon-eyebrow {
        display: inline-flex;
        margin: 0 0 12px;
        color: #050505;
        background: linear-gradient(90deg, #39ff7a, #1ffcff, #ffe45c, #ff275d);
        border-radius: 999px;
        padding: 8px 12px;
        font-weight: 1000;
        letter-spacing: .09em;
        font-size: .74rem;
      }
      .falcon-transport-card h2 {
        margin: 0 0 14px;
        font-size: clamp(2rem, 9vw, 4.8rem);
        line-height: .88;
        letter-spacing: -.065em;
        text-transform: uppercase;
      }
      .falcon-stage-meter {
        height: 12px;
        border: 1px solid rgba(255,255,255,.16);
        border-radius: 999px;
        overflow: hidden;
        background: rgba(0,0,0,.54);
        box-shadow: inset 0 0 18px rgba(31,252,255,.08);
      }
      .falcon-stage-meter span {
        display: block;
        width: 6%;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #39ff7a, #1ffcff, #ffe45c, #ff275d);
        transition: width .45s ease;
      }
      .falcon-checklist {
        list-style: none;
        padding: 0;
        margin: 18px 0;
        display: grid;
        gap: 10px;
      }
      .falcon-checklist li {
        padding: 11px 13px;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 16px;
        background: rgba(255,255,255,.055);
        color: #d9efe5;
        font-weight: 900;
      }
      .falcon-checklist li.is-complete {
        color: #050505;
        background: linear-gradient(90deg, rgba(57,255,122,.96), rgba(31,252,255,.92));
      }
      .falcon-line { margin: 0; color: #fff; font-weight: 1000; }
      .level-two-flash-out .level-two-transport-overlay:after {
        content: "";
        position: absolute;
        inset: 0;
        background: #fff;
        animation: falconWhiteOut .42s ease forwards;
      }
      .level-two-arrival main { animation: levelTwoArrive .72s ease-out both; }
      .level-two-arrival-badge {
        position: fixed;
        left: 50%;
        top: 92px;
        transform: translateX(-50%);
        z-index: 60;
        width: min(640px, calc(100% - 28px));
        border: 1px solid rgba(57,255,122,.35);
        border-radius: 22px;
        padding: 14px 16px;
        color: #fff;
        background: linear-gradient(135deg, rgba(0,0,0,.88), rgba(57,255,122,.20), rgba(255,39,93,.16));
        box-shadow: 0 0 34px rgba(57,255,122,.22);
        font-weight: 1000;
        text-align: center;
        animation: levelTwoBadge 3.8s ease forwards;
      }
      @keyframes falconAuraSpin { to { transform: rotate(360deg); } }
      @keyframes falconCorePulse { from { transform: translate(-50%, -50%) scale(1); } to { transform: translate(-50%, -50%) scale(1.08); } }
      @keyframes falconCoreBlast { from { filter: brightness(1); } to { filter: brightness(1.75); box-shadow: 0 0 62px rgba(57,255,122,.8); } }
      @keyframes falconBeam { 0% { transform: translateX(-120%); } 52% { transform: translateX(120%); } 100% { transform: translateX(120%); } }
      @keyframes falconWarpGrid { from { background-position: 0 0, 0 0; } to { background-position: 0 34px, 34px 0; } }
      @keyframes falconSmokeDrift { from { transform: translate3d(0,0,0) scale(1); } to { transform: translate3d(8vmin,-4vmin,0) scale(1.18); } }
      @keyframes falconRingSpin { to { transform: rotate(360deg); } }
      @keyframes falconWhiteOut { 0% { opacity: 0; } 50% { opacity: .88; } 100% { opacity: 0; } }
      @keyframes levelTwoArrive { from { opacity: 0; transform: scale(.985) translateY(18px); filter: blur(8px) saturate(1.8); } to { opacity: 1; transform: scale(1) translateY(0); filter: blur(0) saturate(1); } }
      @keyframes levelTwoBadge { 0% { opacity: 0; transform: translateX(-50%) translateY(-18px) scale(.96); } 14%, 78% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } 100% { opacity: 0; transform: translateX(-50%) translateY(-12px) scale(.98); pointer-events: none; } }
      @media (prefers-reduced-motion: reduce) {
        .level-two-gate-card:before,
        .falcon-core,
        .falcon-scan-beam,
        .falcon-warp-grid,
        .falcon-smoke,
        .falcon-lock-ring,
        .level-two-arrival main,
        .level-two-arrival-badge { animation: none !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function removeLevelTwoLocked() {
    document.body.classList.remove('level-two-locked');
    const lock = document.getElementById('levelTwoLockScreen');
    if (lock) lock.remove();
  }

  function showLevelTwoLocked() {
    injectGuardStyles();
    document.body.classList.add('level-two-locked');

    if (document.getElementById('levelTwoLockScreen')) return;

    const screen = document.createElement('section');
    screen.id = 'levelTwoLockScreen';
    screen.className = 'level-two-lock-screen';
    screen.innerHTML = `
      <article class="level-two-lock-card">
        <span class="eyebrow">Buck Said Hold Up</span>
        <h1>Level 2 Locked</h1>
        <p>HYPHSWORLD 5 needs Level 2 clearance first. Go back to Level 1, enter the Level 2 code, then Buck opens the premium floor.</p>
        <p>Duck Sauce: “You can’t just walk into Level 2 like it’s a gas station, P.”</p>
        <div class="level-two-lock-actions">
          <a href="quarantine-mixtape.html#level2-gate">Enter Level 2 Code</a>
          <a href="vault.html">Back To Vault Gate</a>
        </div>
      </article>
    `;
    document.body.appendChild(screen);
  }

  function shouldGuardLevelTwoPage() {
    const page = document.body.getAttribute('data-hw-page');
    const floor = document.querySelector('[data-floor="floor2"]');
    return page === 'level-2' || Boolean(floor);
  }

  function showArrivalMoment() {
    if (sessionStorage.getItem('HW_LEVEL2_ARRIVAL_SEEN') === 'true') return;
    try { sessionStorage.setItem('HW_LEVEL2_ARRIVAL_SEEN', 'true'); } catch (error) {}

    document.body.classList.add('level-two-arrival');
    const badge = document.createElement('div');
    badge.className = 'level-two-arrival-badge';
    badge.textContent = 'ACCESS GRANTED — FALCON TRANSPORT COMPLETE — WELCOME TO HYPHSWORLD 5';
    document.body.appendChild(badge);
    window.setTimeout(() => badge.remove(), 4200);
  }

  async function init() {
    injectGuardStyles();
    await bindLevelOneGate();

    if (shouldGuardLevelTwoPage()) {
      if (!(await hasLevelTwoAccess())) {
        showLevelTwoLocked();
      } else {
        removeLevelTwoLocked();
        showArrivalMoment();
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
