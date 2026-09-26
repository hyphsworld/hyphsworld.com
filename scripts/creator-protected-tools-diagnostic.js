'use strict';

const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('creator-access.html', 'utf8');
const js = fs.readFileSync('creator-access.js', 'utf8');
const admin = fs.readFileSync('creator-admin.html', 'utf8');

const keys = [
  'expanded_media',
  'advanced_analytics',
  'priority_submissions',
  'promotion_boosts',
  'direct_booking',
  'verified_discovery'
];

keys.forEach((key) => {
  assert(html.includes('data-tool-key="' + key + '"'), 'Protected Tools card missing: ' + key);
  assert(admin.includes('<option value="' + key + '">'), 'Owner Operations option missing: ' + key);
});

assert.strictEqual((html.match(/data-tool-key=/g) || []).length, keys.length, 'Protected Tools must expose exactly six canonical cards');
assert(js.includes(".from('creator_entitlements')"), 'Protected Tools must read server entitlements');
assert(js.includes(".eq('owner_user_id', user.id)"), 'Protected Tools must bind the creator to the signed-in owner');
assert(js.includes("row.status !== 'active'"), 'Only active entitlements may unlock tools');
assert(js.includes('new Date(row.expires_at).getTime() > Date.now()'), 'Expired entitlements must remain locked');
assert(!js.includes('No access has been charged or granted'), 'Placeholder protected-tools handler is still present');
assert(!admin.includes('placeholder="audience_analytics"'), 'Free-text entitlement control is still present');

console.log('Protected Tools diagnostics passed: 6 canonical grants, account binding, expiry enforcement, and safe Owner Operations controls.');
