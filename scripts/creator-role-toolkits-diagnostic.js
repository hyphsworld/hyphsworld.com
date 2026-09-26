'use strict';

const fs = require('fs');
const assert = require('assert');

const access = fs.readFileSync('creator-access.js', 'utf8');
const dashboard = fs.readFileSync('creator-dashboard.html', 'utf8');
const dashboardJs = fs.readFileSync('creator-dashboard.js', 'utf8');
const toolkit = fs.readFileSync('creator-role-toolkit.js', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260926180000_creator_role_toolkits.sql', 'utf8');

assert(access.includes('await window.HWAuth.getClient()'), 'Protected Tools must await the asynchronous auth client');
assert(dashboard.includes('id="roleToolkit"'), 'Creator Dashboard loadout surface missing');
assert(dashboard.includes('creator-role-toolkit.js?v=role-loadouts-1'), 'Creator Dashboard loadout script missing');
assert(dashboardJs.includes("new CustomEvent('hw:creator-profile-ready'"), 'Creator profile must publish its role payload');

['recording_artist','producer','skater','baseball_player','dancer','dj_host','developer','coach_mentor','designer','filmmaker','gamer','entrepreneur','original_creator'].forEach((role) => {
  assert(toolkit.includes("role_key: '" + role + "'"), 'Fallback loadout missing role: ' + role);
  assert(migration.includes("'" + role + "'"), 'Server catalog missing role: ' + role);
});

assert.strictEqual((migration.match(/create table if not exists public\.creator_role_/g) || []).length, 2, 'Expected two role catalog tables');
assert(migration.includes('alter table public.creator_role_catalog enable row level security'), 'Role catalog RLS missing');
assert(migration.includes('alter table public.creator_role_tools enable row level security'), 'Role tools RLS missing');
assert(migration.includes('revoke all on table public.creator_role_catalog from anon, authenticated'), 'Catalog least-privilege grant reset missing');
assert(migration.includes('grant select on table public.creator_role_tools to authenticated'), 'Authenticated role-tool read grant missing');
assert(!migration.includes('grant insert') && !migration.includes('grant update') && !migration.includes('grant delete'), 'Browser clients must not write role templates');
assert(toolkit.includes("creator-dashboard.html?create=music#create"), 'Music creation shortcut missing');
assert(toolkit.includes("creator-dashboard.html?create=video#create"), 'Video creation shortcut missing');
assert(toolkit.includes("creator-dashboard.html#inbox"), 'Opportunity inbox shortcut missing');

console.log('Creator Role Loadouts diagnostics passed: async auth repair, 13 reusable roles, functional dashboard routes, and read-only RLS catalog.');
