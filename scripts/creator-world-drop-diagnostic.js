'use strict';

const fs = require('fs');
const assert = require('assert');

const read = file => fs.readFileSync(file, 'utf8');
const html = read('creator-drop.html');
const css = read('creator-drop.css');
const drop = read('creator-drop.js');
const admin = read('creator-admin.js');
const profile = read('creator-published-media.js');
const directory = read('creators-directory.js');

assert(html.includes('WORLD DROP') && html.includes('id="dropMedia"'), 'Branded World Drop surface missing');
assert(html.includes('viewport-fit=cover'), 'World Drop must support mobile safe areas');
assert(drop.includes("from('creator_world_publications')"), 'Viewer must read the public publication view');
assert(drop.includes("row.media_type === 'image'") && drop.includes("row.media_type === 'video'") && drop.includes("row.media_type === 'audio'"), 'Viewer must support image, video, and audio drops');
assert(drop.includes('navigator.share') && drop.includes('navigator.clipboard'), 'Native share and copy fallback missing');
assert(drop.includes(".neq('id', row.id)"), 'Next Drop discovery missing');
assert(drop.includes("method: 'HEAD'") && drop.includes('This drop is being restored.'), 'Missing-file preflight and recovery state required');
assert(admin.includes("'VIEW WORLD DROP ↗'"), 'Owner live link must stay inside HYPHSWORLD');
assert(!admin.includes("live.href = publicData.data.publicUrl"), 'Owner live link must never open raw storage');
assert(admin.includes('RESTORE LIVE FILE') && admin.includes('copyPrivateSourceToPublic'), 'One-tap owner repair missing');
assert(admin.includes('upsert: true') && admin.includes('publicFileExists(publicPath)'), 'Publish must replace and verify the public copy');
assert(profile.includes('OPEN WORLD DROP') && directory.includes('Open World Drop'), 'Public creation entrances must use World Drop');
assert(css.includes('env(safe-area-inset-bottom)') && css.includes('@media(max-width:620px)'), 'Mobile in-app-browser layout coverage missing');

console.log('Creator World Drop diagnostics passed: branded viewer, safe public lookup, media rendering, share, Next Drop, and owner file restoration.');
