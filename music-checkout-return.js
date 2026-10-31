(function () {
  'use strict';
  function readSessionId(search) {
    const value = new URLSearchParams(search).get('session_id');
    return value && value.length <= 255 && /^cs_live_[A-Za-z0-9_]+$/.test(value) ? value : null;
  }

  async function waitForPurchase(client, buyerId, sessionId) {
    if (!buyerId || typeof sessionId !== 'string' || !sessionId || readSessionId('?session_id=' + encodeURIComponent(sessionId)) !== sessionId) {
      return 'invalid';
    }
    for (let attempt = 0; attempt < 15; attempt++) {
      const { data: order, error } = await client.from('music_orders')
        .select('id,release_id,status').eq('buyer_id', buyerId)
        .eq('stripe_session_id', sessionId).maybeSingle();
      if (error) throw Error('Payment confirmation is temporarily unavailable.');
      if (order && ['refunded', 'disputed', 'failed', 'expired', 'cancelled'].includes(order.status)) {
        return 'inactive';
      }
      if (order?.status === 'paid') {
        const { data: license, error: licenseError } = await client.from('music_licenses')
          .select('id').eq('buyer_id', buyerId).eq('order_id', order.id)
          .eq('release_id', order.release_id).eq('status', 'active').maybeSingle();
        if (licenseError) throw Error('Download access confirmation is temporarily unavailable.');
        if (license) return 'confirmed';
      }
      if (attempt < 14) await new Promise(resolve => window.setTimeout(resolve, 2000));
    }
    return 'pending';
  }

  window.HWMusicCheckoutReturn = { readSessionId, waitForPurchase };
})();
