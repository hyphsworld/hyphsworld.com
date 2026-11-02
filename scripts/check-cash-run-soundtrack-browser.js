// Real game and real MP3 decoding, with auth/points/network services isolated.
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const expected = require('../games/cash-run/assets/soundtrack/manifest.json');
(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {})});
  try {
    for (const viewport of [{width:390,height:664},{width:1280,height:800}]) {
      const context = await browser.newContext({viewport,hasTouch:viewport.width<1000});
      const page = await context.newPage(), errors=[], requested=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/*',route=>{
        const url = new URL(route.request().url());
        if(url.hostname!=='hyphsworld.com')return route.abort();
        if(!url.pathname.startsWith('/games/cash-run/'))return route.fulfill({contentType:'text/javascript',body:''});
        const file=path.resolve(root,url.pathname.slice(1)+(url.pathname.endsWith('/')?'index.html':''));
        if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
        if(file.endsWith('.mp3'))requested.push(path.basename(file));
        const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.mp3':'audio/mpeg'};
        if(file.endsWith('.mp3')) {
          const bytes=fs.readFileSync(file), range=route.request().headers().range?.match(/^bytes=(\d+)-(\d*)$/);
          if(range) {
            const start=Number(range[1]), end=range[2]?Math.min(Number(range[2]),bytes.length-1):bytes.length-1;
            return route.fulfill({status:206,contentType:'audio/mpeg',headers:{'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${bytes.length}`},body:bytes.subarray(start,end+1)});
          }
          return route.fulfill({contentType:'audio/mpeg',headers:{'Accept-Ranges':'bytes'},body:bytes});
        }
        return route.fulfill({contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
      });
      await page.addInitScript(()=>{
        document.addEventListener('DOMContentLoaded',()=>document.documentElement.classList.add('hw-id-ready'));
        localStorage.setItem('cr-muted','0');localStorage.setItem('cr-mode','easy');
        const NativeAudio=window.Audio;
        window.__testAudio=[];
        window.Audio=function(...args){const audio=new NativeAudio(...args);window.__testAudio.push(audio);return audio;};
        window.Audio.prototype=NativeAudio.prototype;
      });
      await page.goto('https://hyphsworld.com/games/cash-run/');
      assert.equal(await page.evaluate(()=>HWCashRunSoundtrack.getStatus().wanted),false,'Menu must not autoplay');
      assert.equal(requested.length,0,'Menu must not preload five songs');
      await page.getByTestId('mode-easy').click();await page.getByTestId('menu-play-btn').click();
      await page.waitForFunction(()=>HWCashRunSoundtrack.getStatus().playing && window.__testAudio.find(a=>a.src.includes('/soundtrack/'))?.currentTime>0);
      await page.getByTestId('game-pause-btn').click();
      await page.waitForFunction(()=>HWCashRunSoundtrack.getStatus().paused && !HWCashRunSoundtrack.getStatus().playing);
      await page.getByTestId('game-pause-btn').click();
      await page.waitForFunction(()=>HWCashRunSoundtrack.getStatus().playing);
      await page.getByTestId('game-mute-btn').click();
      await page.waitForFunction(()=>!HWCashRunSoundtrack.getStatus().wanted && !HWCashRunSoundtrack.getStatus().playing);
      await page.getByTestId('game-mute-btn').click();
      await page.waitForFunction(()=>HWCashRunSoundtrack.getStatus().playing);
      // Leaving the real game calls engine.stop; no music may leak onto the menu.
      await page.evaluate(()=>{location.hash='/';});await page.getByTestId('menu-play-btn').waitFor();
      await page.waitForFunction(()=>!HWCashRunSoundtrack.getStatus().wanted && !HWCashRunSoundtrack.getStatus().playing);
      // Decode all five uploaded files and exercise real ended events, isolated from gameplay.
      await page.evaluate(()=>{HWCashRunSoundtrack.setPaused(false);HWCashRunSoundtrack.start();});
      for(let index=0;index<expected.length;index++) {
        await page.waitForFunction(index=>{
          const audio=window.__testAudio.find(a=>a.src.includes('/soundtrack/'));
          return HWCashRunSoundtrack.getStatus().index===index && !audio.paused && audio.currentTime>0 && Number.isFinite(audio.duration);
        },index);
        const media=await page.evaluate(()=>{const a=window.__testAudio.find(a=>a.src.includes('/soundtrack/'));return {src:a.src,duration:a.duration,error:a.error?.message};});
        assert.ok(media.src.endsWith(expected[index].file));
        assert.ok(Math.abs(media.duration-expected[index].durationSeconds)<1);
        assert.equal(media.error,undefined);
        await page.evaluate(()=>{const a=window.__testAudio.find(a=>a.src.includes('/soundtrack/'));a.currentTime=a.duration-0.12;});
      }
      await page.waitForFunction(()=>HWCashRunSoundtrack.getStatus().index===0 && HWCashRunSoundtrack.getStatus().playing);
      await page.evaluate(()=>HWCashRunSoundtrack.stop());
      assert.equal(await page.evaluate(()=>HWCashRunSoundtrack.getStatus().playing),false);
      assert.equal(new Set(requested).size,5);
      assert.deepEqual(errors,[]);
      console.log('PASS five actual MP3s, ordered loop, menu silence, game start, pause/resume, mute/unmute and game exit',viewport.width,viewport.height);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
