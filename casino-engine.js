(function () {
  'use strict';

  const SYMBOLS = ['🍒', '🍋', '⭐', '7', '💎', '🍀'];
  const SPIN_COST = 5;
  let spinning = false;
  let panel;
  let reels = [];
  let resultEl;
  let balanceEl;
  let payoutEl;
  let netEl;
  let spinBtn;
  let machine;

  async function getSupabaseClient() {
    if (!window.HWAuth || typeof window.HWAuth.getClient !== 'function') return null;
    const maybeClient = window.HWAuth.getClient();
    const resolvedClient = maybeClient && typeof maybeClient.then === 'function' ? await maybeClient : maybeClient;
    return resolvedClient && typeof resolvedClient.rpc === 'function' ? resolvedClient : null;
  }

  function getPoints() {
    try {
      if (window.HWPoints && typeof window.HWPoints.get === 'function') return window.HWPoints.get();
      if (window.HWPoints && typeof window.HWPoints.getState === 'function') return window.HWPoints.getState().points;
    } catch (error) {}
    return 0;
  }

  function setText(el, value) {
    if (el) el.textContent = String(value);
  }

  function money(value) {
    const n = Number.parseInt(value, 10) || 0;
    return n + ' CP';
  }

  function randomSymbol() {
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  }

  function startAudit(game, bet, metadata) {
    if (window.HWBetAudit && typeof window.HWBetAudit.start === 'function') {
      return window.HWBetAudit.start({ game, action: 'spin', bet, balanceBefore: getPoints(), metadata: metadata || {} });
    }
    return { auditId: game + '-' + Date.now(), status: 'approved', bet, balanceBefore: getPoints() };
  }

  function resolveAudit(receipt, data) {
    if (!receipt || !receipt.auditId || !window.HWBetAudit || typeof window.HWBetAudit.resolve !== 'function') return;
    window.HWBetAudit.resolve(receipt.auditId, data || {});
  }

  function rejectAudit(receipt, error) {
    if (!receipt || !receipt.auditId || !window.HWBetAudit || typeof window.HWBetAudit.reject !== 'function') return;
    window.HWBetAudit.reject(receipt.auditId, { reason: error && error.message ? error.message : 'slots_error', bet: SPIN_COST, balanceAfter: getPoints() });
  }

  function broadcastUnifiedBalance(balance) {
    const parsed = Number.parseInt(balance, 10);
    if (!Number.isFinite(parsed)) return;

    setText(balanceEl, money(parsed));

    const casinoBalance = document.getElementById('casinoCoolPoints');
    if (casinoBalance) casinoBalance.textContent = String(parsed);

    document.querySelectorAll('[data-hw-points], [data-cool-points], [data-hw-daily-balance]').forEach((el) => {
      el.textContent = String(parsed);
    });

    try {
      localStorage.setItem('hyphsworld.coolPoints.total', String(parsed));
      localStorage.setItem('coolPoints', String(parsed));
    } catch (error) {}

    try {
      document.dispatchEvent(new CustomEvent('hyph:points-updated', { detail: { points: parsed, source: 'slots' } }));
      window.dispatchEvent(new CustomEvent('hw:points-change', { detail: { points: parsed, source: 'slots' } }));
    } catch (error) {}
  }

  function ensurePanel() {
    if (panel) return panel;

    panel = document.createElement('section');
    panel.className = 'casino-engine-panel';
    panel.id = 'casinoEnginePanel';
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = '' +
      '<div class="casino-machine" role="dialog" aria-modal="true" aria-labelledby="casinoEngineTitle">' +
        '<div class="casino-engine-head">' +
          '<div>' +
            '<span class="casino-engine-kicker">Unified Ledger Slots</span>' +
            '<h2 id="casinoEngineTitle">Vintage Slots</h2>' +
            '<p>One wallet. Supabase decides the reels, payout, ledger, and your HYPHSWORLD Cool Points balance.</p>' +
          '</div>' +
          '<button class="casino-engine-close" type="button" data-casino-close>Close</button>' +
        '</div>' +
        '<div class="casino-reel-stage">' +
          '<div class="casino-reels" data-casino-reels>' +
            '<span class="casino-reel">🍒</span>' +
            '<span class="casino-reel">7</span>' +
            '<span class="casino-reel">🍋</span>' +
          '</div>' +
          '<div class="casino-result" data-casino-result>Ready. Spin costs 5 Cool Points.</div>' +
        '</div>' +
        '<div class="casino-engine-stats">' +
          '<div class="casino-engine-stat"><span>Unified Balance</span><strong data-casino-balance>0 CP</strong></div>' +
          '<div class="casino-engine-stat"><span>Payout</span><strong data-casino-payout>0 CP</strong></div>' +
          '<div class="casino-engine-stat"><span>Net</span><strong data-casino-net>0 CP</strong></div>' +
        '</div>' +
        '<div class="casino-engine-actions">' +
          '<button class="casino-spin-btn" type="button" data-casino-spin>SPIN 5 CP</button>' +
          '<button class="casino-back-btn" type="button" data-casino-close>Back To Casino</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(panel);
    machine = panel.querySelector('.casino-machine');
    reels = Array.from(panel.querySelectorAll('.casino-reel'));
    resultEl = panel.querySelector('[data-casino-result]');
    balanceEl = panel.querySelector('[data-casino-balance]');
    payoutEl = panel.querySelector('[data-casino-payout]');
    netEl = panel.querySelector('[data-casino-net]');
    spinBtn = panel.querySelector('[data-casino-spin]');

    panel.querySelectorAll('[data-casino-close]').forEach((button) => {
      button.addEventListener('click', closeSlots);
    });

    if (spinBtn) spinBtn.addEventListener('click', spinSlots);

    panel.addEventListener('click', (event) => {
      if (event.target === panel) closeSlots();
    });

    return panel;
  }

  function updateBalance() {
    setText(balanceEl, money(getPoints()));
    const casinoBalance = document.getElementById('casinoCoolPoints');
    if (casinoBalance) casinoBalance.textContent = String(getPoints());
  }

  async function refreshPoints() {
    try {
      if (window.HWPoints && typeof window.HWPoints.refresh === 'function') await window.HWPoints.refresh();
      if (window.HWUserWidget && typeof window.HWUserWidget.refresh === 'function') window.HWUserWidget.refresh();
    } catch (error) {}
    updateBalance();
  }

  function openSlots() {
    ensurePanel();
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('casino-engine-open');
    updateBalance();
    setText(payoutEl, '0 CP');
    setText(netEl, '0 CP');
    setText(resultEl, 'Ready. Spin costs 5 Cool Points from the same HYPHSWORLD wallet.');
    if (spinBtn) spinBtn.focus();
  }

  function closeSlots() {
    if (!panel) return;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('casino-engine-open');
  }

  function animateReels(finalReels) {
    const wrap = panel ? panel.querySelector('[data-casino-reels]') : null;
    if (wrap) wrap.classList.add('is-spinning');

    let ticks = 0;
    const timer = window.setInterval(() => {
      reels.forEach((reel) => { reel.textContent = randomSymbol(); });
      ticks += 1;
      if (ticks >= 14) {
        window.clearInterval(timer);
        reels.forEach((reel, index) => { reel.textContent = finalReels[index] || randomSymbol(); });
        if (wrap) wrap.classList.remove('is-spinning');
      }
    }, 70);

    return new Promise((resolve) => window.setTimeout(resolve, 1050));
  }

  function resultCopy(data) {
    if (!data) return 'Spin complete.';
    if (data.ok === false || data.result === 'not_enough_points') return data.message || 'Not enough Cool Points for this spin.';

    const result = String(data.result || '').replace(/_/g, ' ');
    const payout = Number.parseInt(data.payout, 10) || 0;
    const net = Number.parseInt(data.net, 10) || 0;

    if (data.result === 'jackpot') return 'JACKPOT. ' + payout + ' Cool Points hit the unified ledger.';
    if (payout > 0) return result.toUpperCase() + '. Payout: ' + payout + ' CP. Net: ' + net + ' CP. Balance synced.';
    return 'No hit that spin. Cost: ' + SPIN_COST + ' CP. Balance synced to one wallet.';
  }

  async function spinSlots() {
    if (spinning) return;
    ensurePanel();

    const audit = startAudit('server_slots', SPIN_COST, { surface: 'casino-engine', wallet: 'profiles.cool_points' });
    if (audit.status === 'blocked') {
      setText(resultEl, 'Bet blocked. Not enough Cool Points for a clean 5 CP spin.');
      setText(payoutEl, '0 CP');
      setText(netEl, '0 CP');
      return;
    }

    spinning = true;
    if (spinBtn) spinBtn.disabled = true;
    if (machine) machine.classList.remove('is-win', 'is-loss');
    setText(resultEl, 'Connecting to unified Supabase wallet...');
    setText(payoutEl, '—');
    setText(netEl, '—');

    try {
      const client = await getSupabaseClient();
      if (!client) throw new Error('Login first so slots can connect to your HYPHSWORLD ID.');
      setText(resultEl, 'Calling Supabase slots ledger...');
      const { data, error } = await client.rpc('spin_slots');
      if (error) throw error;
      const payload = data || {};

      if (payload.ok === false || payload.result === 'not_enough_points') {
        setText(payoutEl, money(0));
        setText(netEl, money(0));
        setText(resultEl, resultCopy(payload));
        broadcastUnifiedBalance(payload.balance);
        if (machine) machine.classList.add('is-loss');
        resolveAudit(audit, { status: 'blocked', result: payload.result || 'not_enough_points', bet: SPIN_COST, payout: 0, net: 0, balanceAfter: payload.balance || getPoints() });
        return;
      }

      await animateReels(payload.reels || []);
      setText(payoutEl, money(payload.payout));
      setText(netEl, money(payload.net));
      setText(resultEl, resultCopy(payload));
      if (machine) machine.classList.add((payload.payout || 0) > 0 ? 'is-win' : 'is-loss');

      broadcastUnifiedBalance(payload.balance);
      await refreshPoints();
      broadcastUnifiedBalance(payload.balance);

      resolveAudit(audit, {
        status: 'resolved',
        result: payload.result || 'spin_complete',
        bet: SPIN_COST,
        payout: payload.payout || 0,
        net: typeof payload.net === 'undefined' ? (Number(payload.payout || 0) - SPIN_COST) : payload.net,
        balanceAfter: typeof payload.balance === 'undefined' ? getPoints() : payload.balance,
        metadata: { reels: payload.reels || [], source: 'spin_slots_rpc', wallet: payload.source || 'profiles.cool_points' }
      });
    } catch (error) {
      rejectAudit(audit, error);
      setText(resultEl, error.message || 'Slots engine missed. Try again.');
      if (machine) machine.classList.add('is-loss');
    } finally {
      spinning = false;
      if (spinBtn) spinBtn.disabled = false;
    }
  }

  function bindCasinoCards() {
    document.querySelectorAll('.casino-room[data-room="slots"]').forEach((card) => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', (event) => {
        const interactive = event.target.closest('a,button');
        if (interactive && !interactive.matches('[data-room-action="spin"],[data-room-action="preview"]')) return;
        event.preventDefault();
        openSlots();
      });
    });

    document.querySelectorAll('[data-room-action="spin"],[data-room-action="preview"]').forEach((button) => {
      const card = button.closest('.casino-room[data-room="slots"]');
      if (!card) return;
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openSlots();
        if (button.dataset.roomAction === 'spin') {
          window.setTimeout(spinSlots, 180);
        }
      }, true);
    });
  }

  function boot() {
    ensurePanel();
    bindCasinoCards();
    updateBalance();
    document.addEventListener('hyph:points-updated', updateBalance);
    window.addEventListener('hw:points-change', updateBalance);
    window.HWCasinoEngine = { openSlots, closeSlots, spinSlots, refreshPoints };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();