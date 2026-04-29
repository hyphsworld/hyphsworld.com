(() => {
  'use strict';

  const ACCESS_KEY = 'HW_VAULT_ACCESS_V4';
  const ACCEPTED_LEVEL_ONE_HASHES = new Set([
    '651d8948587739f3c0aa840fd250b5b547b98a83a9b84aa24800ff1293dc8ed9'
  ]);

  const form = document.getElementById('vault-form');
  const input = document.getElementById('vault-code');
  const message = document.getElementById('vault-message');
  const status = document.getElementById('vault-lock-status');
  const clearButton = document.getElementById('vault-clear');
  const buckLine = document.getElementById('buck-line');
  const reveal = document.getElementById('vault-reveal');
  const overlay = document.getElementById('transport-overlay');
  const transportTitle = document.getElementById('transport-title');
  const transportCopy = document.getElementById('transport-copy');
  const yearEl = document.getElementById('year');

  const transportSteps = [
    ['ACCESS GRANTED', 'Buck cleared the door. Duck initiated transport.'],
    ['SCANNER LOCKED', 'Vault tunnel online. Keep your hands inside the ride.'],
    ['TRANSPORTING', 'Now entering Level 1 — Quarantine Mixtape.']
  ];

  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  if (!form || !input || !message || !status) return;

  async function sha256(text) {
    const data = new TextEncoder().encode(text.trim().toUpperCase());
    const digest = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function setMessage(text) {
    message.textContent = text;
  }

  function setBuck(text) {
    if (buckLine) buckLine.textContent = text;
  }

  function saveAccess() {
    try {
      sessionStorage.setItem(ACCESS_KEY, 'level-one');
    } catch (error) {
      // Private browsing may block storage. The redirect still continues.
    }
  }

  function clearAccess() {
    try {
      sessionStorage.removeItem(ACCESS_KEY);
      sessionStorage.removeItem('HW_QUARANTINE_READY');
    } catch (error) {
      // Ignore blocked storage.
    }
  }

  function renderReady() {
    status.textContent = 'ACCESS READY — TRANSPORT PAD ARMED';
    status.style.color = 'var(--green)';
    setBuck('Scan accepted. Move like you been here before.');
    if (reveal) {
      reveal.innerHTML = `
        <article class="level-card">
          <span class="lock-badge">TRANSPORT READY</span>
          <h3>Level 1 — Quarantine Mixtape</h3>
          <p>Door cleared. Duck Sauce is opening the tunnel.</p>
          <a class="btn btn-primary" href="quarantine-mixtape.html">Enter Level 1</a>
        </article>
      `;
    }
  }

  function launchTransport() {
    saveAccess();
    try { sessionStorage.setItem('HW_QUARANTINE_READY', 'true'); } catch (error) {}
    renderReady();

    if (overlay) {
      overlay.classList.add('is-active');
      overlay.setAttribute('aria-hidden', 'false');
    }

    transportSteps.forEach(([title, copy], index) => {
      window.setTimeout(() => {
        if (transportTitle) transportTitle.textContent = title;
        if (transportCopy) transportCopy.textContent = copy;
      }, index * 850);
    });

    window.setTimeout(() => {
      window.location.href = 'quarantine-mixtape.html?transport=granted';
    }, 2800);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = input.value.trim();

    if (!value) {
      setMessage('Duck Sauce: “Type something first. I cannot scan air.”');
      setBuck('No code. No ride.');
      input.focus();
      return;
    }

    setMessage('Scanning access code…');
    setBuck('Hold still. Scanner moving.');

    const hash = await sha256(value);
    if (ACCEPTED_LEVEL_ONE_HASHES.has(hash)) {
      input.value = '';
      setMessage('Access granted. Transport loading…');
      launchTransport();
      return;
    }

    setMessage('Access denied. Duck Sauce: “That code got fake shoes on.”');
    setBuck('Denied. Back up from the rope.');
    input.select();
  });

  if (clearButton) {
    clearButton.addEventListener('click', () => {
      clearAccess();
      status.textContent = 'LOCKED — CODE REQUIRED';
      status.style.color = '';
      setMessage('Session cleared. Buck reset the door.');
      setBuck('Door reset. Try again when you ready.');
      input.value = '';
      input.focus();
    });
  }
})();
