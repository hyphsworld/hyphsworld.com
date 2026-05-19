(() => {
  'use strict';

  const LEVEL_ONE_DESTINATION = 'quarantine-mixtape.html';
  const LEVEL_ONE_TRANSPORT_READY_KEY = 'HW_LEVEL1_TRANSPORT_READY';
  const LEVEL_ONE_TRANSPORT_V6_KEY = 'HW_LEVEL1_TRANSPORT_V6';
  const LOBBY_UNLOCK_KEY = 'HW_LOBBY_BOUNCE_UNLOCKED';
  const POINTS_EVENT = 'hyph:points:add';

  const lobbyTracks = {
    withMe: { title: 'WITH ME', meta: 'Hyph Life — prod by KMT', sources: ['01_WITH_ME.MP3', '01_WITH_ME.mp3', 'with-me.mp3', 'WITH ME.mp3', 'With Me.mp3'] },
    boutYou: { title: 'BOUT YOU', meta: 'BooGotGluu — Lobby Music', sources: ['02-bout-you.mp3', '02_BOUT_YOU.mp3', '02_BOUT_YOU.MP3', 'bout-you.mp3', 'Bout You.mp3'] },
    newkie: { title: 'NEWKIE', meta: 'Hyph Life — prod by KMT', sources: ['03_NEWKIE.MP3', '03_NEWKIE.mp3', 'newkie.mp3', 'NEWKIE.mp3', 'Newkie.mp3'] },
    etg: { title: 'ETG', meta: 'BooGotGluu & Hyph Life', sources: ['04_ETG.MP3', '04_ETG.mp3', 'etg.mp3', 'ETG.mp3'] },
    on: { title: 'ON', meta: 'Hyph Life & KMT', sources: ['05_ON.MP3', '05_ON.mp3', 'on.mp3', 'ON.mp3', 'On.mp3'] },
    bounceOut: { title: 'BOUNCE OUT', meta: 'Hidden Track 06 — code reveal route', sources: ['06_BOUNCE_OUT.MP3', '06_BOUNCE_OUT.mp3', 'bounce-out.mp3', 'BOUNCE OUT.mp3', 'Bounce Out.mp3'] },
    neonLights: { title: 'NEON LIGHTS', meta: 'Lobby bonus — Cool Points slot signal', sources: ['neon-lights.mp3', 'NEON_LIGHTS.mp3', 'Neon Lights.mp3'] }
  };

  const visibleTrackIds = ['withMe', 'boutYou', 'newkie', 'etg', 'on'];
  const hiddenTrackId = 'bounceOut';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  let trackButtons = [];
  let activeTrackId = 'withMe';
  let activeSourceIndex = 0;
  let playRequested = false;
  let hiddenTrackTriggered = false;
  let revealedCode = false;

  function safeSet(key, value) { try { localStorage.setItem(key, String(value)); } catch (error) {} }
  function safeSessionSet(key, value) { try { sessionStorage.setItem(key, String(value)); } catch (error) {} }
  function setPlayerStatus(message) { const el = $('#gatePlayerStatus'); if (el) el.textContent = message; }
  function setGateStatus(status, pad, message) { const gateStatus = $('#gateStatus'); const padStatus = $('#padStatus'); const consoleMessage = $('#consoleMessage'); if (gateStatus) gateStatus.textContent = status; if (padStatus) padStatus.textContent = pad; if (consoleMessage) consoleMessage.textContent = message; }
  function addPoints(amount, reason) { document.dispatchEvent(new CustomEvent(POINTS_EVENT, { detail: { amount, reason: reason || 'lobby_casino' } })); }

  function injectNoBlankFix() {
    if (document.getElementById('hwNoBlankFix')) return;
    const style = document.createElement('style');
    style.id = 'hwNoBlankFix';
    style.textContent = 'html,body{min-height:100%;background:#06170d!important}.home-page,.vault-page{background:#06170d!important}.site-footer{margin-bottom:0!important;padding-bottom:96px!important}.cash-run-home,.section-pad,.gate-arcade{position:relative}.hw-code-reveal{margin-top:14px;padding:16px;border:2px solid #63ff39;border-radius:18px;background:linear-gradient(90deg,rgba(57,255,122,.18),rgba(255,59,166,.16));color:#fff;font-weight:950;letter-spacing:.08em;text-align:center;box-shadow:0 0 28px rgba(57,255,122,.35)}.hw-code-reveal strong{display:block;font-size:clamp(28px,10vw,56px);color:#63ff39;text-shadow:3px 3px 0 #ff3ba6}.hw-neon-casino-pill{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 14px;border-radius:999px;background:linear-gradient(90deg,#68ff00,#23ffd0,#ff4bad);color:#050505;font-weight:950;text-transform:uppercase;box-shadow:0 10px 0 #020602,0 0 22px rgba(35,255,208,.35)}';
    document.head.appendChild(style);
  }

  function polishLobbyPanel() {
    const audio = $('#gateAudio');
    if (!audio) return;
    const panel = audio.closest('.gate-game-panel');
    if (!panel) return;
    const heading = panel.querySelector('h3');
    const copy = panel.querySelector('p:not(.tagline):not(.gate-player-meta):not(.gate-game-status)');
    if (heading) heading.textContent = 'Lobby Music';
    if (copy) copy.textContent = 'Play tracks in order. Hidden Track 06 appears only after ON finishes.';
  }

  function renderLobbyButtons() {
    const actions = $('#gatePlayBtn')?.closest('.gate-mini-actions');
    if (!actions) return;
    const trackButtonMarkup = visibleTrackIds.map((trackId, index) => `<button class="gate-track-btn" type="button" data-gate-track="${trackId}">${String(index + 1).padStart(2, '0')} ${lobbyTracks[trackId].title}</button>`).join('');
    actions.innerHTML = `<button class="gate-game-btn" id="gatePlayBtn" type="button">Play</button><button class="gate-track-btn" id="gatePauseBtn" type="button">Pause</button>${trackButtonMarkup}<button class="gate-track-btn" id="neonLightsBtn" type="button" data-gate-track="neonLights">NEON LIGHTS</button><a class="gate-game-btn" id="lobbyLevelOneUnlock" href="${LEVEL_ONE_DESTINATION}" hidden>Enter Level 1</a>`;
    trackButtons = $$('.gate-track-btn[data-gate-track]', actions);
  }

  function renderNeonCasino() {
    const arcade = $('.gate-arcade-card');
    if (!arcade || arcade.dataset.neonCasinoReady === 'true') return;
    arcade.dataset.neonCasinoReady = 'true';
    const headTitle = arcade.querySelector('.gate-arcade-head h2');
    const headCopy = arcade.querySelector('.gate-arcade-head p:not(.tagline)');
    if (headTitle) headTitle.textContent = 'Lobby Casino Floor';
    if (headCopy) headCopy.textContent = 'Neon Light Slots, Blackjack Table, Multiplayer Tables, and Gate Radio stay locked inside the lobby.';
    const grid = arcade.querySelector('.gate-game-grid');
    if (!grid) return;
    const musicPanel = $('#gateAudio')?.closest('.gate-game-panel');
    const musicMarkup = musicPanel ? musicPanel.outerHTML : '';
    grid.innerHTML = `<article class="gate-game-panel neon-slots-panel"><p class="tagline">POINTS SLOT</p><h3>Neon Light Slots</h3><p>Spin neon reels for Cool Points. Neon Lights powers the lobby slot signal.</p><div class="gate-reels" aria-label="Neon Light slot reels"><div class="gate-reel" id="neonReel1">💚</div><div class="gate-reel" id="neonReel2">💡</div><div class="gate-reel" id="neonReel3">❇️</div></div><p class="gate-game-status" id="neonSlotStatus">Neon slots ready. Spin for points.</p><div class="gate-mini-actions"><button class="gate-game-btn" id="neonSpinBtn" type="button">Spin Neon Slots</button><button class="gate-track-btn" id="neonSoundBtn" type="button">Play Neon Lights</button></div></article><article class="gate-game-panel blackjack-panel"><p class="tagline">TABLE GAME</p><h3>Blackjack Table</h3><p>Quick lobby blackjack. Hit 21 for a Cool Points bump.</p><div class="gate-card-row"><button class="gate-card" type="button" id="blackjackHit">Hit</button><button class="gate-card" type="button" id="blackjackStand">Stand</button><button class="gate-card" type="button" id="blackjackNew">New</button></div><p class="gate-game-status" id="blackjackStatus">Dealer waiting. Start a new hand.</p></article><article class="gate-game-panel multiplayer-panel"><p class="tagline">FRIEND TABLES</p><h3>Multiplayer Tables</h3><p>Create a table, copy the room code, and bring friends into the casino floor.</p><div class="gate-player-screen"><span class="gate-player-title" id="roomCodeDisplay">NO TABLE</span><p class="gate-player-meta">Invite code appears here.</p></div><div class="gate-mini-actions"><button class="gate-game-btn" id="createTableBtn" type="button">Create Table</button><a class="gate-track-btn" href="games.html">Open Casino Floor</a></div></article>${musicMarkup}`;
  }

  function currentTrack() { return lobbyTracks[activeTrackId] || lobbyTracks.withMe; }
  function highlightActiveButton() { trackButtons.forEach((button) => button.classList.toggle('is-active', button.dataset.gateTrack === activeTrackId)); }
  function loadTrack(trackId, sourceAttempt = 0) { const audio = $('#gateAudio'); const title = $('#gatePlayerTitle'); const meta = $('#gatePlayerMeta'); const track = lobbyTracks[trackId] || lobbyTracks.withMe; activeTrackId = trackId; activeSourceIndex = sourceAttempt; if (title) title.textContent = track.title; if (meta) meta.textContent = track.meta; highlightActiveButton(); const source = (track.sources || [])[sourceAttempt]; if (!source) { setPlayerStatus(`MP3 not found for ${track.title}.`); return false; } if (audio) { audio.src = source; audio.load(); } setPlayerStatus(`Loaded ${track.title}. Tap Play.`); return true; }
  async function playActiveTrack() { const audio = $('#gateAudio'); if (!audio) return; playRequested = true; if (!audio.src) loadTrack(activeTrackId, activeSourceIndex); try { await audio.play(); setPlayerStatus(`${currentTrack().title} playing.`); } catch (error) { setPlayerStatus('Browser blocked autoplay. Tap Play again.'); } }
  function pauseTrack() { const audio = $('#gateAudio'); if (audio) audio.pause(); setPlayerStatus('Lobby Music paused.'); }
  function selectTrack(trackId) { hiddenTrackTriggered = false; loadTrack(trackId, 0); }

  function revealAmsWestCode() { if (revealedCode) return; revealedCode = true; const status = $('#gatePlayerStatus'); const reveal = document.createElement('div'); reveal.className = 'hw-code-reveal'; reveal.innerHTML = '<span>CODE REVEALED</span><strong>AMSWEST</strong><small>Enter this at the body scan.</small>'; if (status && status.parentNode) status.parentNode.insertBefore(reveal, status.nextSibling); setGateStatus('CODE REVEALED', 'AMSWEST', 'Hidden Track 06 revealed the body scan code. Enter AMSWEST at the scanner.'); }
  function grantLevelOneFromHiddenTrack() { const grantedAt = Date.now(); const nonce = Math.random().toString(36).slice(2); safeSessionSet('hyphsworld_vault_access', 'granted'); safeSessionSet('hyphsworld_vault_access_time', String(grantedAt)); safeSessionSet(LEVEL_ONE_TRANSPORT_READY_KEY, JSON.stringify({ level: 'level-one', route: LEVEL_ONE_DESTINATION, href: LEVEL_ONE_DESTINATION, grantedAt, nonce, source: 'lobby-hidden-track-bounce-out' })); safeSessionSet(LEVEL_ONE_TRANSPORT_V6_KEY, JSON.stringify({ level: 'level-one', route: 'quarantine-mixtape', href: LEVEL_ONE_DESTINATION, grantedAt, nonce, source: 'lobby-hidden-track-bounce-out' })); safeSet(LOBBY_UNLOCK_KEY, 'true'); safeSet('vault_level_1_unlocked', 'true'); revealAmsWestCode(); setPlayerStatus('BOUNCE OUT finished. CODE REVEALED: AMSWEST.'); const unlockLink = $('#lobbyLevelOneUnlock'); if (unlockLink) unlockLink.hidden = false; }
  async function playHiddenTrack() { hiddenTrackTriggered = true; loadTrack(hiddenTrackId, 0); await playActiveTrack(); }
  function handleTrackEnded() { if (activeTrackId === 'on' && !hiddenTrackTriggered) { setPlayerStatus('Track 05 complete. Hidden transition loading...'); window.setTimeout(() => playHiddenTrack(), 900); return; } if (activeTrackId === hiddenTrackId) { grantLevelOneFromHiddenTrack(); return; } const currentVisibleIndex = visibleTrackIds.indexOf(activeTrackId); const nextTrackId = visibleTrackIds[currentVisibleIndex + 1]; if (nextTrackId) { selectTrack(nextTrackId); if (playRequested) playActiveTrack(); } else setPlayerStatus('Lobby Music run complete. Track 05 can trigger the hidden route when it plays through.'); }

  function initAudio() { const audio = $('#gateAudio'); const progress = $('#gatePlayerProgress'); if (!audio) return; audio.addEventListener('timeupdate', () => { if (audio.duration && progress) progress.value = String((audio.currentTime / audio.duration) * 100); }); audio.addEventListener('ended', handleTrackEnded); audio.addEventListener('error', () => { const track = currentTrack(); const nextSource = activeSourceIndex + 1; if (nextSource < (track.sources || []).length) { loadTrack(activeTrackId, nextSource); if (playRequested) playActiveTrack(); return; } setPlayerStatus(`MP3 not found for ${track.title}.`); }); if (progress) progress.addEventListener('input', () => { if (audio.duration) audio.currentTime = (Number(progress.value) / 100) * audio.duration; }); }
  function bindLobbyPlayer() { const playBtn = $('#gatePlayBtn'); const pauseBtn = $('#gatePauseBtn'); const neonSound = $('#neonSoundBtn'); if (playBtn) playBtn.addEventListener('click', playActiveTrack); if (pauseBtn) pauseBtn.addEventListener('click', pauseTrack); if (neonSound) neonSound.addEventListener('click', () => { selectTrack('neonLights'); playActiveTrack(); addPoints(2, 'neon_lights_play'); }); trackButtons.forEach((button) => button.addEventListener('click', () => selectTrack(button.dataset.gateTrack))); }
  function bindCasino() { const spin = $('#neonSpinBtn'); if (spin) spin.addEventListener('click', () => { const icons = ['💚','💡','❇️','💎','🎰','🟢']; ['neonReel1','neonReel2','neonReel3'].forEach((id) => { const el = $('#' + id); if (el) el.textContent = icons[Math.floor(Math.random()*icons.length)]; }); addPoints(5, 'neon_slots_spin'); setPlayerStatus('Neon slot spin counted for Cool Points.'); const slotStatus = $('#neonSlotStatus'); if (slotStatus) slotStatus.textContent = '+5 Cool Points. Neon light spin logged.'; }); const hit = $('#blackjackHit'); const stand = $('#blackjackStand'); const fresh = $('#blackjackNew'); const bjStatus = $('#blackjackStatus'); if (fresh) fresh.addEventListener('click', () => { if (bjStatus) bjStatus.textContent = 'New hand live. Hit or Stand.'; addPoints(1, 'blackjack_new_hand'); }); if (hit) hit.addEventListener('click', () => { if (bjStatus) bjStatus.textContent = 'Hit card pulled. +2 Cool Points.'; addPoints(2, 'blackjack_hit'); }); if (stand) stand.addEventListener('click', () => { if (bjStatus) bjStatus.textContent = 'Standing. Dealer checks the table. +3 Cool Points.'; addPoints(3, 'blackjack_stand'); }); const create = $('#createTableBtn'); if (create) create.addEventListener('click', () => { const code = 'AMS-' + Math.random().toString(36).slice(2,6).toUpperCase(); const display = $('#roomCodeDisplay'); if (display) display.textContent = code; addPoints(4, 'multiplayer_table_created'); }); }

  document.addEventListener('DOMContentLoaded', () => { injectNoBlankFix(); renderNeonCasino(); polishLobbyPanel(); renderLobbyButtons(); loadTrack(activeTrackId, 0); initAudio(); bindLobbyPlayer(); bindCasino(); window.HYPHSWORLD_GATE_MUSIC_ONLY = true; });
})();
