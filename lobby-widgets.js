/* HYPHSWORLD Lobby Widgets: user chip + lucky code ticker */
(function () {
  'use strict';

  if (window.__HYPHSWORLD_LOBBY_WIDGETS__) return;
  window.__HYPHSWORLD_LOBBY_WIDGETS__ = true;

  function loadScript(src) {
    if (Array.from(document.scripts).some((s) => s.src && s.src.includes(src))) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    document.body.appendChild(script);
  }

  function injectStyles() {
    if (document.getElementById('lobby-widgets-style')) return;
    const style = document.createElement('style');
    style.id = 'lobby-widgets-style';
    style.textContent = `
      .lobby-lucky-ticker{
        width:100%; overflow:hidden; border-top:1px solid rgba(255,255,255,.14); border-bottom:1px solid rgba(255,255,255,.14);
        background:linear-gradient(90deg,rgba(57,255,122,.20),rgba(31,252,255,.14),rgba(255,79,216,.18),rgba(255,228,92,.14));
        box-shadow:0 0 24px rgba(57,255,122,.14); position:relative; z-index:8;
      }
      .lobby-lucky-ticker-track{display:flex; width:max-content; gap:14px; align-items:center; white-space:nowrap; animation:lobbyTickerMove 32s linear infinite; padding:10px 0; font-weight:1000; text-transform:uppercase; letter-spacing:.08em;}
      .lobby-lucky-ticker-track span{display:inline-flex; align-items:center; padding:7px 12px; border-radius:999px; background:rgba(0,0,0,.42); color:#fff; border:1px solid rgba(255,255,255,.16);}
      .lobby-lucky-ticker-track b{color:#39ff7a; text-shadow:0 0 10px rgba(57,255,122,.55);}
      @keyframes lobbyTickerMove{from{transform:translateX(0)}to{transform:translateX(-50%)}}
      .hw-user-chip{display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 12px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(0,0,0,.42);font-weight:900;box-shadow:0 0 18px rgba(57,255,122,.16);}
      .hw-user-icon{display:inline-grid;place-items:center;width:30px;height:30px;border-radius:999px;background:linear-gradient(135deg,#39ff7a,#1ffcff,#ff4fd8);color:#050505;font-size:1rem;}
      .hw-user-name{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .hw-user-points{padding:5px 8px;border-radius:999px;background:#39ff7a;color:#050505;font-size:.78rem;font-weight:1000;}
      .gate-credit-box .hw-user-chip{margin-top:10px;justify-content:center;}
      .lobby-mini-user{width:min(1180px,calc(100% - 28px));margin:14px auto 0;display:flex;justify-content:flex-end;}
      @media(max-width:720px){.lobby-mini-user{justify-content:center}.hw-user-chip{border-radius:18px}.lobby-lucky-ticker-track{animation-duration:24s}}
    `;
    document.head.appendChild(style);
  }

  function injectTicker() {
    if (document.querySelector('.lobby-lucky-ticker')) return;
    const ticker = document.createElement('section');
    ticker.className = 'lobby-lucky-ticker';
    ticker.setAttribute('aria-label', 'HYPHSWORLD lucky code ticker');
    ticker.innerHTML = '<div class="lobby-lucky-ticker-track" data-lucky-code-ticker><span>WELCOME 2 HYPHSWORLD</span><b>✦</b><span>LOBBY PAD LIVE</span><b>✦</b><span>LUCKY CODE WINDOWS OPEN DAILY</span><b>✦</b></div>';

    const header = document.querySelector('.vault-header');
    if (header && header.parentNode) header.insertAdjacentElement('afterend', ticker);
    else document.body.insertBefore(ticker, document.body.firstChild);
  }

  function injectUserWidgets() {
    if (!document.querySelector('[data-user-widget]')) {
      const mini = document.createElement('div');
      mini.className = 'lobby-mini-user';
      mini.innerHTML = '<div class="hw-user-chip" data-user-widget><span class="hw-user-icon" aria-hidden="true">🧢</span><span class="hw-user-name">Guest</span><span class="hw-user-points">0 CP</span></div>';
      const main = document.querySelector('.vault-main');
      if (main) main.insertAdjacentElement('afterbegin', mini);
      else document.body.appendChild(mini);
    }

    const creditBox = document.querySelector('.gate-credit-box');
    if (creditBox && !creditBox.querySelector('[data-user-widget]')) {
      const chip = document.createElement('div');
      chip.className = 'hw-user-chip';
      chip.setAttribute('data-user-widget', '');
      chip.innerHTML = '<span class="hw-user-icon" aria-hidden="true">🧢</span><span class="hw-user-name">Guest</span><span class="hw-user-points">0 CP</span>';
      creditBox.appendChild(chip);
    }
  }

  function boot() {
    injectStyles();
    injectTicker();
    injectUserWidgets();
    loadScript('user-widget.js');
    loadScript('lucky-code-ticker.js');
    setTimeout(function () { if (window.HWUserWidget) window.HWUserWidget.refresh(); }, 700);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
