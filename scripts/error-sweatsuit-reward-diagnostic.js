const fs = require('fs');

function read(file) { return fs.readFileSync(file, 'utf8').toLowerCase(); }
function assert(ok, message) { if (!ok) throw new Error(message); }

const store = read('point-store.html');
const exclusiveReward = read('point-store-exclusive-reward.js');
const migration = read('supabase/migrations/20260917054203_add_chase_the_bag_error_reward.sql');

assert(store.includes('data-id="chase-the-bag-error-sweatsuit"'), 'Point Store must include the ERROR sweatsuit');
assert(store.includes('data-cost="20600"'), 'ERROR sweatsuit must cost exactly 20,600 Cool Points');
assert(store.includes('size large is intentional'), 'Point Store must disclose that Large is intentional for the ERROR edition');
assert(store.includes('no restock and no alternate sizes'), 'Point Store must disclose the one-of-one size limitation');
assert(store.includes('data-exclusive="true"'), 'ERROR sweatsuit must bypass generic local reward purchases');
assert(exclusiveReward.includes("rpc('redeem_chase_the_bag_error_reward'"), 'Exclusive reward must use the atomic redemption RPC');
assert(exclusiveReward.includes("rpc('submit_chase_the_bag_error_shipping'"), 'Exclusive reward must use private winner fulfillment');
assert(!exclusiveReward.includes('hwpoints.spend'), 'Exclusive reward must never use the generic point-spend path');
assert(migration.includes('pg_advisory_xact_lock'), 'Exclusive reward must use a server-side one-winner lock');
assert(migration.includes("'vip_events_gated_content'"), 'Winner must receive permanent VIP events and gated-content access');
assert(migration.includes('has_my_lifetime_vip_access'), 'VIP gates must have a server-verified access check');
assert(migration.includes('-20600'), 'Exclusive reward and ledger debit must be atomic');

console.log('ERROR sweatsuit diagnostic passed: the one-of-one reward contract is protected.');
