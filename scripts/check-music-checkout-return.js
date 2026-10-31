const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../music-checkout-return.js'), 'utf8');

function setup(responses) {
  const queries = [];
  let waits = 0;
  const window = { setTimeout: callback => { waits++; callback(); } };
  vm.runInNewContext(source, { window, URLSearchParams });
  const client = { from(table) {
    const query = { table, filters: {} };queries.push(query);
    const builder = {
      select: () => builder,
      eq: (key, value) => { query.filters[key] = value;return builder; },
      maybeSingle: async () => responses.length ? responses.shift() : { data: null, error: null }
    };
    return builder;
  } };
  return { ...window.HWMusicCheckoutReturn, client, queries, waits: () => waits };
}
const row = data => ({ data, error: null });
const paid = { id: 'order-1', release_id: 'release-1', status: 'paid' };
const run = state => state.waitForPurchase(state.client, 'buyer-1', 'cs_live_owned');

(async () => {
  const delayed = setup([row({ ...paid, status: 'pending' }), row(paid), row(null), row(paid), row({ id: 'license-1' })]);
  assert.equal(await run(delayed), 'confirmed');
  assert.equal(delayed.waits(), 2);
  assert.ok(delayed.queries.every(query => query.filters.buyer_id === 'buyer-1'));
  for (const query of delayed.queries.filter(query => query.table === 'music_orders')) {
    assert.equal(query.filters.stripe_session_id, 'cs_live_owned');
  }
  for (const query of delayed.queries.filter(query => query.table === 'music_licenses')) {
    assert.equal(query.filters.order_id, 'order-1');
    assert.equal(query.filters.release_id, 'release-1');
    assert.equal(query.filters.status, 'active');
  }

  const pending = setup([]);
  assert.equal(await run(pending), 'pending');
  assert.equal(pending.queries.length, 15);
  assert.equal(pending.waits(), 14);
  const unlicensed = setup(Array.from({ length: 30 }, (_, index) => index % 2 ? row(null) : row(paid)));
  assert.equal(await run(unlicensed), 'pending', 'Paid status alone must not claim download readiness');
  const refunded = setup([row({ ...paid, status: 'refunded' })]);
  assert.equal(await run(refunded), 'inactive');
  assert.equal(refunded.waits(), 0);
  const offline = setup([{ data: null, error: { message: 'Offline' } }]);
  await assert.rejects(run(offline), /temporarily unavailable/);
  const invalid = setup([]);
  for (const id of ['cs_test_owned', 'https://example.com', '', null]) {
    assert.equal(await invalid.waitForPurchase(invalid.client, 'buyer-1', id), 'invalid');
  }
  assert.equal(invalid.queries.length, 0);
  assert.equal(invalid.readSessionId('?session_id=cs_live_owned'), 'cs_live_owned');
  assert.equal(invalid.readSessionId('?session_id=' + 'a'.repeat(256)), null);
  console.log('Music checkout return passed: delayed fulfillment, scoped reads, active license, retry limits, refund, errors and invalid returns.');
})().catch(error => { console.error(error);process.exitCode = 1; });
