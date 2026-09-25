const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const migration = read('supabase/migrations/20260925110000_creator_publish_to_world.sql');
const admin = read('creator-admin.js');
const dashboard = read('creator-dashboard.js');
const publicMedia = read('creator-published-media.js');
const directory = read('creators-directory.js');
const directoryPage = read('creators.html');
const pages = [
  'creators-world.html',
  'creator-rojas.html',
  'creator-francoismusic47.html',
  'creator-young-tez.html',
  'creator-b3llygang-h3rsch.html',
  'creator-nitti-bo.html',
  'creator-lil-g.html',
  'creator-sixx-figgaz.html'
];

const checks = [
  ['separate public bucket', migration.includes("'creator-world-public'") && migration.includes('public = true')],
  ['private originals preserved', admin.includes("from('creator-world-uploads').createSignedUrl") && admin.includes("from('creator-world-public').upload")],
  ['admin-only publish RPC', migration.includes('creator_admin_publish_creation') && migration.includes('private.is_creator_admin()')],
  ['anonymous publish blocked', migration.includes('revoke all on function public.creator_admin_publish_creation') && migration.includes('from public, anon, authenticated')],
  ['safe public view', migration.includes('creator_world_publications') && migration.includes('security_invoker = true')],
  ['published-only public RLS', migration.includes("status = 'published'") && migration.includes('public reads published creation metadata')],
  ['creator self-publish blocked', !migration.includes("with check (\n  owner_user_id = (select auth.uid())\n  and status in ('private', 'ready_for_review', 'published')")],
  ['published deletion blocked', migration.includes("status in ('private', 'ready_for_review', 'changes_requested')")],
  ['owner button', admin.includes('PUBLISH TO WORLD') && admin.includes('publishCreation')],
  ['public render supports media', publicMedia.includes("row.media_type === 'image'") && publicMedia.includes("row.media_type === 'video'") && publicMedia.includes("row.media_type === 'audio'")],
  ['Creator World always shows Creations section', publicMedia.includes("section.id = 'world-releases'") && publicMedia.includes('Nothing live yet.')],
  ['directory shows published creations', directoryPage.includes('publicCreationGrid') && directory.includes("from('creator_world_publications')") && directory.includes('Created by ')],
  ['dashboard shows live state', dashboard.includes('LIVE IN WORLD')],
  ['all Creator Worlds connected', pages.every(file => read(file).includes('creator-published-media.js'))],
  ['no legacy social language', !/\bPost\b|\bReel\b|>Upload</.test(publicMedia)]
];

let failed = 0;
checks.forEach(([name, ok]) => {
  console.log((ok ? '✓' : '✗') + ' ' + name);
  if (!ok) failed += 1;
});

if (failed) {
  console.error('\nPublish to World diagnostic failed: ' + failed + ' check(s).');
  process.exit(1);
}

console.log('\nPublish to World diagnostic passed.');
