(function () {
  'use strict';
  const PROJECT_URL = 'https://yuhxtdkhsltaqiagrtys.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_oYdN-75W3b7k3m1zLukI-A_BKWVDD5e';
  const releases = [
    { id: '78ada5a7-9c36-44d2-8e3e-6f80616a5042', button: 'buy-money-counter', amount: 'price-money-counter' },
    { id: '634c67a4-da23-422d-85e2-320b0471f831', button: 'buy-mula', amount: 'price-mula' }
  ];
  const message = document.getElementById('music-store-status');
  function tell(value) { if (message) message.textContent = value; }
  async function init() {
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
      if (label) label.textContent = '$' + (release.price_cents / 100).toFixed(2);
      button.disabled = false;
      button.textContent = 'BUY DIGITAL DOWNLOAD';
      activeCount++;
      button.addEventListener('click', async function () {
        if (button.disabled) return;
        button.disabled = true;
        button.textContent = 'OPENING SECURE CHECKOUT…';
        try {
          const { data: sessionData } = await client.auth.getSession();
          if (!sessionData?.session) {
            window.location.assign('auth.html?next=music-store.html');
            return;
          }
          const response = await fetch(PROJECT_URL + '/functions/v1/music-create-checkout', {
            method: 'POST',
            headers: {
              apikey: PUBLISHABLE_KEY,
              authorization: 'Bearer ' + sessionData.session.access_token,
              'content-type': 'application/json'
            },
            body: JSON.stringify({ release_id: release.id })
          });
          const result = await response.json();
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
