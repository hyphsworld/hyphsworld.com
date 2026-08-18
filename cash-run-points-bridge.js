/* HYPHSWORLD Chase the Bag Points Bridge
   Bridges the embedded Chase the Bag build into the same HWPoints account/global pipeline.
   It does not replace the game. It watches for native Chase the Bag events, score/cash/run signals,
   and awards Cool Points safely.
*/
(function () {
  'use strict';

  if (window.HWChaseTheBagBridgeV1) return;

  const STORAGE_PREFIX = 'hyphsworld.chaseTheBag.bridge.';
  const SESSION_AWARDED_KEY = STORAGE_PREFIX + 'awardedRuns';
  const BEST_SCORE_KEY = STORAGE_PREFIX + 'bestScore';
  const LAST_AWARD_KEY = STORAGE_PREFIX + 'lastAwardAt';
  const SCAN_INTERVAL = 1800;
  const MIN_AWARD_GAP_MS = 8000;

  let bestScore = number(localStorage.getItem(BEST_SCORE_KEY));
  let lastCandidate = { score: 0, source: 'boot', at: Date.now() };
  let lastAwardAt = number(sessionStorage.getItem(LAST_AWARD_KEY));
  let scanner = null;
  let observer = null;

  function number(value) {
    const n = Number(String(value || '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }

  function readJson(key, fallback) {
    try { return JSON.parse(sessionStorage.getItem(key) || 'null') || fallback; } catch (error) { return fallback; }
  }

  function writeJson(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (error) {}
  }

  function setText(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.textContent = String(value);
  }

  function toast(message) {
    let box = document.getElementById('hwChaseTheBagBridgeToast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'hwChaseTheBagBridgeToast';
      box.style.cssText = 'position:fixed;left:50%;bottom:76px;z-index:2147483647;transform:translateX(-50%) translateY(18px);opacity:0;max-width:min(92vw,620px);padding:12px 16px;border-radius:99px;background:#1a1a1a;border:1px solid #00ff66;color:#00ff66;font-family:monospace;font-size:13px;text-align:center;box-shadow:0 0 24px rgba(0,255,102,.2),inset 0 0 8px rgba(0,255,102,.08);transition:opacity 320ms ease,transform 320ms ease;pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      document.body.appendChild(box);
    }
    box.textContent = message;
    box.style.opacity = '1';
    box.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(box._timer);
    box._timer = setTimeout(function () {
      box.style.opacity = '0';
      box.style.transform = 'translateX(-50%) translateY(18px)';
    }, 3600);
  }

  function ensureHud() {
    if (document.getElementById('hwChaseTheBagBridgeHud')) return;
    const hud = document.createElement('aside');
    hud.id = 'hwChaseTheBagBridgeHud';
    hud.innerHTML = '<strong>Chase the Bag Bridge</strong><span>Global Cool Points linked</span><small>Best: <b id="hwChaseTheBagBest">0</b></small>';
    hud.style.cssText = 'position:fixed;left:12px;top:max(12px,env(safe-area-inset-top));z-index:2147483646;display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 10px;border-radius:16px;background:#1a1a1a;border:1px solid #00ff66;color:#00ff66;font-family:monospace;font-size:11px;box-shadow:0 0 16px rgba(0,255,102,.16),inset 0 0 6px rgba(0,255,102,.06);';
    document.body.appendChild(hud);
    setText('#hwChaseTheBagBest', bestScore);
  }

  function pointsAwardFor(score) {
    if (score <= 0) return 0;
    if (score < 50) return 2;
    if (score < 150) return 5;
    if (score < 350) return 10;
    if (score < 700) return 18;
    if (score < 1200) return 25;
    return 40;
  }

  function runFingerprint(score, source, runId) {
    const stableRun = runId || Math.floor(Date.now() / 45000);
    return [stableRun, source || 'chase_the_bag', score].join(':');
  }

  function hasAwarded(fingerprint) {
    const awarded = readJson(SESSION_AWARDED_KEY, {});
    return Boolean(awarded[fingerprint]);
  }

  function markAwarded(fingerprint) {
    const awarded = readJson(SESSION_AWARDED_KEY, {});
    awarded[fingerprint] = Date.now();
    const keys = Object.keys(awarded).slice(-50);
    const trimmed = {};
    keys.forEach(function (key) { trimmed[key] = awarded[key]; });
    writeJson(SESSION_AWARDED_KEY, trimmed);
  }

  async function refreshGlobalPoints() {
    try {
      if (window.HWPoints && typeof window.HWPoints.refresh === 'function') await window.HWPoints.refresh();
    } catch (error) {}
  }

  async function award(score, source, metadata) {
    score = number(score);
    metadata = metadata || {};
    if (!score) return 0;

    lastCandidate = { score: score, source: source || 'chase_the_bag', at: Date.now(), metadata: metadata };
    if (score > bestScore) {
      bestScore = score;
      try { localStorage.setItem(BEST_SCORE_KEY, String(bestScore)); } catch (error) {}
      setText('#hwChaseTheBagBest', bestScore);
    }

    const now = Date.now();
    if (now - lastAwardAt < MIN_AWARD_GAP_MS) return 0;

    const fingerprint = runFingerprint(score, source, metadata.runId);
    if (hasAwarded(fingerprint)) return 0;

    const amount = pointsAwardFor(score);
    if (!amount) return 0;

    lastAwardAt = now;
    try { sessionStorage.setItem(LAST_AWARD_KEY, String(lastAwardAt)); } catch (error) {}
    markAwarded(fingerprint);

    const payload = Object.assign({ score: score, source: source || 'chase_the_bag_bridge' }, metadata);

    try {
      if (window.HWPoints && typeof window.HWPoints.add === 'function') {
        await window.HWPoints.add(amount, 'chase_the_bag_score', payload);
      } else if (window.HWAuth && typeof window.HWAuth.addPoints === 'function') {
        await window.HWAuth.addPoints(amount, 'chase_the_bag_score');
      } else {
        document.dispatchEvent(new CustomEvent('hyph:points:add', { detail: { amount: amount, reason: 'chase_the_bag_score', metadata: payload } }));
      }
      await refreshGlobalPoints();
      toast('Chase the Bag score ' + score + ' linked. +' + amount + ' Cool Points sent global.');
      return amount;
    } catch (error) {
      toast('Chase the Bag score seen, but points sync needs reload. Score: ' + score);
      return 0;
    }
  }

  function scoreFromText(text) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return 0;
    const patterns = [
      /(?:score|cash|bag|bags|coins|money|points)\D{0,16}(\d{1,7})/i,
      /(\d{1,7})\D{0,16}(?:score|cash|bag|bags|coins|money|points)/i,
      /game\s*over[\s\S]{0,120}?(\d{1,7})/i
    ];
    for (const pattern of patterns) {
      const match = clean.match(pattern);
      if (match) return number(match[1]);
    }
    return 0;
  }

  function scanDom() {
    const root = document.getElementById('root') || document.body;
    const text = root ? root.innerText || root.textContent || '' : '';
    const score = scoreFromText(text);
    if (score) lastCandidate = { score: score, source: 'dom_scan', at: Date.now() };
    if (/game\s*over|final\s*score|you\s*(won|lost)|try\s*again|restart/i.test(text) && score) award(score, 'dom_game_over');
  }

  function hookStorage() {
    const originalSetItem = Storage.prototype.setItem;
    if (Storage.prototype.__hwChaseTheBagBridgeSetItem) return;
    Storage.prototype.__hwChaseTheBagBridgeSetItem = true;
    Storage.prototype.setItem = function (key, value) {
      const result = originalSetItem.apply(this, arguments);
      try {
        const joined = String(key || '') + ' ' + String(value || '');
        if (/bag|run|score|coin|chase|point|game/i.test(joined)) {
          const score = Math.max(number(value), scoreFromText(joined));
          if (score) {
            lastCandidate = { score: score, source: 'storage:' + key, at: Date.now() };
            if (/final|game|over|best|score|bag/i.test(joined)) award(score, 'storage:' + key, { storageKey: key });
          }
        }
      } catch (error) {}
      return result;
    };
  }

  function handleNativeSignal(detail, source, shouldAward) {
    detail = detail || {};
    const score = number(detail.finalScore || detail.score || detail.points || detail.cash || detail.coins || detail.bags);
    if (!score) return;
    lastCandidate = { score: score, source: source, at: Date.now(), metadata: detail };
    if (shouldAward) award(score, source, detail);
  }

  function hookNativeEvents() {
    const passiveEvents = ['start', 'score', 'state', 'life', 'pause', 'resume', 'stop'];
    passiveEvents.forEach(function (name) {
      window.addEventListener('hw:chasethebag:' + name, function (event) {
        handleNativeSignal(event.detail || {}, 'native_' + name, false);
      });
    });

    window.addEventListener('hw:chasethebag:gameover', function (event) {
      handleNativeSignal(event.detail || {}, 'native_game_over', true);
    });
  }

  function hookMessages() {
    window.addEventListener('message', function (event) {
      const data = event.data || {};
      const text = typeof data === 'string' ? data : JSON.stringify(data);
      if (!/bag|run|score|coin|chase|point|game|hw:chasethebag/i.test(text)) return;
      const score = number(data.finalScore || data.score || data.points || data.cash || data.coins || data.bags) || scoreFromText(text);
      if (score) {
        lastCandidate = { score: score, source: 'postmessage', at: Date.now(), metadata: data };
        if (/game\s*over|final|complete|finished|chase_the_bag_score|hw:chasethebag:gameover/i.test(text)) award(score, 'postmessage', data);
      }
    });
  }

  function bindKeyboardFallback() {
    window.addEventListener('keydown', function (event) {
      if (!event.altKey || !event.shiftKey || event.key.toLowerCase() !== 'c') return;
      const score = lastCandidate.score || bestScore;
      if (score) award(score, 'manual_chase_the_bag_bridge', lastCandidate.metadata || {});
      else toast('Chase the Bag bridge ready. Play first, then Alt+Shift+C can force-sync the detected score.');
    });
  }

  function boot() {
    ensureHud();
    hookStorage();
    hookNativeEvents();
    hookMessages();
    bindKeyboardFallback();
    refreshGlobalPoints();
    try {
      observer = new MutationObserver(function () { scanDom(); });
      observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    } catch (error) {}
    scanner = setInterval(scanDom, SCAN_INTERVAL);
    scanDom();
    toast('Chase the Bag is connected to global Cool Points.');
  }

  window.HWChaseTheBagBridgeV1 = {
    award: award,
    scan: scanDom,
    getBest: function () { return bestScore; },
    getLastCandidate: function () { return Object.assign({}, lastCandidate); },
    stop: function () { if (scanner) clearInterval(scanner); if (observer) observer.disconnect(); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
