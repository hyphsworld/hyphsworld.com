// Isolated synthetic accounts only: no production requests, accounts or messages.
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const http=require('node:http');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
const server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname;
  if(name==='/fixture.html'||name.startsWith('/games/fixture/')){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#101827;color:white;font:16px Arial}main{padding:120px 20px}header{padding:15px;border-bottom:1px solid #465}</style></head><body><header>HYPHSWORLD</header><main><h1>Play. Create. Connect.</h1><p>Friends stay with you across HYPHSWORLD.</p></main><script src="/global-my-id.js"></script></body></html>');return;}
  const file=path.join(root,name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.statusCode=404;res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');res.end(fs.readFileSync(file));
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;const browser=await chromium.launch({headless:true});
  try{
    for(const viewport of [{width:320,height:568},{width:390,height:844},{width:1280,height:800},{width:390,height:844,game:true}]){
      const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/*',route=>{const url=new URL(route.request().url());return url.origin===base?route.continue():route.abort();});
      await page.addInitScript(()=>{
        const friend={user_id:'test-friend',display_name:'A very long public display name',username:'test_friend',relation:'friend',activity:'available',unread:2};
        window.__socialCalls=[];
        window.HWAuth={getSession:async()=>({userId:'test-user'}),getClient:async()=>({
          auth:{onAuthStateChange:()=>({}),getSession:async()=>({data:{session:{user:{id:'test-user'}}}})},
          rpc:async(name,args)=>{window.__socialCalls.push({name,args});return {data:name==='street_empire_social'?(args.p_action==='list'?{username:'test_user',contacts:[friend],blocked:[]}:args.p_action==='messages'?[{id:1,sender:'test-friend',body:'Test message from a friend.',created_at:'2026-10-04T00:00:00Z'}]:{ok:true}):null};}
        })};
      });
      await page.goto(base+(viewport.game?'/games/fixture/index.html':'/fixture.html'));const host=page.locator('#hw-global-social');const launch=host.locator('.launcher');await launch.waitFor();
      await page.waitForFunction(()=>document.querySelector('#hw-global-social').shadowRoot.querySelector('.badge').textContent==='2');
      const controls=await Promise.all([launch.boundingBox(),page.locator('#hw-global-my-id').boundingBox(),page.locator('#hw-global-create').boundingBox()]);
      for(const box of controls)assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width&&box.y+box.height<=viewport.height,'Shared controls fit the viewport');
      for(let i=1;i<controls.length;i++)assert.ok(controls[0].x+controls[0].width<=controls[i].x||controls[i].x+controls[i].width<=controls[0].x||controls[0].y+controls[0].height<=controls[i].y||controls[i].y+controls[i].height<=controls[0].y,'Friends does not overlap CREATE/MY ID');
      await launch.click();await host.locator('dialog[open]').waitFor();await host.getByRole('button',{name:'Message (2)',exact:true}).click();await host.locator('.message').waitFor();
      const box=await host.locator('dialog').boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width+1&&box.y+box.height<=viewport.height+1,'Phone/desktop dialog fits');
      assert.ok(await host.locator('dialog').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'No horizontal dialog overflow');
      await host.getByRole('textbox',{name:'Your message',exact:true}).fill('Browser test');await host.getByRole('button',{name:'Send',exact:true}).click();
      await page.waitForFunction(()=>window.__socialCalls.some(c=>c.args.p_action==='send'&&c.args.p_account==='test-user'&&c.args.p_text==='Browser test'));
      await page.screenshot({path:'/tmp/global-social-'+viewport.width+(viewport.game?'-game':'')+'.png'});await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#hw-global-social').shadowRoot.querySelector('dialog').open);
      assert.ok(await page.evaluate(expected=>window.__socialCalls.some(c=>c.name==='touch_street_empire_presence'&&c.args.p_activity===expected),viewport.game?'playing':'available'));
      assert.deepEqual(errors,[]);await page.close();console.log('PASS global friends browser '+viewport.width+'px: native modal, layout, shared controls, messaging and Escape');
    }
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
