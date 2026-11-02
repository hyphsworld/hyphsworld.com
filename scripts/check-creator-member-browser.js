'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname,'..');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6UsAAAAASUVORK5CYII=','base64');
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://local').pathname;
 if(pathname==='/fixture.png'){res.setHeader('Content-Type','image/png');res.end(png);return;}
 const file=path.resolve(root,'.'+decodeURIComponent(pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf'})[path.extname(file)]||'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const width of [320,390,1280]){
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   let offset=0,failed=false,patches=0,posts=0;
   const fixture=`window.HW_SUPABASE_CONFIG={url:'https://fixture.supabase.co',anonKey:'public-fixture'};
    const fixtureUser={id:'10000000-0000-4000-8000-000000000001',app_metadata:{}};
    let fixturePost=null;window.fixturePublished=false;
    const storage={list:async()=>({data:[]}),createSignedUrl:async()=>({data:{signedUrl:'${origin}/fixture.png'}}),remove:async()=>({data:[],error:null})};
    window.HWAuth={getClient:async()=>({auth:{getUser:async()=>({data:{user:fixtureUser}}),getSession:async()=>({data:{session:{user:fixtureUser,access_token:'fixture-user-token'}}}),onAuthStateChange:()=>{}},storage:{from:()=>storage},rpc:async(name,args)=>{
     if(name==='member_feed')return {data:window.fixturePublished?[{id:fixturePost.id,owner_id:fixtureUser.id,author_name:'Test member',caption:'Browser upload check',mime_type:'image/png',storage_path:fixturePost.storage_path,published_at:new Date().toISOString()}]:[]};
     if(name==='member_reserve_post'){fixturePost={id:args.p_id,status:'uploading',storage_path:fixtureUser.id+'/'+args.p_id+'/media.png'};return {data:fixturePost};}
     if(name==='member_publish_post'){await fetch('${origin}/fixture-published',{method:'POST'});window.fixturePublished=true;return {data:{status:'published'}};}
     return {data:null};
    }})};`;
   await page.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.hostname==='fixture.storage.supabase.co'){
     const headers={'access-control-allow-origin':origin,'access-control-allow-methods':'POST,PATCH,HEAD,OPTIONS,DELETE','access-control-allow-headers':'authorization,apikey,content-type,upload-length,upload-offset,upload-metadata,tus-resumable,x-http-method-override','access-control-expose-headers':'location,upload-offset,upload-length,tus-resumable','tus-resumable':'1.0.0'};
     if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
     assert.equal(request.headers().authorization,'Bearer fixture-user-token');
     if(request.method()==='POST'){
      offset=request.postDataBuffer()?.length||0;
      assert.equal(Number(request.headers()['upload-length']),7*1024*1024);
      assert(offset<=6*1024*1024);
      return route.fulfill({status:201,headers:{...headers,location:'https://fixture.storage.supabase.co/storage/v1/upload/resumable/test-upload','upload-offset':String(offset)}});
     }
     if(request.method()==='HEAD')return route.fulfill({status:200,headers:{...headers,'upload-offset':String(offset),'upload-length':String(7*1024*1024)}});
     if(request.method()==='PATCH'){
      patches++;
      if(!failed){failed=true;return route.fulfill({status:503,headers,body:'Simulated connection failure'});}
      assert.equal(Number(request.headers()['upload-offset']),offset);
      offset+=request.postDataBuffer()?.length||0;
      return route.fulfill({status:204,headers:{...headers,'upload-offset':String(offset)}});
     }
     throw new Error('Unexpected upload request '+request.method());
    }
    if(url.origin!==origin)return route.abort();
    if(url.pathname==='/fixture-published'){
     assert.equal(offset,7*1024*1024,'Post must wait for the complete file');posts++;return route.fulfill({status:200,body:'ok'});
    }
    if(url.pathname==='/auth-client.js')return route.fulfill({contentType:'text/javascript',body:fixture});
    if(url.pathname.endsWith('.js')&&!['/creator-member-feed.js','/vendor/tus-4.3.1.min.js'].includes(url.pathname))return route.fulfill({contentType:'text/javascript',body:''});
    return route.continue();
   });
   await page.goto(origin+'/creators.html#community');
   await page.locator('#memberPostForm').waitFor({state:'visible'});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,'Phone page must not overflow');
   const buffer=Buffer.alloc(7*1024*1024);png.copy(buffer);
   await page.locator('#memberFile').setInputFiles({name:'browser-photo.png',mimeType:'image/png',buffer});
   await page.locator('#memberCaption').fill('Browser upload check');
   await page.locator('#community').screenshot({path:'/tmp/creator-member-composer-'+width+'.png'});
   await page.locator('#memberPost').click();
   try { await page.waitForFunction(()=>document.getElementById('memberPostStatus').textContent.startsWith('Posted!'),{},{timeout:45000}); }
   catch(error) { throw new Error(error.message+'; status: '+await page.locator('#memberPostStatus').textContent()+'; requests: '+JSON.stringify({offset,patches,posts,errors})); }
   assert.equal(posts,1);assert(patches>=2,'Large upload must retry after the simulated failure');
   await page.locator('#memberFeed article').waitFor();
   assert.equal(await page.locator('#memberFeed img').evaluate(image=>image.complete&&image.naturalWidth>0),true,'Published photo is visible');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
   await page.locator('#community').screenshot({path:'/tmp/creator-member-posted-'+width+'.png'});
   assert.deepEqual(errors,[]);
   console.log('Creator member browser @'+width+': preview, 7 MB resumable upload, failed-chunk retry, single post, image playback, no overflow.');
   await page.close();
  }
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
