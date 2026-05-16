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

  function getSupabaseClient() {
    return window.HWAuth && typeof window.HWAuth.getClient === 'function' ? window.HWAuth.getClient() : null;
  }

  function getPoints() {
    try {
      if (window.HWPoints && typeof window.HWPoints.get === 'function') return window.HWPoints.get();
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
            '<span class="casino-engine-kicker">Server-Backed Slots</span>' +
            '<h2 id="casinoEngineTitle">Vintage Slots</h2>' +
            '<p>Spin fast. Supabase decides the reels, payout, ledger, and Cool Points balance.</p>' +
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
          '<div class="casino-engine-stat"><span>Balance</span><strong data-casino-balance>0 CP</strong></div>' +
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
    setText(resultEl, 'Ready. Spin costs 5 Cool Points.');
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
    const result = String(data.result || '').replace(/_/g, ' ');
    const payout = Number.parseInt(data.payout, 10) || 0;
    const net = Number.parseInt(data.net, 10) || 0;

    if (data.result === 'jackpot') return 'JACKPOT. ' + payout + ' Cool Points hit the ledger.';
    if (payout > 0) return result.toUpperCase() + '. Payout: ' + payout + ' CP. Net: ' + net + ' CP.';
    return 'No hit that spin. Cost: ' + SPIN_COST + ' CP. Run it back clean.';
  }

  async function spinSlots() {
    if (spinning) return;
    ensurePanel();

    const client = getSupabaseClient();
    if (!client) {
      setText(resultEl, 'Login system still loading. Try again in a second.');
      return;
    }

    spinning = true;
    if (spinBtn) spinBtn.disabled = true;
    if (machine) machine.classList.remove('is-win', 'is-loss');
    setText(resultEl, 'Calling Supabase engine...');
    setText(payoutEl, '—');
    setText(netEl, '—');

    try {
      const { data, error } = await client.rpc('spin_slots');
      if (error) throw error;
      const payload = data || {};
      await animateReels(payload.reels || []);
      setText(payoutEl, money(payload.payout));
      setText(netEl, money(payload.net));
      setText(resultEl, resultCopy(payload));
      if (machine) machine.classList.add((payload.payout || 0) > 0 ? 'is-win' : 'is-loss');
      await refreshPoints();
      if (typeof payload.balance !== 'undefined') {
        setText(balanceEl, money(payload.balance));
        const casinoBalance = document.getElementById('casinoCoolPoints');
        if (casinoBalance) casinoBalance.textContent = String(payload.balance);
      }
    } catch (error) {
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
    window.HWCasinoEngine = { openSlots, closeSlots, spinSlots, refreshPoints };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
