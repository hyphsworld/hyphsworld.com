const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260925100000_creator_creation_library.sql'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'creator-dashboard.js'), 'utf8');
const dashboardHtml = fs.readFileSync(path.join(root, 'creator-dashboard.html'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'creator-admin.js'), 'utf8');
const adminHtml = fs.readFileSync(path.join(root, 'creator-admin.html'), 'utf8');

const checks = [
  ['library UI', dashboardHtml.includes('Creation Library') && dashboardHtml.includes('creationFilter')],
  ['five CREATE lanes persisted', migration.includes("creation_kind in ('music', 'video', 'artwork', 'merch', 'world')")],
  ['creator update ownership policy', migration.includes('owners update own creator creations') && migration.includes("status in ('private', 'ready_for_review')")],
  ['no creator self-approval', !migration.includes("with check (status in ('private', 'ready_for_review', 'approved'")],
  ['admin decision is server controlled', migration.includes('creator_admin_decide_creation') && migration.includes('private.is_creator_admin()')],
  ['private admin preview policy', migration.includes('creator admins preview private world media')],
  ['dashboard rename and review', dashboard.includes('renameCreation') && dashboard.includes('setCreationReviewState')],
  ['owner queue', adminHtml.includes('creationReviewQueue') && admin.includes('loadCreationReviews')],
  ['signed private preview', admin.includes("createSignedUrl(path, 600)")],
  ['legacy user-facing terms removed', !/Name this upload|No private uploads yet|>Upload</.test(dashboardHtml)]
];

let failed = 0;
checks.forEach(([name, ok]) => {
  console.log((ok ? '✓' : '✗') + ' ' + name);
  if (!ok) failed += 1;
});

if (failed) {
  console.error('\nCreation Library diagnostic failed: ' + failed + ' check(s).');
  process.exit(1);
}

console.log('\nCreation Library diagnostic passed.');
