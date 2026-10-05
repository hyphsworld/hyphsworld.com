/** @jest-environment node */
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, '..', 'creator-profile-live.js'), 'utf8');

async function profile(data, error = null, file = 'creator-young-tez.html') {
  const dom = new JSDOM(`<h1 id="creator-name"><span class="creator-name-text">Original</span><span class="world-verification-badge">VERIFIED</span></h1>
    <div class="creator-hero"><p class="location">City</p><img class="hero-image" src="original.jpg"></div>
    <p class="creator-roles" data-es="Original">Artist</p><p class="hero-story" data-en="Original">Editorial bio</p>`,
    { url: `https://hyphsworld.com/${file}`, runScripts: 'outside-only' });
  const filters = [];
  const query = { eq: (key, value) => { filters.push([key, value]); return query; }, maybeSingle: async () => ({ data, error }) };
  const select = jest.fn(() => query);
  dom.window.HWAuth = { getClient: async () => ({ from: table => { expect(table).toBe('creators'); return { select }; } }) };
  const images = [];
  dom.window.Image = class { set src(value) { images.push(value); if (this.onload) this.onload(); } };
  dom.window.eval(source);
  await new Promise(resolve => setTimeout(resolve, 0));
  return { dom, filters, select, images };
}

test('dashboard-owned public fields render as text while the verified badge remains', async () => {
  const { dom, filters, select, images } = await profile({ display_name: '<img src=x onerror=alert(1)>', headline: 'Artist • Skater', location: 'Chicago', bio: 'My own story', image_url: 'new-cover.jpg' });
  const doc = dom.window.document;
  expect(doc.querySelector('.creator-name-text').textContent).toBe('<img src=x onerror=alert(1)>');
  expect(doc.querySelector('#creator-name img')).toBeNull();
  expect(doc.querySelector('.world-verification-badge').textContent).toBe('VERIFIED');
  expect(doc.querySelector('.hero-story').textContent).toBe('My own story');
  expect(doc.querySelector('.hero-story').hasAttribute('data-en')).toBe(false);
  expect(doc.querySelector('.creator-roles').textContent).toBe('Artist • Skater');
  expect(images).toEqual(['https://hyphsworld.com/new-cover.jpg']);
  expect(filters).toEqual([['slug', 'young-tez'], ['status', 'published']]);
  expect(select).toHaveBeenCalledWith('display_name,headline,location,bio,image_url');
  dom.window.close();
});

test('failed query retains editorial fallback and never loads unsafe artwork', async () => {
  const failed = await profile(null, { message: 'offline' });
  expect(failed.dom.window.document.querySelector('.hero-story').textContent).toBe('Editorial bio');
  failed.dom.window.close();
  const unsafe = await profile({ image_url: 'javascript:alert(1)' });
  expect(unsafe.images).toEqual([]);
  expect(unsafe.dom.window.document.querySelector('.hero-image').getAttribute('src')).toBe('original.jpg');
  unsafe.dom.window.close();
});

test.each(['creator-ykomusic.html', 'creator-kili-631.html'])('new Latin worlds load their own published data: %s', async file => {
  const { dom, filters } = await profile({ bio: 'Creator copy' }, null, file);
  expect(filters[0]).toEqual(['slug', file.replace('creator-', '').replace('.html', '')]);
  dom.window.close();
});
