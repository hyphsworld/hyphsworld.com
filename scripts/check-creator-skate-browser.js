'use strict';
// Real page layout/interaction checks with a disconnected public client: no account writes.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const files = ['creators.html', ...fs.readdirSync(root).filter(file => file !== 'creators.html' && /^creator.*\.html$/.test(file))];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  const target = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
  if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', types[path.extname(target)] || 'application/octet-stream');
  fs.createReadStream(target).pipe(res);
});
(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    for (const width of [320, 390, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: width < 700 ? 844 : 900 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) return route.abort();
        if (url.pathname === '/auth-client.js') {
          const yko = route.request().frame().url().includes('/creator-ykomusic.html');
          const body = yko ? `window.HWAuth={getClient:async()=>({from:table=>({select(){return this},eq(){return this},order(){return this},maybeSingle:async()=>({data:{display_name:'YKOMUSIC',headline:'Creator-owned Latin Pop',bio:'My saved creator story'}}),limit:async()=>({data:table==='creator_world_publications'?[{id:'test-drop',title:'Creator browser fixture',media_type:'image',public_path:'fixture',published_at:'2026-10-05T00:00:00Z'}]:[]})}),storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:'/creator-ykomusic.svg'}})})}})};` : 'window.HWAuth={getClient:async()=>null};';
          const tool = /creator-(access|admin|apply|dashboard|drop|login|submit)\.html/.test(route.request().frame().url());
          const toolBody = `const fixtureUser={id:'browser-fixture'};const empty={select(){return this},eq(){return this},in(){return this},order(){return this},limit(){return this},maybeSingle:async()=>({data:null,error:null}),then(resolve){return Promise.resolve({data:[],error:null}).then(resolve)}};window.HWAuth={getCurrentUser:async()=>({userId:fixtureUser.id}),getClient:async()=>({auth:{getUser:async()=>({data:{user:${route.request().frame().url().includes('creator-login.html') ? 'null' : 'fixtureUser'}}}),getSession:async()=>({data:{session:null}})},from:()=>({...empty}),rpc:async()=>({data:false,error:null})})};`;
          return route.fulfill({ contentType: 'text/javascript', body: tool ? toolBody : body });
        }
        if (['/global-points-engine.js', '/creator-analytics.js'].includes(url.pathname)) return route.fulfill({ contentType: 'text/javascript', body: '' });
        // Avoid downloading music/video fixtures during a layout check.
        if (/\.(mp3|mp4|m4a)$/.test(url.pathname)) return route.fulfill({ status: 204, body: '' });
        return route.continue();
      });
      for (const file of files) {
        errors.length = 0;
        console.log(`Checking ${file} @${width}`);
        await page.goto(`${origin}/${file}`, { waitUntil: 'load' });
        const overflow = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: innerWidth, overflowing: Array.from(document.querySelectorAll('main *')).filter(el => { const r = el.getBoundingClientRect(); return r.width && r.right > innerWidth + 2 && getComputedStyle(el).position !== 'absolute'; }).slice(0,6).map(el => el.className) }));
        assert(overflow.document <= width + 2, `${file} @${width} overflows: ${JSON.stringify(overflow)}`);
        if (file === 'creators.html') {
          if (await page.locator('body.creator-universe').count()) assert.equal(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(8, 10, 12)', 'Shared site skin must retain the urban palette');
          assert(await page.locator('.house-art img').evaluate(img => img.complete && img.naturalWidth > 0), 'House artwork loaded');
          await page.locator('[data-world-tab="creations"]').click();
          assert(await page.locator('#creations').isVisible(), 'Fresh drops panel opens');
          await page.locator('[data-house-discover]').click();
          assert(await page.locator('#directory').isVisible(), 'Hero CTA returns to discovery');
          await page.locator('#creatorSearch').fill('young tez');
          assert.equal(await page.locator('.creator-card:visible').count(), 1, 'Search still filters creators');
          await page.locator('#creatorSearch').fill('');
          await page.locator('[data-world-tab="discover"]').focus();
          await page.keyboard.press('ArrowRight');
          assert.equal(await page.locator('[data-world-tab="creations"]').getAttribute('aria-selected'), 'true', 'Keyboard tabs work');
          await page.locator('[data-world-tab="discover"]').click();
        } else if (await page.locator('body.creator-profile').count()) {
          assert.equal(await page.locator('script[src^="auth-client.js"]').count(), 1, `${file}: profile data client loaded`);
          assert.equal(await page.locator('script[src^="creator-published-media.js"]').count(), 1, `${file}: approved creations loader present`);
          assert(await page.locator('.creator-hero h1').isVisible(), `${file} @${width}: Creator identity visible`);
          assert.equal(await page.locator('.profile-section-nav a[href="creator-dashboard.html#profile"]').count(), 1, 'Creator management retained');
          assert(await page.locator('.hero-actions .primary-action').isVisible(), `${file}: Primary profile action retained`);
          if (await page.locator('.track').count()) {
            await page.locator('.track').first().click();
            assert(await page.locator('.track').first().evaluate(el => el.classList.contains('is-active')), 'Track action retained');
          }
          if (file === 'creator-ykomusic.html') {
            await page.locator('#world-releases').waitFor();
            assert.equal(await page.locator('.creator-roles').textContent(), 'Creator-owned Latin Pop', 'YKOMUSIC saved headline renders through its real page bootstrap');
            assert.equal(await page.locator('#world-releases .world-publication-title').textContent(), 'Creator browser fixture', 'YKOMUSIC approved drop renders');
          }
          if (await page.locator('#creatorLanguage').count()) {
            await page.locator('#creatorLanguage').selectOption('en');
            await page.locator('#creatorLanguage').selectOption('es');
          }
        }
        if (await page.locator('body.creator-universe').count()) {
          const mural = await page.locator('body').evaluate(el => {
            const style = getComputedStyle(el, '::before');
            return { image: style.backgroundImage, position: style.position, pointerEvents: style.pointerEvents };
          });
          assert(mural.image.includes('urban-culture'), `${file}: Full-page skater mural is present`);
          assert.equal(mural.position, 'fixed', 'Mural covers the viewport while scrolling');
          assert.equal(mural.pointerEvents, 'none', 'Mural cannot block controls');
        }
        // Tools retain their real IDs and scripts; anonymous pages must remain usable.
        if (await page.locator('body.urban-tools').count()) {
          assert(await page.locator('header > a').isVisible(), `${file}: Creator navigation remains visible`);
          assert(await page.locator('.urban-world-banner').isVisible(), `${file}: Urban cover is present`);
          assert(await page.locator('main').isVisible(), `${file}: Tool content is present`);
          if (file === 'creator-login.html') assert(await page.locator('input[type=email]').isVisible(), 'Login remains usable');
          // Layout fixture exposes existing owner forms without signing in or writing data.
          if (['creator-dashboard.html','creator-apply.html','creator-submit.html','creator-admin.html'].includes(file)) {
            await page.evaluate(() => document.querySelectorAll('main .panel,main .start-panel').forEach(el => el.removeAttribute('hidden')));
            const formWidth = await page.evaluate(() => document.documentElement.scrollWidth);
            assert(formWidth <= width + 2, `${file}: Owner form fixture fits @${width}`);
          }
        }
        assert(await page.locator('link[href^="creator-urban.css"]').count(), `${file}: Shared visual shell loaded`);
        assert.deepEqual(errors, [], `${file} should not throw script errors`);
        if (['creators.html', 'creators-world.html', 'creator-dashboard.html', 'creator-login.html'].includes(file) && width !== 320) {
          await page.goto(`${origin}/${file}`, { waitUntil: 'load' });
          await page.evaluate(() => document.fonts.ready);
          if (file === 'creator-dashboard.html') await page.evaluate(() => document.querySelectorAll('main .panel,main .start-panel').forEach(el => el.removeAttribute('hidden')));
          await page.screenshot({ path: `/tmp/creator-skate-${file.replace('.html','')}-${width}.png`, animations: 'disabled' });
        }
      }
      await page.close();
    }
    console.log(`Creator urban culture browser checks passed: ${files.length} pages at 320, 390 and 1280px; discovery, keyboard tabs, profile actions and management links.`);
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
