/* HYPHSWORLD Reward Code Widget */
(function () {
  'use strict';

  if (window.__HYPHSWORLD_REWARD_CODE_WIDGET__) return;
  window.__HYPHSWORLD_REWARD_CODE_WIDGET__ = true;

  const mountSelectors = ['.cash-run-home', '.gate-arcade-card', '.account-card', '.daily-wheel-card'];

  function injectStyles() {
    if (document.getElementById('hwRewardCodeStyles')) return;
    const style = document.createElement('style');
    style.id = 'hwRewardCodeStyles';
    style.textContent = '.hw-reward-code-card{width:min(980px,calc(100% - 28px));margin:18px auto;padding:18px;border-radius:26px;border:1px solid rgba(57,255,122,.34);background:radial-gradient(circle at 10% 0%,rgba(57,255,122,.18),transparent 36%),radial-gradient(circle at 90% 0%,rgba(255,79,216,.14),transparent 36%),rgba(0,0,0,.58);box-shadow:0 20px 56px rgba(0,0,0,.34),0 0 28px rgba(57,255,122,.12);color:#fff}.hw-reward-code-card[data-inline="true"]{width:100%;margin:18px 0}.hw-reward-code-card h2{margin:0 0 6px;text-transform:uppercase;letter-spacing:-.04em;line-height:.9;font-size:clamp(2rem,6vw,4.4rem);color:#ffe45c;text-shadow:3px 3px 0 rgba(255,79,216,.55)}.hw-reward-code-card p{margin:0 0 14px;color:rgba(255,255,255,.76);font-weight:850;line-height:1.45}.hw-reward-code-form{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px}.hw-reward-code-form input{min-height:52px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.52);color:#fff;padding:0 18px;font-weight:1000;text-transform:uppercase;letter-spacing:.08em}.hw-reward-code-form button{min-height:52px;border:0;border-radius:999px;padding:0 18px;background:linear-gradient(90deg,#39ff7a,#1ffcff,#ffe45c);color:#050505;font-weight:1000;text-transform:uppercase;letter-spacing:.06em;cursor:pointer}.hw-reward-code-form button:disabled{opacity:.7;cursor:not-allowed}.hw-reward-code-status{margin-top:12px;padding:11px 13px;border-radius:18px;background:rgba(0,0,0,.34);border:1px solid rgba(255,255,255,.12);color:#a9ff87;font-weight:900;word-break:break-word}.hw-reward-code-status.is-error{color:#ff9ab0;border-color:rgba(255,39,93,.34)}.hw-reward-code-status.is-success{color:#39ff7a;border-color:rgba(57,255,122,.42)}.hw-reward-code-examples{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.hw-reward-code-examples button{border:1px solid rgba(255,255,255,.15);border-radius:999px;padding:8px 10px;background:rgba(255,255,255,.09);color:#fff;font-weight:950;cursor:pointer}@media(max-width:640px){.hw-reward-code-form{grid-template-columns:1fr}.hw-reward-code-card{border-radius:22px}.hw-reward-code-form input,.hw-reward-code-form button{border-radius:18px}}';
    document.head.appendChild(style);
  }

  function readableError(error) {
    const message = String(error && (error.message || error.error_description || error.details || error.hint || error.code) || error || 'UNKNOWN_ERROR');
    const key = message.toUpperCase();
    if (key.includes('LOGIN') || key.includes('JWT') || key.includes('AUTH')) return 'Login first so Buck can save the reward to your ID. Debug: ' + message;
    if (key.includes('ALREADY')) return 'Already redeemed. Duck Sauce tried twice too. Debug: ' + message;
    if (key.includes('LIMIT')) return 'That code already hit its limit. Debug: ' + message;
    if (key.includes('INVALID') || key.includes('EXPIRED')) return 'Code not active. Check the ticker or slot hints. Debug: ' + message;
    return 'Redeem error: ' + message;
  }

  async function getSupabaseClient() {
    if (window.supabaseClient && typeof window.supabaseClient.rpc === 'function') return window.supabaseClient;
    if (window.HWAuth && typeof window.HWAuth.getClient === 'function') return await window.HWAuth.getClient();
    if (window.supabase && window.HW_SUPABASE_CONFIG && window.HW_SUPABASE_CONFIG.url && window.HW_SUPABASE_CONFIG.anonKey) {
      return window.supabase.createClient(window.HW_SUPABASE_CONFIG.url, window.HW_SUPABASE_CONFIG.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    }
    return null;
  }

  async function refreshPoints() {
    try {
      if (window.HWPoints && typeof window.HWPoints.refresh === 'function') await window.HWPoints.refresh();
      if (window.HWUserWidget && typeof window.HWUserWidget.refresh === 'function') window.HWUserWidget.refresh();
    } catch (error) {}
  }

  function createWidget(inline) {
    const card = document.createElement('section');
    card.className = 'hw-reward-code-card';
    if (inline) card.dataset.inline = 'true';
    card.setAttribute('aria-label', 'Redeem HYPHSWORLD reward code');
    card.innerHTML = '<h2>Reward Code</h2><p>Enter codes from the ticker, slots, Daily Spin, or O1 drops. Points save to your HYPHSWORLD ID.</p><form class="hw-reward-code-form"><input type="text" maxlength="32" autocomplete="off" inputmode="text" placeholder="DUCKSAUCE50" aria-label="Reward code" /><button type="submit">Redeem</button></form><div class="hw-reward-code-status" role="status" aria-live="polite">Try: DUCKSAUCE50, GREENLIGHT, or NEONJACKPOT.</div><div class="hw-reward-code-examples"><button type="button" data-code="DUCKSAUCE50">DUCKSAUCE50</button><button type="button" data-code="GREENLIGHT">GREENLIGHT</button><button type="button" data-code="NEONJACKPOT">NEONJACKPOT</button></div>';

    const form = card.querySelector('form');
    const input = card.querySelector('input');
    const button = card.querySelector('button[type="submit"]');
    const status = card.querySelector('.hw-reward-code-status');

    card.querySelectorAll('[data-code]').forEach((chip) => {
      chip.addEventListener('click', () => {
        input.value = chip.dataset.code || '';
        input.focus();
      });
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const code = String(input.value || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
      if (!code) return;
      input.value = code;
      status.className = 'hw-reward-code-status';
      status.textContent = 'Checking code...';
      button.disabled = true;

      try {
        const sb = await getSupabaseClient();
        if (!sb || typeof sb.rpc !== 'function') throw new Error('NO_SUPABASE_CLIENT_OR_LOGIN_REQUIRED');
        const response = await sb.rpc('redeem_reward_code', { p_code: code });
        const data = response && response.data;
        const error = response && response.error;
        if (error) throw error;
        if (!data) throw new Error('EMPTY_RPC_RESPONSE');
        if (data.ok === false) throw new Error(data.error || 'REDEEM_FAILED_WITH_NO_MESSAGE');

        status.className = 'hw-reward-code-status is-success';
        status.textContent = (data.title || code) + ': +' + (data.points || 0) + ' Cool Points' + (data.hint ? ' — ' + data.hint : '');
        input.value = '';
        await refreshPoints();
      } catch (error) {
        status.className = 'hw-reward-code-status is-error';
        status.textContent = readableError(error);
        try { console.error('HYPHSWORLD reward code error:', error); } catch (e) {}
      } finally {
        button.disabled = false;
      }
    });

    return card;
  }

  function mount() {
    injectStyles();
    if (document.querySelector('.hw-reward-code-card')) return;

    const anchor = mountSelectors.map((selector) => document.querySelector(selector)).find(Boolean);
    if (anchor) {
      const inline = Boolean(anchor.classList.contains('gate-arcade-card') || anchor.classList.contains('account-card') || anchor.classList.contains('daily-wheel-card'));
      anchor.insertAdjacentElement('afterend', createWidget(inline));
      return;
    }

    document.body.appendChild(createWidget(false));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
