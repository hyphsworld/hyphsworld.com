const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const profileSource = fs.readFileSync(path.join(root, 'creator-nitti-bo.js'), 'utf8');
const analyticsSource = fs.readFileSync(path.join(root, 'creator-analytics.js'), 'utf8');

function flush() { return new Promise(resolve => setTimeout(resolve, 0)); }

describe('NITTI BO Creator #006', () => {
  beforeEach(() => {
    document.body.className = 'nitti-world creator-profile';
    document.body.innerHTML = '<button id="followCreator"></button><button id="shareCreator"></button><div id="worldToast"></div><span id="year"></span>';
    delete window.HWAuth;
    delete window.__HYPHSWORLD_CREATOR_ANALYTICS__;
    window.dataLayer = [];
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  });

  test('reports an honest manual-copy fallback when Clipboard is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    window.eval(profileSource);
    document.getElementById('shareCreator').click();
    await flush();
    expect(document.getElementById('worldToast').textContent).toBe('Copy this link: ' + window.location.href);
  });

  test('attributes Creator #006 engagement to NITTI BO', () => {
    window.eval(analyticsSource);
    document.getElementById('followCreator').click();
    const event = window.dataLayer.find(entry => entry[0] === 'event' && entry[1] === 'creator_follow_click');
    expect(event[2].creator_id).toBe('nitti-bo');
  });

  test('ships a complete portrait and keeps featured status separate from verification', () => {
    const html = fs.readFileSync(path.join(root, 'creator-nitti-bo.html'), 'utf8');
    const artwork = fs.readFileSync(path.join(root, 'creator-nitti-bo-hero.jpeg'));
    expect(html).toContain('HYPHSWORLD FEATURED');
    expect(html).not.toContain('profile-verification-badge');
    expect(artwork.subarray(-2)).toEqual(Buffer.from([0xff, 0xd9]));
    expect(artwork.length).toBeGreaterThan(150000);
  });
});
