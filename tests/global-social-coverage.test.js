/** @jest-environment node */
const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');
test('every public root page reaches the shared Friends loader',()=>{
  const pages=fs.readdirSync(root).filter(name=>name.endsWith('.html'));
  expect(pages.length).toBeGreaterThan(40);
  for(const page of pages){const html=fs.readFileSync(path.join(root,page),'utf8');expect({page,loaded:/<script[^>]+src=["'][^"']*(?:auth-client|global-my-id)\.js(?:[?][^"']*)?["']/i.test(html)}).toEqual({page,loaded:true});}
  for(const entry of ['auth-client.js','global-my-id.js','games/ss-bowling/bowling-effects.js'])expect(fs.readFileSync(path.join(root,entry),'utf8')).toContain("social.src = '/global-social.js?v=1'");
  expect(fs.readFileSync(path.join(root,'scripts/super-strike-overrides/bowling-effects.js'),'utf8')).toBe(fs.readFileSync(path.join(root,'games/ss-bowling/bowling-effects.js'),'utf8'));
});
