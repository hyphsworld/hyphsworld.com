const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const dashboard = read('creator-dashboard.js');
const dashboardPage = read('creator-dashboard.html');

const checks = [
  ['official MY CREATIONS heading', dashboardPage.includes('>MY CREATIONS<')],
  ['creators cannot delete creations in dashboard', !dashboard.includes('deleteCreation(') && !dashboard.includes('Delete Creation')],
  ['no creator-triggered storage deletion', !dashboard.includes('.remove([row.storage_path])')],
  ['upload rollback stays protected', dashboard.includes('.remove([path])') && dashboard.includes('if (metadata.error)')],
  ['review workflow remains available', dashboard.includes('setCreationReviewState') && dashboard.includes('Send for Review')],
  ['no legacy public action language', !/>Delete Upload<|>Delete Post<|>Delete Reel</.test(dashboardPage + dashboard)]
];

let failed = 0;
checks.forEach(([name, ok]) => {
  console.log((ok ? '✓' : '✗') + ' ' + name);
  if (!ok) failed += 1;
});

if (failed) {
  console.error('\nCreator no-deletion diagnostic failed: ' + failed + ' check(s).');
  process.exit(1);
}

console.log('\nCreator no-deletion diagnostic passed.');
