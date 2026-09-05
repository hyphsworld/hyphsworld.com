const fs = require('fs');
function assert(ok, message) { if (!ok) throw new Error(message); }

const game = fs.readFileSync('games/ss-bowling/game.html', 'utf8');
const celebration = fs.readFileSync('games/ss-bowling/strike-celebration.js', 'utf8');

assert(game.includes('/games/ss-bowling/strike-celebration.js'), 'Super Strike game must load the strike celebration');
assert(celebration.includes("=== 'STRIKE!'"), 'Celebration must recognize the live STRIKE! message');
assert(celebration.includes('linear-gradient'), 'Strike text must use a bright multicolor treatment');
assert(celebration.includes('@keyframes hwStrikePop'), 'Strike text must include an entrance animation');
assert(celebration.includes('@keyframes hwStrikeGlow'), 'Strike text must include an animated glow');
assert(celebration.includes('prefers-reduced-motion'), 'Strike animation must respect reduced-motion settings');

console.log('Super Strike celebration diagnostic passed: STRIKE! uses bright animated text with reduced-motion support.');
