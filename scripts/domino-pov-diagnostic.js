const fs = require('fs');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(ok, message) { if (!ok) throw new Error(message); }

const html = read('dominos.html');
const css = read('games.css');
const js = read('dominos.js');

assert(html.includes('domino-pov-room'), 'Domino room must include the POV scene');
assert(html.includes('pov-opponent-seat'), 'POV must place the opponent across the table');
assert(css.includes('url("assets/games/01-domino-room-pov-v1.webp")'), 'POV must render the cinematic room artwork');
assert(html.includes('pov-player-hand'), 'POV must place the player hand in the foreground');
assert(html.includes('pov-player-hud'), 'POV must include an opponent status HUD');
assert(html.includes('pov-points-hud'), 'POV must show Cool Points inside the game scene');
assert(html.indexOf('pov-action-dock') < html.indexOf('</div>\n        </div>\n\n        <details'), 'POV action controls must stay inside the first-person scene');
assert(css.includes('perspective:1000px'), 'POV scene must use table depth');
assert(css.includes('.pov-player-hand .domino-tile.is-playable'), 'Playable tiles must be visually obvious');
assert(js.includes('function pipFace(value)'), 'Dominoes must render visual pips instead of text-only tiles');
assert(js.includes('opponentTileCount'), 'Opponent tile count must be visible');
assert(js.includes('canPlay(tile, boardTiles)'), 'Hand must distinguish playable tiles');
assert(js.includes('create_domino_room'), 'Supabase room creation must remain connected');
assert(js.includes('window.HWAuth.addPoints'), 'Cool Points win award must remain connected');
assert(js.includes('const START_HAND = 7'), 'Regular bones must deal seven tiles per player');
assert(js.includes('function chooseStarter'), 'Highest double or highest pip bone must choose the opener');
assert(js.includes('function passTurn'), 'Regular bones must support a legal pass');
assert(js.includes('Draw until you can play'), 'A player must draw while the boneyard has bones');
assert(js.includes('disabled aria-disabled'), 'Blocked hand bones must be natively disabled');
assert(js.includes('role="img"'), 'Board bones must expose an accessible image role');
assert(html.includes('passTurnBtn'), 'Table must include a pass control');
assert(html.includes('Regular Bones Rules'), 'Table must explain the standard rule set');
assert(css.includes('.domino-tile.is-double'), 'Doubles must turn sideways on the table');
assert(css.includes('aspect-ratio:9/15.8'), 'POV scene must use the tall phone-game composition');
assert(css.includes('overflow:auto;grid-template-columns'), 'Long live domino chains must remain scrollable instead of clipping');
assert(css.includes('grid-template-rows:1fr 1fr'), 'Player bones must stand vertically in the foreground');
assert(js.includes('povHudTiles'), 'Opponent HUD must receive the live hand count');

console.log('Domino POV diagnostic passed: perspective scene, readable tiles, multiplayer, and points hooks are intact.');
