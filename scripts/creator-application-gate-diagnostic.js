const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const dashboard = read('creator-dashboard.js');
const dashboardHtml = read('creator-dashboard.html');
const apply = read('creator-apply.js');
const applyHtml = read('creator-apply.html');
const migration = [
  read('supabase/migrations/20260925130000_creator_application_gate.sql'),
  read('supabase/migrations/20260926023500_close_creator_application_bypass.sql')
].join('\n');

const checks = [
  ['approved application required by RLS', migration.includes("application.status = 'approved'")],
  ['direct enrollment policy replaced', migration.includes('drop policy if exists "owners create draft creators"')],
  ['one self-created World per approval', migration.includes('not exists (') && migration.includes('existing.owner_user_id')],
  ['requested-info resubmission is scoped', migration.includes("status = 'needs_info'") && migration.includes("status = 'pending'")],
  ['reviewer fields stay protected', !/grant update \([^)]*review_notes/is.test(migration)],
  ['dashboard checks application before draft', dashboard.includes('latestApplication') && dashboard.includes("application.status !== 'approved'")],
  ['unapproved users are routed to apply', dashboardHtml.includes('href="creator-apply.html"') && dashboard.includes('CREATOR APPLICATION REQUIRED')],
  ['approved applicants receive build CTA', dashboard.includes('CREATOR WORLD UNLOCKED') && dashboardHtml.includes('Build My Creator World')],
  ['creation save location is clear', dashboardHtml.includes('MY CREATIONS') && dashboard.includes("Saved to MY CREATIONS") && dashboard.includes('creator_media_uploads')],
  ['creation media matches selected lane', dashboard.includes('validCreationFile')],
  ['needs-info application can update', apply.includes("existingApplication.status === 'needs_info'") && apply.includes('.update(fields)')],
  ['rejected applicant can apply again', apply.includes("state === 'rejected'") && apply.includes('Submit New Application')],
  ['approved application links to dashboard', applyHtml.includes('Build My Creator World')]
];

let failed = 0;
checks.forEach(([name, ok]) => {
  console.log((ok ? '✓' : '✗') + ' ' + name);
  if (!ok) failed += 1;
});

if (failed) {
  console.error('\nCreator application gate diagnostic failed: ' + failed + ' check(s).');
  process.exit(1);
}

console.log('\nCreator application gate diagnostic passed.');
