const fs = require('fs');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(ok, message) { if (!ok) throw new Error(message); }

const html = read('dominos.html');
const css = read('games.css');
const js = read('dominos.js');

assert(html.includes('domino-pov-room'), 'Domino room must include the POV scene');
assert(html.includes('pov-opponent-seat'), 'POV must place the opponent across the table');
assert(html.includes('assets/games/01-domino-room-pov-v1.webp'), 'POV must preload the cinematic room artwork');
assert(css.includes('url("assets/games/01-domino-room-pov-v1.webp")'), 'POV must render the cinematic room artwork');
assert(html.includes('pov-player-hand'), 'POV must place the player hand in the foreground');
assert(css.includes('perspective:1000px'), 'POV scene must use table depth');
assert(css.includes('.pov-player-hand .domino-tile.is-playable'), 'Playable tiles must be visually obvious');
assert(js.includes('function pipFace(value)'), 'Dominoes must render visual pips instead of text-only tiles');
assert(js.includes('opponentTileCount'), 'Opponent tile count must be visible');
assert(js.includes('canPlay(tile, boardTiles)'), 'Hand must distinguish playable tiles');
assert(js.includes('create_domino_room'), 'Supabase room creation must remain connected');
assert(js.includes('window.HWAuth.addPoints'), 'Cool Points win award must remain connected');

console.log('Domino POV diagnostic passed: perspective scene, readable tiles, multiplayer, and points hooks are intact.');
