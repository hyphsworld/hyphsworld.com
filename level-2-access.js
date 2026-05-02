(() => {
  'use strict';

  const LEVEL_TWO_HASHES = new Set([
    '50673d02ac6324d4cfa82c941caed56709489e70bd5402e1e3520c25d1100b8e'
  ]);

  const LEVEL_TWO_TOKEN_KEY = 'HW_LEVEL2_ACCESS_V1';
  const LEVEL_TWO_LEGACY_KEY = 'hyphsworld_level2_access';
  const LEVEL_TWO_LEGACY_TIME_KEY = 'hyphsworld_level2_access_time';
  const LEVEL_TWO_WINDOW = 1000 * 60 * 60 * 4;
  const DESTINATION = 'level-2.html';

  const $ = (id) => document.getElementById(id);

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
  }

  async function sha256(text) {
    const encoded = new TextEncoder().encode(String(text || '').trim().toUpperCase());
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function isFresh(timeValue) {
    const time = Number(timeValue || 0);
    return Number.isFinite(time) && time > 0 && Date.now() - time >= 0 && Date.now() - time < LEVEL_TWO_WINDOW;
  }

  function hasLevelTwoAccess() {
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
      return token.level === 'level-two' && (route.includes('level-2') || route.includes('floor2')) && isFresh(token.grantedAt);
    } catch (error) {
      return false;
    }
  }

  function grantLevelTwoAccess() {
    const grantedAt = Date.now();
    const nonce = Math.random().toString(36).slice(2);
    const token = {
      level: 'level-two',
      route: 'level-2',
      href: DESTINATION,
      grantedAt,
      nonce
    };

    try {
      sessionStorage.setItem(LEVEL_TWO_LEGACY_KEY, 'granted');
      sessionStorage.setItem(LEVEL_TWO_LEGACY_TIME_KEY, String(grantedAt));
      sessionStorage.setItem(LEVEL_TWO_TOKEN_KEY, JSON.stringify(token));
    } catch (error) {}
  }

  function bindLevelOneGate() {
    const form = $('level2GateForm');
    const input = $('level2AccessCode');
    const clear = $('level2ClearCode');
    const button = $('level2UnlockButton');

    if (!form || !input) return;

    if (hasLevelTwoAccess()) {
      setText('level2GateStatus', 'FALCON clearance already active. Level 2 door is ready.');
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
      setText('level2GateStatus', 'Running Level 2 code scan… Buck is checking the FALCON lane.');

      let passed = false;
      try {
        const hash = await sha256(code);
        passed = LEVEL_TWO_HASHES.has(hash);
      } catch (error) {
        passed = false;
      }

      input.value = '';

      window.setTimeout(() => {
        if (!passed) {
          document.body.classList.remove('level-two-unlocking');
          setText('level2GateStatus', 'ACCESS DENIED. Buck: Wrong Level 2 code. Back up from the premium rope.');
          if (button) button.disabled = false;
          input.focus();
          return;
        }

        grantLevelTwoAccess();
        setText('level2GateStatus', 'ACCESS GRANTED. FALCON cleared. Transporting to HYPHSWORLD 5…');
        document.body.classList.add('level-two-granted');

        window.setTimeout(() => {
          window.location.href = DESTINATION;
        }, 850);
      }, 900);
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
    `;
    document.head.appendChild(style);
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

  function init() {
    bindLevelOneGate();

    if (shouldGuardLevelTwoPage() && !hasLevelTwoAccess()) {
      showLevelTwoLocked();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
