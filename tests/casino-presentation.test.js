const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

describe('casino presentation layer', () => {
  const html = fs.readFileSync(path.join(root, 'casino.html'), 'utf8');
  const codes = fs.readFileSync(path.join(root, 'casino-codes.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'casino-cinematic.css'), 'utf8');

  test('loads isolated cinematic and code assets', () => {
    expect(html).toContain('casino-cinematic.css?v=casino-cinematic-20260910');
    expect(html).toContain('casino-codes.js?v=casino-visual-codes-20260910');
    expect(html).toContain('id="casinoCodeButton"');
  });

  test('codes remain cosmetic and never reference points or authentication', () => {
    expect(codes).toContain('Cosmetic only');
    expect(codes).not.toMatch(/award_points|cool-points|supabase|auth-client|balance|casino\.bet/i);
  });

  test('supports reduced motion', () => {
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
  });
});
