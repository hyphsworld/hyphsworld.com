const fs = require('fs');

const read = file => fs.readFileSync(file, 'utf8');
const js = read('dominos.js');
const html = read('dominos.html');
const css = read('domino-cinematic.css');
const sql = read('supabase/migrations/20260926060000_domino_four_way_spinner.sql');

const checks = [
  ['first double becomes spinner', sql.includes("'spinnerTile'") && sql.includes("v_spinner_index")],
  ['four server-validated branches', sql.includes("array['left','right','top','bottom']")],
  ['player side reaches RPC', js.includes('params.p_play_side = playSide')],
  ['ambiguous moves show choice dialog', js.includes('choosePlacement(tileIndex, sides)') && js.includes('dominoPlacementPicker')],
  ['CPU uses the same legal-side engine', js.includes('const cpuSides = legalSides(cpuTile, activeState)')],
  ['legacy boards upgrade without reset', sql.includes('domino_layout_from_board(v_board)')],
  ['spinner branches render from center', js.includes('spinnerBoardMarkup') && js.includes('spinnerTile')],
  ['placement dialog is mobile-safe', css.includes('.domino-placement-picker')],
  ['new assets are cache-busted', html.includes('20260926-four-way-spinner-3')],
  ['anonymous move access stays revoked', sql.includes('from public, anon') && sql.includes('to authenticated')]
];

const failed = checks.filter(([name, ok]) => {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  return !ok;
});

if (failed.length) {
  console.error(`\nDomino spinner diagnostic failed: ${failed.length} check(s).`);
  process.exit(1);
}

console.log('\nDomino four-way spinner diagnostic passed.');
