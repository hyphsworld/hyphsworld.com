const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const dashboard = read('creator-dashboard.js');
const dashboardPage = read('creator-dashboard.html');
const dashboardCss = read('creator-dashboard.css');
const privateStudio = read('supabase/migrations/20260924203000_creator_private_upload_studio.sql');
const publishMigration = read('supabase/migrations/20260925110000_creator_publish_to_world.sql');

const storageRemove = dashboard.indexOf(".from(uploadBucket).remove([row.storage_path])");
const metadataDelete = dashboard.indexOf(".from('creator_media_uploads')\n      .delete()");

const checks = [
  ['official MY CREATIONS heading', dashboardPage.includes('>MY CREATIONS<')],
  ['official creation delete label', dashboard.includes("remove.textContent = 'Delete Creation'")],
  ['mobile-safe two-tap confirmation', dashboard.includes("button.textContent = 'Tap Again to Delete'") && !dashboard.includes("window.confirm('Delete this private creation?')")],
  ['visible deleting state', dashboardCss.includes('DELETING CREATION…')],
  ['storage object removed through API', storageRemove > -1],
  ['metadata deletion verified', metadataDelete > storageRemove && dashboard.includes(".select('id')\n      .maybeSingle()")],
  ['creator-owned storage delete policy', privateStudio.includes('creator owners delete private world media')],
  ['creator-owned metadata delete policy', publishMigration.includes('owners delete own creator uploads')],
  ['approved and published creations protected', publishMigration.includes("status in ('private', 'ready_for_review', 'changes_requested')")],
  ['no legacy public action language', !/>Delete Upload<|>Delete Post<|>Delete Reel</.test(dashboardPage + dashboard)]
];

let failed = 0;
checks.forEach(([name, ok]) => {
  console.log((ok ? '✓' : '✗') + ' ' + name);
  if (!ok) failed += 1;
});

if (failed) {
  console.error('\nCreator deletion diagnostic failed: ' + failed + ' check(s).');
  process.exit(1);
}

console.log('\nCreator deletion diagnostic passed.');
