const fs = require('fs');
function read(file) { return fs.readFileSync(file, 'utf8').toLowerCase(); }
function assert(ok, message) { if (!ok) throw new Error(message); }
const directory = read('creators.html');
const access = read('creator-access.html');
const applyHtml = read('creator-apply.html');
const applyJs = read('creator-apply.js');
const admin = read('creator-admin.js');
const migration = read('supabase/migrations/20260921074638_creator_world_rollout_readiness.sql');
const ticker = read('homepage-command-center.js');
assert(directory.includes('creator-apply.html'), 'Directory must expose Creator World applications');
assert(access.includes('apply now'), 'Creator Access must replace the dead request button with a real application');
assert(applyHtml.includes('human review'), 'Application must disclose human review');
assert(applyJs.includes("from('creator_applications')"), 'Application form must persist to Supabase');
assert(admin.includes('creator_admin_decide_application'), 'Owner Control must review applications through the protected RPC');
assert(migration.includes('enable row level security'), 'Applications must have RLS enabled');
assert(migration.includes('applicant_id = (select auth.uid())'), 'Applications must be account-owned');
assert(migration.includes('private.is_creator_admin()'), 'Application decisions must require creator-admin authorization');
assert(migration.includes('revoke all on function public.creator_admin_decide_application'), 'Application review RPC must revoke default execution');
assert(ticker.includes('#005 b3llygang h3rsch') && ticker.includes('#006 nitti bo'), 'Homepage Creator World ticker must include the full six-creator roster');
console.log('Creator World rollout diagnostic passed: recruitment, review, RLS, roster, and launch paths are protected.');
