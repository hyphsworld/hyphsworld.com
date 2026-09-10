/* HYPHSWORLD visual cheat codes. Cosmetic only; never changes points or game state. */
(function () {
  'use strict';
  var ACTIVE_KEY = 'hyphsworld:casino:visual-code:v1';
  var allowed = { PRESSURE: 'pressure', BAYMODE: 'baymode', DUCKSAUCE: 'duck', CLEAN: 'clean' };

  function addCinematicLayer() {
    if (document.querySelector('.casino-cinematic-layer')) return;
    var layer = document.createElement('div');
    layer.className = 'casino-cinematic-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = '<div class="casino-skyline"></div><div class="casino-searchlights"></div>';
    document.body.prepend(layer);
  }

  function addConsole() {
    if (document.getElementById('casinoCodeConsole')) return;
    var dialog = document.createElement('dialog');
    dialog.id = 'casinoCodeConsole';
    dialog.className = 'casino-code-console';
    dialog.innerHTML = '<form class="casino-code-card" method="dialog"><small>AMS WEST // SECRET TERMINAL</small><h2>Enter Casino Code</h2><p>Codes unlock visual modes only. Points and gameplay stay fair.</p><input class="casino-code-input" id="casinoCodeInput" maxlength="16" autocomplete="off" spellcheck="false" aria-label="Casino visual code"><div class="casino-code-actions"><button class="casino-code-submit" value="submit">Activate</button><button class="casino-code-close" value="cancel">Close</button></div></form>';
    document.body.append(dialog);
    dialog.addEventListener('close', function () {
      if (dialog.returnValue === 'submit') activate(document.getElementById('casinoCodeInput').value);
      document.getElementById('casinoCodeInput').value = '';
    });
  }

  function toast(message) {
    var node = document.getElementById('casinoCodeToast');
    if (!node) { node = document.createElement('div'); node.id = 'casinoCodeToast'; node.className = 'casino-code-toast'; node.setAttribute('role', 'status'); document.body.append(node); }
    node.textContent = message; node.classList.add('show'); clearTimeout(node._timer); node._timer = setTimeout(function () { node.classList.remove('show'); }, 2600);
  }

  function duckRain() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { toast('DUCK SAUCE MODE FOUND'); return; }
    for (var i = 0; i < 18; i += 1) (function (index) {
      setTimeout(function () { var duck = document.createElement('span'); duck.className = 'casino-duck-rain'; duck.textContent = '🦆'; duck.style.left = ((index * 37) % 96) + '%'; duck.style.animationDelay = ((index % 4) * 0.08) + 's'; document.body.append(duck); setTimeout(function () { duck.remove(); }, 3400); }, index * 65);
    })(i);
  }

  function setMode(mode) {
    document.body.classList.remove('cheat-pressure', 'cheat-baymode');
    if (mode === 'pressure') document.body.classList.add('cheat-pressure');
    if (mode === 'baymode') document.body.classList.add('cheat-baymode');
    try { if (mode === 'clean' || mode === 'duck') localStorage.removeItem(ACTIVE_KEY); else localStorage.setItem(ACTIVE_KEY, mode); } catch (error) {}
  }

  function activate(rawCode) {
    var code = String(rawCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    var mode = allowed[code];
    if (!mode) { toast('CODE DENIED // KEEP EXPLORING'); if (window.HWCasinoSound) window.HWCasinoSound.miss(); return false; }
    if (mode === 'duck') duckRain(); else setMode(mode);
    if (mode === 'clean') toast('VISUAL MODES CLEARED');
    else toast(code + ' // VISUAL MODE ACTIVATED');
    if (window.HWCasinoSound) window.HWCasinoSound.jackpot();
    return true;
  }

  function openConsole() {
    var dialog = document.getElementById('casinoCodeConsole');
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    setTimeout(function () { document.getElementById('casinoCodeInput').focus(); }, 0);
  }

  function bind() {
    addCinematicLayer(); addConsole();
    try { var saved = localStorage.getItem(ACTIVE_KEY); if (saved === 'pressure' || saved === 'baymode') setMode(saved); } catch (error) {}
    var button = document.getElementById('casinoCodeButton');
    if (button) button.addEventListener('click', openConsole);
  }

  window.HWCasinoCodes = { activate: activate, open: openConsole };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
})();
