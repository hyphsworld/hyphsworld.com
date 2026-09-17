(function () {
  'use strict';

  var REWARD_ID = 'chase_the_bag_error_sweatsuit';
  var card = document.querySelector('[data-id="' + REWARD_ID + '"]');
  if (!card) return;

  var button = card.querySelector('.exclusive-redeem');
  var status = card.querySelector('.exclusive-status');
  var client = null;
  var claim = null;

  function setStatus(message, bad) {
    if (!status) return;
    status.textContent = message;
    status.style.color = bad ? '#ff9ab0' : '#7dff9b';
  }

  function errorMessage(error) {
    var text = String((error && error.message) || error || 'The reward service is unavailable.');
    if (/login|required|jwt|auth/i.test(text)) return 'Log in to your HYPHSWORLD ID before claiming.';
    return text.replace(/^.*?error:\s*/i, '');
  }

  async function getClient() {
    if (client) return client;
    if (!window.HWAuth || typeof window.HWAuth.getClient !== 'function') {
      throw new Error('Account service is still loading. Refresh and try again.');
    }
    client = await window.HWAuth.getClient();
    if (!client) throw new Error('Account service is unavailable.');
    return client;
  }

  async function signedIn() {
    var sb = await getClient();
    var result = await sb.auth.getSession();
    return Boolean(result.data && result.data.session && result.data.session.user);
  }

  function render() {
    if (!button) return;
    button.disabled = false;

    if (!claim) {
      button.textContent = 'LOGIN TO CLAIM';
      setStatus('One exclusive winner • Size Large • 20,600 Cool Points', false);
      return;
    }

    if (claim.owned) {
      if (claim.shipping_submitted) {
        button.textContent = 'WINNER VERIFIED';
        button.disabled = true;
        setStatus('Claim secured • Shipping details received • Lifetime VIP active', false);
      } else {
        button.textContent = 'SUBMIT SHIPPING DETAILS';
        setStatus('You won the ERROR outfit. Complete secure fulfillment.', false);
      }
      return;
    }

    if (!claim.available) {
      button.textContent = 'CLAIMED — 1 OF 1';
      button.disabled = true;
      setStatus('This exclusive reward has been won.', false);
      return;
    }

    button.textContent = 'CLAIM THE 1 OF 1';
    setStatus('Available now • First verified redemption wins', false);
  }

  async function refreshClaim() {
    try {
      if (!(await signedIn())) {
        claim = null;
        render();
        return;
      }
      var sb = await getClient();
      var response = await sb.rpc('get_my_chase_the_bag_error_claim');
      if (response.error) throw response.error;
      claim = response.data || null;
      render();
    } catch (error) {
      setStatus(errorMessage(error), true);
      if (button) {
        button.textContent = 'RETRY';
        button.disabled = false;
      }
    }
  }

  function openShippingForm() {
    var overlay = document.createElement('div');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Secure winner shipping form');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.82);backdrop-filter:blur(8px)';
    overlay.innerHTML = '<form style="width:min(620px,100%);max-height:92vh;overflow:auto;border:2px solid #ff2d55;border-radius:26px;padding:22px;background:#090909;color:#fff;box-shadow:0 28px 80px rgba(0,0,0,.7)">' +
      '<p style="margin:0;color:#ff5b78;font-weight:1000;text-transform:uppercase;letter-spacing:.08em">Verified Winner Fulfillment</p>' +
      '<h2 style="margin:8px 0">Black CHASE THE BAG ERROR Sweatsuit</h2>' +
      '<p style="color:#ccc">Size: <strong style="color:#ffe600">Large</strong> • Shipping details are stored privately for fulfillment.</p>' +
      '<div class="winner-shipping-grid">' +
      '<input name="name" required maxlength="100" autocomplete="name" placeholder="Full shipping name">' +
      '<input name="email" required maxlength="160" type="email" autocomplete="email" placeholder="Contact email">' +
      '<input name="address1" required maxlength="160" autocomplete="shipping street-address" placeholder="Address line 1" style="grid-column:1/-1">' +
      '<input name="address2" maxlength="160" placeholder="Address line 2 (optional)" style="grid-column:1/-1">' +
      '<input name="city" required maxlength="100" autocomplete="shipping address-level2" placeholder="City">' +
      '<input name="region" required maxlength="100" autocomplete="shipping address-level1" placeholder="State / region">' +
      '<input name="postal" required maxlength="20" autocomplete="shipping postal-code" placeholder="Postal code">' +
      '<input name="country" required maxlength="100" autocomplete="shipping country-name" value="United States" placeholder="Country">' +
      '</div><div class="shipping-message" role="status" aria-live="polite" style="min-height:24px;margin-top:10px;color:#ff9ab0;font-weight:900"></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px"><button class="btn btn-gold" type="submit">SAVE SHIPPING DETAILS</button><button class="btn btn-outline shipping-close" type="button">CLOSE</button></div></form>';

    var form = overlay.querySelector('form');
    var message = overlay.querySelector('.shipping-message');
    var fields = overlay.querySelectorAll('input');
    fields.forEach(function (field) {
      field.style.cssText = 'min-height:48px;border-radius:12px;border:1px solid rgba(255,255,255,.22);background:#151515;color:#fff;padding:0 12px;font:inherit';
    });

    overlay.querySelector('.shipping-close').addEventListener('click', function () { overlay.remove(); });
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      message.textContent = 'Saving secure fulfillment details…';
      try {
        var data = new FormData(form);
        var sb = await getClient();
        var response = await sb.rpc('submit_chase_the_bag_error_shipping', {
          p_name: data.get('name'),
          p_email: data.get('email'),
          p_address_line1: data.get('address1'),
          p_address_line2: data.get('address2') || '',
          p_city: data.get('city'),
          p_region: data.get('region'),
          p_postal_code: data.get('postal'),
          p_country: data.get('country') || 'United States'
        });
        if (response.error) throw response.error;
        message.style.color = '#7dff9b';
        message.textContent = 'Shipping details saved. AMS WEST will handle fulfillment.';
        await refreshClaim();
        setTimeout(function () { overlay.remove(); }, 1400);
      } catch (error) {
        message.textContent = errorMessage(error);
        submit.disabled = false;
      }
    });

    document.body.appendChild(overlay);
    var first = overlay.querySelector('input');
    if (first) first.focus();
  }

  async function redeem() {
    if (!(await signedIn())) {
      location.href = 'auth.html?next=' + encodeURIComponent('point-store.html');
      return;
    }

    if (claim && claim.owned) {
      if (!claim.shipping_submitted) openShippingForm();
      return;
    }

    if (!window.confirm('Claim the one-of-one Large ERROR outfit for 20,600 Cool Points? This physical reward is final.')) return;

    button.disabled = true;
    button.textContent = 'SECURING CLAIM…';
    setStatus('Server is verifying the first eligible winner.', false);
    try {
      var sb = await getClient();
      var response = await sb.rpc('redeem_chase_the_bag_error_reward');
      if (response.error) throw response.error;
      if (window.HWPoints && typeof window.HWPoints.refresh === 'function') await window.HWPoints.refresh();
      claim = {
        owned: true,
        available: false,
        shipping_submitted: false,
        claim_id: response.data && response.data.claim_id,
        size: 'Large'
      };
      render();
      if (window.gtag) window.gtag('event', 'exclusive_reward_claimed', { reward: REWARD_ID, cost: 20600 });
      openShippingForm();
    } catch (error) {
      setStatus(errorMessage(error), true);
      await refreshClaim();
    }
  }

  button.addEventListener('click', function () {
    redeem().catch(function (error) { setStatus(errorMessage(error), true); });
  });

  document.addEventListener('hyph:auth-state-changed', refreshClaim);
  refreshClaim();
})();
