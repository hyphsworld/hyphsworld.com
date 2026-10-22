const fs = require('fs');
const path = require('path');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

describe('music payment launch safety contracts', () => {
  test('public storefront remains disabled until explicit owner launch', () => {
    const store = read('music-store.js');
    expect(store).toMatch(/const PUBLIC_CHECKOUT_APPROVED\s*=\s*false\s*;/);
    expect(store).toContain("if (!PUBLIC_CHECKOUT_APPROVED)");
    expect(store).toContain("release.status !== 'published'");
    expect(store).toContain('/functions/v1/music-live-checkout');
    expect(store).toContain("auth.html?next=music-store.html");
  });

  test('checkout stays in a first-party authenticated flow and redirects only to Stripe', () => {
    const store = read('music-store.js');
    expect(store).toContain('sessionData.session.access_token');
    expect(store).toContain("/^https:\\\/\\\/checkout\\.stripe\\.com\\\//");
    expect(store).toContain('window.location.assign(result.url)');
  });

  test('buyer library requires authentication, paid orders and active licenses', () => {
    const library = read('music-library.js');
    expect(library).toContain(".eq('buyer_id',session.user.id)");
    expect(library).toContain(".eq('status','active')");
    expect(library).toContain(".eq('status','paid')");
    expect(library).toContain(".startsWith('cs_live_')");
    expect(library).toContain(".startsWith('cs_test_')");
    expect(library).toContain("/functions/v1/music-download");
    expect(library).toContain("signed.hostname!=='yuhxtdkhsltaqiagrtys.supabase.co'");
  });

  test('store, library and purchase policy remain discoverable', () => {
    const storePage=read('music-store.html');
    const libraryPage=read('music-library.html');
    expect(storePage).toContain('music-purchase-policy.html');
    expect(libraryPage).toContain('music-store.html');
    expect(libraryPage).toContain('music-library.js');
    expect(read('music-purchase-policy.html')).toContain('Purchases are not yet open to the public.');
  });
});
