(() => {
  'use strict';

  const ACCESS_KEY = 'HW_VAULT_ACCESS_V3';
  const form = document.getElementById('vault-form');
  const input = document.getElementById('vault-code');
  const message = document.getElementById('vault-message');
  const status = document.getElementById('vault-lock-status');
  const reveal = document.getElementById('vault-reveal');
  const clearButton = document.getElementById('vault-clear');

  if (!form || !input || !message || !status || !reveal) return;

  const accessHashes = {
    master: '651d8948587739f3c0aa840fd250b5b547b98a83a9b84aa24800ff1293dc8ed9',
    floorOne: 'fef58ef40bdc41f3deb181df880f04bb2bff07c8b783b57614ebe72078cec309',
    floorTwo: '4c832c3dfc6353ed5ad8db26d155402713c004e9b7d00ee4239d2211134923b3'
  };

  async function sha256(text) {
    const data = new TextEncoder().encode(text.trim().toUpperCase());
    const digest = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function saveAccess(level) {
    sessionStorage.setItem(ACCESS_KEY, level);
  }

  function getSavedAccess() {
    return sessionStorage.getItem(ACCESS_KEY) || '';
  }

  function setMessage(text) {
    message.textContent = text;
  }

  function renderLocked() {
    status.textContent = 'LOCKED — CODE REQUIRED';
    status.style.color = '';
    reveal.innerHTML = `
      <article class="vault-card glass-card locked-card">
        <span class="lock-badge">FLOOR 1 WAITING</span>
        <h2>Quarantine Mixtape Floor</h2>
        <p>Hidden era. Unreleased pressure. First reward lane.</p>
        <p class="status-line">Access needed before the floor opens.</p>
      </article>
    `;
  }

  function renderFloorOne() {
    status.textContent = 'LEVEL 1 OPEN — BUCK STEPPED ASIDE';
    reveal.innerHTML = `
      <article class="vault-card glass-card">
        <span class="lock-badge">LEVEL 1 OPEN</span>
        <h2>Quarantine Mixtape Floor</h2>
        <p>Hidden era. Unreleased pressure. First reward lane unlocked.</p>
        <div class="button-row compact-actions">
          <a class="btn btn-primary" href="app-player.html">Open Player</a>
          <a class="btn btn-soft" href="index.html#spotlight">Artist Spotlight</a>
        </div>
      </article>
      <article class="vault-card glass-card locked-card">
        <span class="lock-badge">NEXT FLOOR LOCKED</span>
        <h2>Deeper Floor</h2>
        <p>Duck Sauce says the next room is not for lobby traffic.</p>
        <p class="status-line">Run the right scan to go deeper.</p>
      </article>
    `;
  }

  function renderAllFloors() {
    status.textContent = 'MASTER OPEN — FULL VAULT MOTION';
    reveal.innerHTML = `
      <article class="vault-card glass-card">
        <span class="lock-badge">LEVEL 1 OPEN</span>
        <h2>Quarantine Mixtape Floor</h2>
        <p>Hidden era. Unreleased pressure. First reward lane unlocked.</p>
        <div class="button-row compact-actions">
          <a class="btn btn-primary" href="app-player.html">Open Player</a>
          <a class="btn btn-soft" href="index.html#spotlight">Artist Spotlight</a>
        </div>
      </article>
      <article class="vault-card glass-card">
        <span class="lock-badge">LEVEL 2 OPEN</span>
        <h2>HYPHSWORLD 5 Floor</h2>
        <p>Current pressure. Premium rollout room. Keep final drops protected until release.</p>
        <div class="button-row compact-actions">
          <a class="btn btn-primary" href="app-player.html#track-ham">HYPHSWORLD Player</a>
          <a class="btn btn-soft" href="shop.html">Merch Tie-In</a>
        </div>
      </article>
    `;
  }

  function applyAccess(level) {
    if (level === 'master' || level === 'floorTwo') {
      renderAllFloors();
      setMessage('Scan accepted. Duck lit the hallway. Buck opened the door.');
      return;
    }

    if (level === 'floorOne') {
      renderFloorOne();
      setMessage('Level 1 accepted. First floor open.');
      return;
    }

    renderLocked();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = input.value.trim();

    if (!value) {
      setMessage('Duck Sauce said type something first.');
      input.focus();
      return;
    }

    setMessage('Scanning...');
    const hash = await sha256(value);

    if (hash === accessHashes.master) {
      saveAccess('master');
      applyAccess('master');
      input.value = '';
      return;
    }

    if (hash === accessHashes.floorTwo) {
      saveAccess('floorTwo');
      applyAccess('floorTwo');
      input.value = '';
      return;
    }

    if (hash === accessHashes.floorOne) {
      saveAccess('floorOne');
      applyAccess('floorOne');
      input.value = '';
      return;
    }

    sessionStorage.removeItem(ACCESS_KEY);
    renderLocked();
    setMessage('Denied. Buck said: “I need you to leave.”');
  });

  clearButton?.addEventListener('click', () => {
    input.value = '';
    sessionStorage.removeItem(ACCESS_KEY);
    renderLocked();
    setMessage('Scanner cleared. Door locked again.');
    input.focus();
  });

  applyAccess(getSavedAccess());
})();
