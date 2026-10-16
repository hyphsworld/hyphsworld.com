const fs = require('fs');
const { JSDOM } = require('jsdom');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(ok, message) { if (!ok) throw new Error(message); }

const verifiedProfiles = ['creators-world.html', 'creator-rojas.html', 'creator-young-tez.html'];
const featuredProfiles = ['creator-francoismusic47.html', 'creator-b3llygang-h3rsch.html', 'creator-lil-g.html', 'creator-sixx-figgaz.html'];
const dashboardHtml = read('creator-dashboard.html');
const dashboardJs = read('creator-dashboard.js');
const accessCss = read('creator-access.css');
const directoryHtml = read('creators.html');
const directoryJs = read('creators-directory.js');
const accessHtml = read('creator-access.html');

verifiedProfiles.forEach((file) => {
  const html = read(file);
  assert(html.includes('class="world-seal"'), `${file} must display the HYPHSWORLD World Seal`);
  assert(html.includes('class="world-verified-label">VERIFIED</span>'), `${file} must explain the World Seal with a visible VERIFIED label`);
  assert(html.includes('HYPHSWORLD VERIFIED'), `${file} must label verified identity consistently`);
  assert(/creator-access\.css\?v=(world-seal-jewel-1|verified-name-row-3)/.test(html), `${file} must cache-bust the shared profile system`);
});

featuredProfiles.forEach((file) => {
  assert(!read(file).includes('class="world-seal"'), `${file} is featured-only and must not receive the verified World Seal`);
});
assert(accessCss.includes('Shared premium Creator World hero'), 'All creator profiles must use the shared artwork-and-card layout');
assert(accessCss.includes('hyphsworld-world-seal-gold-diamond-v1.svg'), 'World Seal must use the branded gold and diamond HW asset');
assert(accessCss.includes('@media(max-width:700px)'), 'Shared profile layout must include a focused mobile composition');
// Keep the approved fallback roster explicit, including Rayy Dubb Jr. Check each
// card's badge so a missing creator cannot be hidden by a duplicate elsewhere.
const verifiedDirectoryProfiles = [...verifiedProfiles, 'creator-rayy-dubb-jr.html'];
const directoryDom = new JSDOM(directoryHtml);
const directory = directoryDom.window.document;
const verifiedCards = [...directory.querySelectorAll('.creator-card.is-verified')];
assert(verifiedCards.length === verifiedDirectoryProfiles.length, 'Static directory must contain the approved verified creator roster');
verifiedDirectoryProfiles.forEach((profile) => {
  const card = verifiedCards.find((entry) => entry.querySelector(`a[href="${profile}"]`));
  assert(card, `${profile} must have a verified directory card`);
  assert(card.querySelectorAll('.directory-world-seal').length === 1, `${profile} must display exactly one directory World Seal`);
  const labels = card.querySelectorAll('.world-verified-label');
  assert(labels.length === 1 && labels[0].textContent.trim() === 'VERIFIED', `${profile} must explain its directory seal with one VERIFIED label`);
});
assert(directory.querySelectorAll('.directory-world-seal').length === verifiedDirectoryProfiles.length, 'Only approved verified directory cards may display World Seals');
assert(directory.querySelectorAll('.world-verified-label').length === verifiedDirectoryProfiles.length, 'Only approved verified directory cards may display verification labels');
directoryDom.window.close();
assert(directoryJs.includes("['professional', 'partner', 'organization']"), 'Dynamic directory seals must match the persisted verified hierarchy');
assert(directoryJs.includes('verificationBadge.append(seal, verifiedLabel)'), 'Dynamic verified creators must receive a labeled World Seal');
assert(accessHtml.includes('class="world-seal access-world-seal"'), 'Creator Access must preview the official World Seal instead of a generic check');
assert(directoryHtml.includes('creator-apply.html'), 'Directory must provide a real Creator World application path');
assert(accessHtml.includes('href="creator-apply.html"'), 'Creator Access must route recruitment to the real application');
assert((directoryHtml.match(/data-world-tab=/g) || []).length === 4, 'Public Creator World must expose four focused discovery tabs');
assert((dashboardHtml.match(/data-dashboard-tab=/g) || []).length === 6, 'Creator Dashboard must expose six focused command tabs');
assert(dashboardJs.includes("activateDashboardView('create', true)") && dashboardJs.includes("renderCreateReceipt(creations.find") && dashboardHtml.includes('id="createFlowSuccess"'), 'Successful CREATE must display its saved creation receipt');

console.log('Creator profile diagnostic passed: shared premium layout and server-driven World Seals are intact.');
