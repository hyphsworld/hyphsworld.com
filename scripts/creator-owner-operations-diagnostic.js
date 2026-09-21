const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260921093000_repair_creator_owner_operations.sql'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'creator-admin.js'), 'utf8');
const account = fs.readFileSync(path.join(root, 'account.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log('PASS:', message);
}

const verificationUpdate = migration.match(/update public\.creator_verification_requests([\s\S]*?)where id = p_request_id;/);
assert(verificationUpdate && !/updated_at\s*=/.test(verificationUpdate[1]), 'Verification decisions never write the missing updated_at column');
assert(/reviewed_at\s*=\s*now\(\)/.test(migration), 'Verification decisions record reviewed_at');
assert(/p_decision\s*=\s*'approved'[\s\S]*else\s+'declined'/.test(migration), 'UI rejection maps to the allowed declined database status');
assert(/'promotion'/.test(migration), 'Promotion is an allowed creator entitlement source');
assert(/private\.is_creator_admin\(\)/.test(migration), 'Verification decisions retain server-side owner authorization');
assert(/revoke all on function[\s\S]*public, anon, authenticated/.test(migration), 'Verification RPC privileges are reset explicitly');
assert(/grant execute on function[\s\S]*authenticated, service_role/.test(migration), 'Only signed-in and service roles receive verification execution');
assert(admin.includes("['approved', 'rejected']"), 'Owner UI sends supported approve and reject decisions');
assert(account.includes("metadata.creator_admin === true"), 'Account owner panel uses server-controlled app metadata');

console.log('Creator owner operations diagnostic passed.');
