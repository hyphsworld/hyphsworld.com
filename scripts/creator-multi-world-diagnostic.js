const fs=require('fs');
const dashboard=fs.readFileSync('creator-dashboard.js','utf8');
const migration=fs.readFileSync('20260924150000_creator_multi_world_dashboard.sql','utf8');
function check(v,m){if(!v)throw new Error(m);console.log('PASS:',m)}
check(dashboard.includes("eq('owner_user_id', user.userId).order('creator_number'"),'loads every owned world');
check(!dashboard.includes('limit(1).maybeSingle'),'removes single-world assumption');
check(dashboard.includes("p_creator_id: creator.id"),'scopes metrics to selected world');
check(migration.includes('revoke update on table public.creators from authenticated'),'revokes broad profile updates');
check(migration.includes('display_name, headline, bio, location, categories, image_url, profile_url'),'grants only editable profile columns');
check(migration.includes('owner_user_id = auth.uid()'),'verifies metric ownership server-side');
console.log('Creator multi-world diagnostic passed.');
