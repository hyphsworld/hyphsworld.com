(function () {
  'use strict';
  const card = document.querySelector('[data-id="all-the-squadds-red-set"]');
  if (!card) return;
  const button = card.querySelector('.squadds-redeem');
  const status = card.querySelector('.squadds-status');
  let claim = null;
  let client = null;
  let authenticated = false;
  function say(message, error) {
    status.textContent = message;
    status.style.color = error ? '#ff98b1' : '#bcff25';
  }
  function errMessage(error) {
    return String(error && error.message || error || 'Reward service unavailable.');
  }
  async function getClient() {
    if (client) return client;
    if (!window.HWAuth || typeof window.HWAuth.getClient !== 'function')
      throw new Error('Account service is loading. Refresh and try again.');
    client = await window.HWAuth.getClient();
    if (!client) throw new Error('Account service unavailable.');
    return client;
  }
  function draw() {
    if (!claim) return;
    if (claim.owned) {
      button.disabled = Boolean(claim.shipping_submitted);
      button.textContent = claim.shipping_submitted ? 'CLAIM CONFIRMED' : 'SUBMIT SHIPPING INFO';
      say(claim.shipping_submitted ? 'Shipping details received. Fulfillment pending.' : 'Claim secured. Please submit your shipping information.');
    } else if (!claim.available) {
      button.disabled = true;
      button.textContent = 'NOT AVAILABLE YET';
      say('While supplies last • Redemption opens when inventory is confirmed.');
    } else if (!authenticated) {
      button.disabled = false;
      button.textContent = 'LOGIN TO REDEEM';
      say('Limited stock • 10,000 Cool Points per complete set.');
    } else {
      button.disabled = false;
      button.textContent = 'REDEEM SET — 10,000 POINTS';
      say('Available while supplies last • ' + claim.remaining + ' remaining.');
    }
  }
  async function refresh() {
    button.disabled = true;
    say('Checking inventory…');
    try {
      const sb = await getClient();
      const session = await sb.auth.getSession();
      authenticated = Boolean(session.data && session.data.session && session.data.session.user);
      const result = await sb.rpc('get_squadds_red_set_status');
      if (result.error) throw result.error;
      claim = result.data;
      draw();
    } catch (error) {
      button.disabled = true;
      button.textContent = 'TEMPORARILY UNAVAILABLE';
      say(errMessage(error), true);
    }
  }
  function shippingForm() {
    const overlay = document.createElement('div');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Reward shipping information');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:100001;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.88)';
    overlay.innerHTML = `<form style="width:min(580px,100%);max-height:90vh;overflow:auto;background:#101016;border:2px solid #bcff25;border-radius:18px;padding:20px;color:#fff">
      <h2>ALL THE SQUADDS — Shipping</h2>
      <p>Your redeemed red tee and bucket hat set. Provide shipping and preferred shirt size for fulfillment.</p>
      <div class="squadds-fields" style="display:grid;gap:10px">
        <label>Preferred shirt size <input required name="size" maxlength="20" placeholder="e.g., M, L, XL"></label>
        <input required name="name" maxlength="100" autocomplete="name" placeholder="Full name">
        <input required name="email" type="email" maxlength="160" autocomplete="email" placeholder="Email">
        <input required name="address1" maxlength="160" autocomplete="shipping address-line1" placeholder="Address line 1">
        <input name="address2" maxlength="160" autocomplete="shipping address-line2" placeholder="Address line 2 (optional)">
        <input required name="city" maxlength="100" autocomplete="shipping address-level2" placeholder="City">
        <input required name="region" maxlength="100" autocomplete="shipping address-level1" placeholder="State / region">
        <input required name="postal" maxlength="20" autocomplete="shipping postal-code" placeholder="Postal code">
        <input required name="country" maxlength="100" value="United States" placeholder="Country">
      </div>
      <p class="shipping-result" role="status" style="color:#bcff25"></p>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="submit" class="btn btn-gold">SAVE SHIPPING DETAILS</button><button type="button" class="btn btn-outline squadds-close">CANCEL</button></div>
    </form>`;
    overlay.querySelectorAll('input').forEach(el => el.style.cssText = 'width:100%;box-sizing:border-box;min-height:44px;padding:10px;border-radius:8px;border:1px solid #777;background:#222;color:white;margin-top:5px;');
    overlay.querySelector('.squadds-close').addEventListener('click', () => overlay.remove());
    overlay.querySelector('form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const submit = overlay.querySelector('[type="submit"]');
      const message = overlay.querySelector('.shipping-result');
      submit.disabled = true;
      try {
        const data = new FormData(event.target);
        const sb = await getClient();
        const result = await sb.rpc('submit_squadds_red_set_shipping', {
          p_name: data.get('name'), p_email: data.get('email'),
          p_address_line1: data.get('address1'), p_address_line2: data.get('address2') || '',
          p_city: data.get('city'), p_region: data.get('region'),
          p_postal_code: data.get('postal'), p_country: data.get('country'),
          p_shirt_size: data.get('size')
        });
        if (result.error) throw result.error;
        message.textContent = 'Shipping details saved.';
        await refresh();
        setTimeout(() => overlay.remove(), 1100);
      } catch (error) {
        message.textContent = errMessage(error);
        submit.disabled = false;
      }
    });
    document.body.appendChild(overlay);
  }
  button.addEventListener('click', async () => {
    if (!claim) return;
    if (!authenticated) {
      location.href = 'auth.html?next=' + encodeURIComponent('point-store.html');
      return;
    }
    if (claim.owned) {
      if (!claim.shipping_submitted) shippingForm();
      return;
    }
    if (!claim.available) return;
    if (!window.confirm('Redeem ALL THE SQUADDS red tee + bucket hat set for 10,000 Cool Points? This is a physical reward.')) return;
    button.disabled = true;
    say('Verifying inventory and points…');
    try {
      const sb = await getClient();
      const result = await sb.rpc('redeem_squadds_red_set');
      if (result.error) throw result.error;
      if (window.HWPoints && window.HWPoints.refresh) await window.HWPoints.refresh();
      await refresh();
      if (window.gtag) window.gtag('event', 'exclusive_reward_claimed', {reward:'all_the_squadds_red_set', cost:10000});
      shippingForm();
    } catch (error) {
      say(errMessage(error), true);
      await refresh();
    }
  });
  document.addEventListener('hyph:auth-state-changed', refresh);
  refresh();
})();