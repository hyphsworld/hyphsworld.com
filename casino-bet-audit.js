/* HYPHSWORLD Casino Bet Audit
   Lightweight receipt layer for casino/gameplay actions.
   It does not change point totals by itself. It checks affordability, logs bet/result metadata,
   dispatches audit events, and stores a local black-box trail for debugging consumer trust issues.
*/
(function () {
  'use strict';

  if (window.HWBetAudit) return;

  const LOG_KEY = 'hyphsworld.betAudit.log.v1';
  const MAX_LOGS = 80;
  const pending = new Map();

  function number(value) {
    const n = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? Math.floor(n) : 0;
  }

  function id(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return prefix + '-' + window.crypto.randomUUID();
    return prefix + '-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  function readLog() {
    try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch (error) { return []; }
  }

  function writeLog(log) {
    try { localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-MAX_LOGS))); } catch (error) {}
  }

  function getBalance() {
    try {
      if (window.HWPoints && typeof window.HWPoints.get === 'function') return number(window.HWPoints.get());
      if (window.HWPoints && typeof window.HWPoints.getState === 'function') return number(window.HWPoints.getState().points);
    } catch (error) {}

    const selectors = ['[data-hw-points]', '#casinoCoolPoints', '#balance', '#gateCredits', '#cool-points'];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent) return number(el.textContent);
    }
    return 0;
  }

  function emit(type, receipt) {
    const event = new CustomEvent('hw:bet-audit', { detail: { type, receipt } });
    window.dispatchEvent(event);
    document.dispatchEvent(event);
  }

  function save(receipt) {
    const log = readLog();
    const existing = log.findIndex((item) => item.auditId === receipt.auditId);
    if (existing >= 0) log[existing] = receipt;
    else log.push(receipt);
    writeLog(log);
    return receipt;
  }

  function start(input) {
    const data = input || {};
    const bet = Math.max(0, number(data.bet ?? data.amount ?? data.cost));
    const balanceBefore = number(data.balanceBefore ?? getBalance());
    const auditId = data.auditId || id(data.game || 'bet');
    const approved = data.allowOverdraft ? true : bet <= balanceBefore;
    const receipt = {
      auditId,
      status: approved ? 'approved' : 'blocked',
      game: data.game || 'casino',
      action: data.action || 'bet',
      bet,
      balanceBefore,
      balanceAfter: null,
      payout: 0,
      net: 0,
      result: approved ? 'pending' : 'insufficient_points',
      runId: data.runId || auditId,
      metadata: data.metadata || {},
      startedAt: new Date().toISOString(),
      resolvedAt: null
    };
    pending.set(auditId, receipt);
    save(receipt);
    emit('start', receipt);
    if (!approved) emit('blocked', receipt);
    return receipt;
  }

  function resolve(auditId, input) {
    const data = input || {};
    const current = pending.get(auditId) || readLog().find((item) => item.auditId === auditId) || { auditId };
    const balanceAfter = number(data.balanceAfter ?? getBalance());
    const payout = number(data.payout);
    const bet = number(data.bet ?? current.bet);
    const net = typeof data.net === 'undefined' ? payout - bet : number(data.net);
    const receipt = Object.assign({}, current, {
      status: data.status || 'resolved',
      result: data.result || current.result || 'complete',
      bet,
      payout,
      net,
      balanceBefore: number(current.balanceBefore),
      balanceAfter,
      metadata: Object.assign({}, current.metadata || {}, data.metadata || {}),
      resolvedAt: new Date().toISOString()
    });
    pending.delete(auditId);
    save(receipt);
    emit('resolve', receipt);
    return receipt;
  }

  function reject(auditId, input) {
    const data = input || {};
    return resolve(auditId, {
      status: 'error',
      result: data.reason || data.message || 'error',
      payout: 0,
      net: -Math.abs(number(data.bet)),
      balanceAfter: data.balanceAfter,
      metadata: data.metadata || {}
    });
  }

  function toast(message) {
    let box = document.getElementById('hwBetAuditToast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'hwBetAuditToast';
      box.style.cssText = 'position:fixed;right:14px;bottom:138px;z-index:2147483000;max-width:min(92vw,360px);padding:11px 13px;border-radius:16px;background:linear-gradient(135deg,#071108,#1b0b13);border:1px solid rgba(57,255,122,.45);color:#fff;font:900 12px/1.35 Arial,Helvetica,sans-serif;box-shadow:0 18px 44px rgba(0,0,0,.42);opacity:0;transform:translateY(14px);transition:.22s ease;pointer-events:none';
      document.body.appendChild(box);
    }
    box.textContent = message;
    box.style.opacity = '1';
    box.style.transform = 'translateY(0)';
    clearTimeout(box._timer);
    box._timer = setTimeout(function () {
      box.style.opacity = '0';
      box.style.transform = 'translateY(14px)';
    }, 2600);
  }

  function watchAuditEvents() {
    window.addEventListener('hw:bet-audit', function (event) {
      const detail = event.detail || {};
      const receipt = detail.receipt || {};
      if (detail.type === 'blocked') toast('Bet blocked: not enough Cool Points.');
      if (detail.type === 'resolve' && receipt.status === 'resolved') toast('Bet audit saved: ' + receipt.game + ' net ' + receipt.net + ' CP.');
    });
  }

  window.HWBetAudit = {
    start,
    resolve,
    reject,
    getBalance,
    getLog: readLog,
    clearLog: function () { writeLog([]); pending.clear(); },
    pending: function () { return Array.from(pending.values()); }
  };

  watchAuditEvents();
})();
