const fs = require('fs');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(ok, message) { if (!ok) throw new Error(message); }

const verifiedProfiles = ['creators-world.html', 'creator-rojas.html', 'creator-young-tez.html'];
const featuredProfile = read('creator-francoismusic47.html');
const accessCss = read('creator-access.css');
const directoryHtml = read('creators.html');
const directoryJs = read('creators-directory.js');
const accessHtml = read('creator-access.html');

verifiedProfiles.forEach((file) => {
  const html = read(file);
  assert(html.includes('class="world-seal"'), `${file} must display the HYPHSWORLD World Seal`);
  assert(html.includes('HYPHSWORLD VERIFIED'), `${file} must label verified identity consistently`);
  assert(html.includes('creator-access.css?v=world-seal-1'), `${file} must cache-bust the shared profile system`);
});

assert(!featuredProfile.includes('class="world-seal"'), 'Featured-only creators must not receive the verified World Seal');
assert(accessCss.includes('Shared premium Creator World hero'), 'All creator profiles must use the shared artwork-and-card layout');
assert(accessCss.includes('conic-gradient(from 30deg'), 'World Seal must use the branded chromatic treatment');
assert(accessCss.includes('@media(max-width:700px)'), 'Shared profile layout must include a focused mobile composition');
assert((directoryHtml.match(/directory-world-seal/g) || []).length === 3, 'Static directory fallback must mark exactly three verified creators');
assert(directoryJs.includes("['professional', 'partner', 'organization']"), 'Dynamic directory seals must match the persisted verified hierarchy');
assert(directoryJs.includes('card.append(seal)'), 'Dynamic verified creators must receive the World Seal');
assert(accessHtml.includes('class="world-seal access-world-seal"'), 'Creator Access must preview the official World Seal instead of a generic check');

console.log('Creator profile diagnostic passed: shared premium layout and server-driven World Seals are intact.');
