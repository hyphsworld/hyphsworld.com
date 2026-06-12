(function () {
  'use strict';

  const CHECKOUT_FUNCTION = 'create-checkout-session';
  const FALLBACK_PAYPAL_URL = 'https://paypal.me/1Hyphsworld';
  const DEFAULT_TIER = 'supporter5';

  function getSupabaseUrl() {
    return window.HW_SUPABASE_URL || window.HW_SUPABASE_CONFIG?.url || '';
  }

  function getAnonKey() {
    return window.HW_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || window.HW_SUPABASE_CONFIG?.anonKey || '';
  }

  function setButtonState(button, isLoading) {
    if (!button) return;
    if (isLoading) {
      button.dataset.originalText = button.textContent || '';
      button.textContent = 'Opening Checkout...';
      button.setAttribute('aria-busy', 'true');
      button.classList.add('is-loading');
    } else {
      if (button.dataset.originalText) button.textContent = button.dataset.originalText;
      button.removeAttribute('aria-busy');
      button.classList.remove('is-loading');
    }
  }

  function openPayPalFallback() {
    window.open(FALLBACK_PAYPAL_URL, '_blank', 'noopener,noreferrer');
  }

  async function createCheckoutSession(tier) {
    const supabaseUrl = getSupabaseUrl();
    const anonKey = getAnonKey();

    if (!supabaseUrl || !anonKey) {
      throw new Error('Checkout is missing Supabase site config.');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/${CHECKOUT_FUNCTION}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        tier: tier || DEFAULT_TIER,
        successPath: '/support-success.html',
        cancelPath: '/index.html#support',
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.url) {
      throw new Error(payload.message || payload.error || 'Checkout could not be opened.');
    }

    return payload.url;
  }

  async function handleCheckoutClick(event) {
    const button = event.currentTarget;
    const tier = button?.dataset?.stripeTier || DEFAULT_TIER;

    event.preventDefault();
    setButtonState(button, true);

    try {
      const checkoutUrl = await createCheckoutSession(tier);
      window.location.href = checkoutUrl;
    } catch (error) {
      console.warn('[HYPHSWORLD Stripe]', error);
      const usePayPal = window.confirm('Stripe checkout is warming up. Open PayPal support instead?');
      if (usePayPal) openPayPalFallback();
    } finally {
      setButtonState(button, false);
    }
  }

  function boot() {
    const buttons = document.querySelectorAll('[data-stripe-tier]');
    buttons.forEach((button) => {
      button.addEventListener('click', handleCheckoutClick);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
