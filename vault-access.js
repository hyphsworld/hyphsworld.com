(() => {
  'use strict';

  /*
    HYPHSWORLD Vault Access V6
    - No public code text in the page
    - Scan button does NOT grant access by itself
    - Valid code -> body scan -> access granted -> transport animation -> Level 1
    - Uses a short session transport token so direct page loads stay blocked
  */

  const TRANSPORT_TOKEN_KEY = 'HW_LEVEL1_TRANSPORT_V6';
  const LEGACY_KEYS = [
    'HW_VAULT_ACCESS_V4',
    'HW_QUARANTINE_READY',
    'HW_TRANSPORT_TOKEN',
    'HW_VAULT_ACCESS_V5'
  ];

  const ACCEPTED_LEVEL_ONE_HASHES = new Set([
    '651d8948587739f3c0aa840fd250b5b547b98a83a9b84aa24800ff1293dc8ed9'
  ]);

  const form = document.getElementById('vault-form');
  const input = document.getElementById('vault-code');
  const message = document.getElementById('vault-message');
  const status = document.getElementById('vault-lock-status');
  const clearButton = document.getElementById('vault-clear');
  const scanButton = document.getElementById('vault-scan-submit');
  const buckLine = document.getElementById('buck-line');
  const reveal = document.getElementById('vault-reveal');
  const overlay = document.getElementById('transport-overlay');
  const panel = document.getElementById('transport-panel');
  const transportTitle = document.getElementById('transport-title');
  const transportCopy = document.getElementById('transport-copy');
  const transportStatus = document.getElementById('transport-status');
  const destination = document.getElementById('transport-destination');
  const countdown = document.getElementById('transport-countdown');
  const yearEl = document.getElementById('year');

  const transportSteps = [
    {
      delay: 0,
      phase: 'phase-scan',
      title: 'BODY SCAN ACTIVE',
      copy: 'Buck locked the door. Duck Sauce moving the green line.',
      status: 'SCAN IN PROGRESS'
    },
    {
      delay: 1150,
      phase: 'phase-scan',
      title: 'SCAN CLEAN',
      copy: 'No fake pass detected. No public hints used. You looking valid.',
      status: 'BODY SIGNATURE VERIFIED'
    },
    {
      delay: 2250,
      phase: 'phase-granted',
      title: 'ACCESS GRANTED',
      copy: 'Buck cleared the door. Duck Sauce said: “Aight, you in. Do not embarrass me.”',
      status: 'TRANSPORT PAD WARMING'
    },
    {
      delay: 3400,
      phase: 'phase-transport',
      title: 'TRANSPORT INITIATED',
      copy: 'Bay portal online. Sliding into Level 1 — Quarantine Mixtape.',
      status: 'NOW ENTERING THE VAULT'
    }
  ];

  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  if (!form || !input || !message || !status) return;

  function removeLegacyAccess() {
    try {
      LEGACY_KEYS.forEach((key) => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      });
    } catch (error) {
      // Storage may be blocked in private mode. The current scan still works.
    }
  }

  removeLegacyAccess();

  async function sha256(text) {
    const data = new TextEncoder().encode(text.trim().toUpperCase());
    const digest = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function setMessage(text) {
    if (message) message.textContent = text;
  }

  function setBuck(text) {
    if (buckLine) buckLine.textContent = text;
  }

  function setPanelPhase(phase) {
    if (!panel) return;
    panel.classList.remove('phase-scan', 'phase-granted', 'phase-transport');
    panel.classList.add(phase);
  }

  function updateScanButton() {
    if (!scanButton) return;
    const ready = input.value.trim().length >= 4;
    scanButton.disabled = !ready;
    scanButton.setAttribute('aria-disabled', String(!ready));
    scanButton.textContent = ready ? 'Run Body Scan' : 'Code First';
  }

  function lockForm(isLocked) {
    input.disabled = isLocked;
    if (scanButton) scanButton.disabled = isLocked;
    if (clearButton) clearButton.disabled = isLocked;
  }

  function clearTransportToken() {
    try {
      sessionStorage.removeItem(TRANSPORT_TOKEN_KEY);
    } catch (error) {
      // Ignore blocked storage.
    }
  }

  function createTransportToken() {
    const token = {
      level: 'level-one',
      grantedAt: Date.now(),
      route: 'quarantine-mixtape',
      nonce: Math.random().toString(36).slice(2)
    };

    try {
      sessionStorage.setItem(TRANSPORT_TOKEN_KEY, JSON.stringify(token));
    } catch (error) {
      // If storage is blocked, the redirect still runs, but Level 1 may ask for another scan.
    }
  }

  function renderLocked() {
    status.textContent = 'LOCKED — CODE REQUIRED';
    status.style.color = '';
    setBuck('No scan, no transport.');
    if (reveal) {
      reveal.innerHTML = `
        <article class="level-card">
          <span class="lock-badge">LOCKED</span>
          <h3>Level 1 — Quarantine Mixtape</h3>
          <p>Body scan required. The transport pad does not open from a button tap alone.</p>
        </article>
      `;
    }
  }

  function renderScanning() {
    status.textContent = 'BODY SCAN RUNNING';
    status.style.color = 'var(--yellow)';
    setBuck('Hold still. Scanner moving.');
    if (reveal) {
      reveal.innerHTML = `
        <article class="level-card">
          <span class="lock-badge">SCANNING</span>
          <h3>Body Scan In Progress</h3>
          <p>Buck is checking the door. Duck Sauce is checking the signal. Transport is not active yet.</p>
        </article>
      `;
    }
  }

  function renderTransportReady() {
    status.textContent = 'ACCESS GRANTED — TRANSPORT ACTIVE';
    status.style.color = 'var(--green)';
    setBuck('Scan accepted. Door opening.');
    if (reveal) {
      reveal.innerHTML = `
        <article class="level-card">
          <span class="lock-badge">TRANSPORTING</span>
          <h3>Level 1 — Quarantine Mixtape</h3>
          <p>Portal online. Do not refresh. Duck Sauce is sending you through now.</p>
        </article>
      `;
    }
  }

  function openOverlay() {
    if (!overlay) return;
    overlay.classList.add('is-active');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function setTransportStep(step) {
    setPanelPhase(step.phase);
    if (transportTitle) transportTitle.textContent = step.title;
    if (transportCopy) transportCopy.textContent = step.copy;
    if (transportStatus) transportStatus.textContent = step.status;
  }

  function startCountdown(totalMs) {
    if (!countdown) return;
    const startedAt = Date.now();

    function tick() {
      const remaining = Math.max(0, totalMs - (Date.now() - startedAt));
      const seconds = Math.ceil(remaining / 1000);
      countdown.textContent = `Transport in ${seconds}`;
      if (remaining > 0) requestAnimationFrame(tick);
    }

    tick();
  }

  function launchTransport() {
    clearTransportToken();
    createTransportToken();
    renderTransportReady();
    openOverlay();
    lockForm(true);
    startCountdown(5200);

    if (destination) destination.textContent = 'DESTINATION: LEVEL 1 — QUARANTINE MIXTAPE';

    transportSteps.forEach((step) => {
      window.setTimeout(() => setTransportStep(step), step.delay);
    });

    window.setTimeout(() => {
      window.location.href = 'quarantine-mixtape.html';
    }, 5250);
  }

  function denyAccess() {
    clearTransportToken();
    setMessage('Access denied. Duck Sauce: “That button not magic. Code gotta be clean.”');
    setBuck('Denied. Button tap alone does not move the door.');
    status.textContent = 'LOCKED — CODE REQUIRED';
    status.style.color = 'var(--red)';
    input.select();
    updateScanButton();
  }

  input.addEventListener('input', () => {
    updateScanButton();
    if (!input.value.trim()) {
      setMessage('Duck Sauce: “Type the code first. I cannot scan vibes.”');
      renderLocked();
    } else {
      setMessage('Code staged. Run the body scan when ready.');
      setBuck('Code entered. Scanner waiting.');
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const value = input.value.trim();
    if (!value) {
      clearTransportToken();
      setMessage('Duck Sauce: “Type the code first. The button is not the key.”');
      setBuck('No code. No scan. No ride.');
      input.focus();
      updateScanButton();
      return;
    }

    if (value.length < 4) {
      clearTransportToken();
      setMessage('Duck Sauce: “That code too short to even scare the scanner.”');
      setBuck('Denied. Real code required.');
      input.focus();
      updateScanButton();
      return;
    }

    renderScanning();
    lockForm(true);
    openOverlay();
    setTransportStep(transportSteps[0]);
    if (destination) destination.textContent = 'DESTINATION: WAITING ON CLEARANCE';
    if (countdown) countdown.textContent = 'Scanning…';

    try {
      const hash = await sha256(value);
      window.setTimeout(() => {
        if (ACCEPTED_LEVEL_ONE_HASHES.has(hash)) {
          input.value = '';
          setMessage('Access granted. Body scan clean. Transport loading…');
          launchTransport();
        } else {
          if (overlay) {
            overlay.classList.remove('is-active');
            overlay.setAttribute('aria-hidden', 'true');
          }
          lockForm(false);
          denyAccess();
        }
      }, 1050);
    } catch (error) {
      if (overlay) {
        overlay.classList.remove('is-active');
        overlay.setAttribute('aria-hidden', 'true');
      }
      lockForm(false);
      setMessage('Scanner error. Reload the page and try again.');
      setBuck('System hiccup. Door stayed locked.');
    }
  });

  if (clearButton) {
    clearButton.addEventListener('click', () => {
      clearTransportToken();
      input.value = '';
      lockForm(false);
      renderLocked();
      setMessage('Session cleared. Buck reset the door.');
      input.focus();
      updateScanButton();
    });
  }

  renderLocked();
  updateScanButton();
})();