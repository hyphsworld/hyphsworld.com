const fs = require('fs');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(ok, message) { if (!ok) throw new Error(message); }

const bootstrap = read('cool-points.js');
const client = read('engagement-points.js');
const migration = read('supabase/migrations/20260904170000_unified_engagement_points.sql');

assert(bootstrap.includes("load('engagement-points.js'"), 'global bootstrap must load engagement rewards');
assert(client.includes("sb.rpc('award_engagement_action'"), 'client must use the authoritative RPC');
assert(!client.includes('p_amount'), 'client must not choose engagement reward amounts');
assert(migration.includes('pg_advisory_xact_lock'), 'RPC must serialize concurrent awards');
assert(migration.includes("revoke all on function public.award_engagement_action(text, text) from public, anon"), 'RPC must block public and anon execution');
assert(migration.includes("grant execute on function public.award_engagement_action(text, text) to authenticated"), 'RPC must explicitly grant authenticated execution');
assert(migration.includes("'page_view'"), 'catalog must include page views');
assert(migration.includes("'music_start'"), 'catalog must include music engagement');
assert(migration.includes("'game_open'"), 'catalog must include games');
assert(migration.includes("'profile_update'"), 'catalog must include profile activity');

console.log('Engagement points diagnostic passed: server catalog, anti-spam controls, and global client wiring are present.');

