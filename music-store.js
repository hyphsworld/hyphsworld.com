(function () {
  'use strict';
  const PROJECT_URL = 'https://yuhxtdkhsltaqiagrtys.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_oYdN-75W3b7k3m1zLukI-A_BKWVDD5e';
  // Public checkout launch gate.
  const PUBLIC_CHECKOUT_APPROVED = true;
  // Separate approval gate for LOST TIME. The server also requires published releases.
  const LOST_TIME_PUBLIC_CHECKOUT_APPROVED = false;
  const releases = [
    { id: '78ada5a7-9c36-44d2-8e3e-6f80616a5042', button: 'buy-money-counter', amount: 'price-money-counter' },
    { id: '634c67a4-da23-422d-85e2-320b0471f831', button: 'buy-mula', amount: 'price-mula' },
    { id: '6731c662-93ef-4210-9324-d389cc94ddcc', button: 'buy-mando', amount: 'price-mando', lostTime: true },
    { id: '6daa0299-6560-49da-8613-f6b18d5afc1e', button: 'buy-sac-2-the-rich', amount: 'price-sac-2-the-rich', lostTime: true },
    { id: '513b8249-c83f-4672-99f8-c519e52107d0', button: 'buy-drip', amount: 'price-drip', lostTime: true },
    { id: '35b42527-977d-475b-8552-d50373d6fefc', button: 'buy-shine', amount: 'price-shine', lostTime: true }
  ];
  const message = document.getElementById('music-store-status');
  function tell(value) { if (message) message.textContent = value; }
  async function init() {
    if (!PUBLIC_CHECKOUT_APPROVED) { tell('Official releases are in prelaunch. Secure purchases open after final verification.'); return; }
    if (!window.supabase || !window.supabase.createClient) { tell('Store is being prepared. Purchases are not yet available.'); return; }
    const client = window.supabase.createClient(PROJECT_URL, PUBLISHABLE_KEY);
    const { data, error } = await client.from('music_releases')
      .select('id,status,price_cents,currency').in('id', releases.map(r => r.id));
    if (error) { tell('Purchases are temporarily unavailable.'); return; }
    let activeCount = 0;
    for (const candidate of releases) {
      const release = (data || []).find(x => x.id === candidate.id);
      const button = document.getElementById(candidate.button);
      const label = document.getElementById(candidate.amount);
      if (!button || !release || release.status !== 'published' || release.currency !== 'usd') continue;
      // Draft LOST TIME tracks stay disabled, even if DB status changes before founder approval.
      if (candidate.lostTime && !LOST_TIME_PUBLIC_CHECKOUT_APPROVED) continue;
      if (label) label.textContent = '$' + (release.price_cents / 100).toFixed(2);
      button.disabled = false;
      button.textContent = 'BUY DIGITAL DOWNLOAD';
      activeCount++;
      const showOwned = function () {
        button.disabled = false;
        button.textContent = 'OWNED ✓ — OPEN MY LIBRARY';
        button.dataset.owned = 'true';
      };
      button.addEventListener('click', async function () {
        if (button.dataset.owned === 'true') { window.location.assign('music-library.html'); return; }
        if (button.disabled) return;
        button.disabled = true;
        button.textContent = 'OPENING SECURE CHECKOUT…';
        try {
          const { data: sessionData } = await client.auth.getSession();
          if (!sessionData?.session) {
            window.location.assign('auth.html?next=music-store.html');
            return;
          }
          const response = await fetch(PROJECT_URL + '/functions/v1/music-live-checkout', {
            method: 'POST',
            headers: {
              apikey: PUBLISHABLE_KEY,
              authorization: 'Bearer ' + sessionData.session.access_token,
              'content-type': 'application/json'
            },
            body: JSON.stringify({ release_id: release.id })
          });
          const result = await response.json();
          if (response.status === 409 && result.error === 'already_owned') {
            showOwned();
            tell('You already own this release. Open My Music Library to play or download it again.');
            return;
          }
          if (!response.ok || !result.url || !/^https:\/\/checkout\.stripe\.com\//.test(result.url)) {
            throw Error(result.error || 'Checkout unavailable');
          }
          // Same-tab navigation prevents Safari and mobile popup blocking.
          window.location.assign(result.url);
        } catch (error) {
          tell('Checkout unavailable: ' + (error.message || 'Please try again later.'));
          button.disabled = false;
          button.textContent = 'BUY DIGITAL DOWNLOAD';
        }
      });
    }
    tell(activeCount ? 'Secure checkout available for published releases.' : 'The first two releases are being prepared. Sales are not open yet.');
  }
  init().catch(function () { tell('Store temporarily unavailable.'); });
})();
